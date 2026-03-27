from datetime import date, datetime
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from auth import role_required, token_required
from models import (
    Assignment,
    AssignmentSubmission,
    AttendanceRecord,
    AttendanceSession,
    Faculty,
    FacultyBatchSection,
    Mark,
    Section,
    Semester,
    Student,
    Subject,
    User,
    db,
)

faculty_bp = Blueprint('faculty', __name__, url_prefix='/api/faculty')


def get_faculty_profile(current_user):
    return Faculty.query.filter_by(user_id=current_user.user_id).first()


def build_upload_url(path_value):
    if not path_value:
        return None
    normalized_path = path_value.replace('\\', '/')
    return f"/api/uploads/{normalized_path}"


def save_uploaded_file(file_storage, folder_name):
    if not file_storage or not file_storage.filename:
        return None, None

    uploads_dir = Path(current_app.root_path) / 'uploads' / folder_name
    uploads_dir.mkdir(parents=True, exist_ok=True)
    original_name = secure_filename(file_storage.filename)
    stored_name = f"{uuid4().hex}_{original_name}"
    relative_path = Path(folder_name) / stored_name
    file_storage.save(uploads_dir / stored_name)
    return str(relative_path).replace('\\', '/'), original_name


def get_allocation_context(current_user, section_id=None, subject_code=None):
    faculty = get_faculty_profile(current_user)
    if not faculty:
        return None, None

    query = FacultyBatchSection.query.filter_by(faculty_id=faculty.faculty_id)
    if section_id is not None:
        query = query.filter_by(section_id=section_id)
    if subject_code is not None:
        query = query.filter_by(subject_code=subject_code)
    return faculty, query


@faculty_bp.route('/allocations', methods=['GET'])
@token_required
@role_required('FACULTY')
def get_my_allocations(current_user):
    faculty = get_faculty_profile(current_user)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404

    allocations = (
        FacultyBatchSection.query
        .filter_by(faculty_id=faculty.faculty_id)
        .order_by(FacultyBatchSection.section_id.asc(), FacultyBatchSection.subject_code.asc())
        .all()
    )

    result = []
    for allocation in allocations:
        section = db.session.get(Section, allocation.section_id)
        subject = db.session.get(Subject, allocation.subject_code)
        result.append({
            'faculty_id': allocation.faculty_id,
            'batch_id': allocation.batch_id,
            'section_id': allocation.section_id,
            'section_name': section.section_name if section else None,
            'current_semester': section.current_semester if section else None,
            'subject_code': allocation.subject_code,
            'subject_id': allocation.subject_code,
            'subject_name': subject.subject_name if subject else allocation.subject_code,
        })
    return jsonify(result)


@faculty_bp.route('/stats', methods=['GET'])
@token_required
@role_required('FACULTY')
def get_stats(current_user):
    faculty = get_faculty_profile(current_user)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404

    allocations = FacultyBatchSection.query.filter_by(faculty_id=faculty.faculty_id).all()
    section_ids = sorted({allocation.section_id for allocation in allocations})
    subject_codes = sorted({allocation.subject_code for allocation in allocations})
    total_students = Student.query.filter(Student.section_id.in_(section_ids)).count() if section_ids else 0
    today_session_ids = [
        session.session_id
        for session in AttendanceSession.query.filter_by(faculty_id=faculty.faculty_id, date=date.today()).all()
    ]
    today_attendance = AttendanceRecord.query.filter(AttendanceRecord.session_id.in_(today_session_ids)).count() if today_session_ids else 0
    assignments_count = Assignment.query.filter_by(faculty_id=faculty.faculty_id).count()
    submissions_count = (
        AssignmentSubmission.query
        .join(Assignment, Assignment.assignment_id == AssignmentSubmission.assignment_id)
        .filter(Assignment.faculty_id == faculty.faculty_id)
        .count()
    )

    return jsonify({
        'subjects': len(subject_codes),
        'sections': len(section_ids),
        'total_students': total_students,
        'today_attendance': today_attendance,
        'allocations': len(allocations),
        'assignments': assignments_count,
        'submissions': submissions_count,
    })


@faculty_bp.route('/students/<int:section_id>', methods=['GET'])
@token_required
@role_required('FACULTY')
def get_students(current_user, section_id):
    faculty, query = get_allocation_context(current_user, section_id=section_id)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404
    if not query.first():
        return jsonify({'error': 'Not allocated to this section'}), 403

    students = Student.query.filter_by(section_id=section_id).order_by(Student.roll_no.asc()).all()
    result = []
    for student in students:
        user = db.session.get(User, student.student_id)
        result.append({
            'id': student.student_id,
            'student_id': student.student_id,
            'roll_no': student.roll_no,
            'enrollment_no': student.roll_no,
            'name': user.name if user else student.roll_no,
            'email': student.email,
        })
    return jsonify(result)


@faculty_bp.route('/attendance', methods=['POST'])
@token_required
@role_required('FACULTY')
def mark_attendance(current_user):
    data = request.get_json()
    required = ['subject_code', 'section_id', 'date', 'records']
    if not data or not all(data.get(field) for field in required):
        return jsonify({'error': 'subject_code, section_id, date, and records are required'}), 400

    faculty, query = get_allocation_context(current_user, section_id=data['section_id'], subject_code=data['subject_code'])
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404

    allocation = query.first()
    if not allocation:
        return jsonify({'error': 'Not allocated to this section/subject'}), 403

    session_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    section = db.session.get(Section, allocation.section_id)
    semester = Semester.query.filter_by(batch_id=allocation.batch_id, is_active=True).first()
    if not semester:
        semester = Semester.query.filter_by(batch_id=allocation.batch_id, semester_no=section.current_semester).first()
    if not semester:
        semester = Semester(batch_id=allocation.batch_id, semester_no=section.current_semester, is_active=True)
        db.session.add(semester)
        db.session.flush()

    session = AttendanceSession.query.filter_by(
        semester_id=semester.semester_id,
        batch_id=allocation.batch_id,
        section_id=allocation.section_id,
        faculty_id=faculty.faculty_id,
        date=session_date,
        subject_code=allocation.subject_code,
    ).first()
    if not session:
        session = AttendanceSession(
            semester_id=semester.semester_id,
            batch_id=allocation.batch_id,
            section_id=allocation.section_id,
            faculty_id=faculty.faculty_id,
            date=session_date,
            subject_code=allocation.subject_code,
        )
        db.session.add(session)
        db.session.flush()

    saved = 0
    for record in data['records']:
        student_id = record['student_id']
        status = 'P' if (record.get('status') or 'present').lower().startswith('p') else 'A'
        existing = AttendanceRecord.query.filter_by(session_id=session.session_id, student_id=student_id).first()
        if existing:
            existing.status = status
        else:
            db.session.add(AttendanceRecord(session_id=session.session_id, student_id=student_id, status=status))
        saved += 1

    db.session.commit()
    return jsonify({'message': f'Attendance saved for {saved} students', 'count': saved})

@faculty_bp.route('/attendance', methods=['GET'])
@token_required
@role_required('FACULTY')
def get_attendance(current_user):
    subject_code = request.args.get('subject_code') or request.args.get('subject_id')
    section_id = request.args.get('section_id', type=int)
    att_date = request.args.get('date')

    faculty = get_faculty_profile(current_user)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404

    query = AttendanceSession.query.filter_by(faculty_id=faculty.faculty_id)
    if subject_code:
        query = query.filter_by(subject_code=subject_code)
    if section_id:
        query = query.filter_by(section_id=section_id)
    if att_date:
        query = query.filter_by(date=datetime.strptime(att_date, '%Y-%m-%d').date())

    sessions = query.all()
    session_ids = [session.session_id for session in sessions]
    if not session_ids:
        return jsonify([])

    session_map = {session.session_id: session for session in sessions}
    records = AttendanceRecord.query.filter(AttendanceRecord.session_id.in_(session_ids)).all()
    result = []
    for record in records:
        session = session_map.get(record.session_id)
        if not session:
            continue
        result.append({
            'session_id': record.session_id,
            'student_id': record.student_id,
            'subject_code': session.subject_code,
            'section_id': session.section_id,
            'date': session.date.isoformat(),
            'status': 'present' if record.status == 'P' else 'absent',
        })
    return jsonify(result)


@faculty_bp.route('/attendance/report', methods=['GET'])
@token_required
@role_required('FACULTY')
def attendance_report(current_user):
    subject_code = request.args.get('subject_code') or request.args.get('subject_id')
    section_id = request.args.get('section_id', type=int)
    if not subject_code or not section_id:
        return jsonify({'error': 'subject_code and section_id are required'}), 400

    faculty, query = get_allocation_context(current_user, section_id=section_id, subject_code=subject_code)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404
    if not query.first():
        return jsonify({'error': 'Not allocated to this section/subject'}), 403

    students = Student.query.filter_by(section_id=section_id).order_by(Student.roll_no.asc()).all()
    sessions = AttendanceSession.query.filter_by(section_id=section_id, subject_code=subject_code).all()
    session_ids = [session.session_id for session in sessions]
    records = AttendanceRecord.query.filter(AttendanceRecord.session_id.in_(session_ids)).all() if session_ids else []

    records_by_student = {}
    for record in records:
        records_by_student.setdefault(record.student_id, []).append(record)

    report = []
    for student in students:
        user = db.session.get(User, student.student_id)
        student_records = records_by_student.get(student.student_id, [])
        total = len(student_records)
        present = sum(1 for record in student_records if record.status == 'P')
        absent = total - present
        percentage = round((present / total) * 100, 1) if total else 0
        report.append({
            'student_id': student.student_id,
            'student_name': user.name if user else student.roll_no,
            'roll_no': student.roll_no,
            'enrollment_no': student.roll_no,
            'total_classes': total,
            'present': present,
            'late': 0,
            'absent': absent,
            'percentage': percentage,
        })
    return jsonify(report)


@faculty_bp.route('/marks', methods=['POST'])
@token_required
@role_required('FACULTY')
def enter_marks(current_user):
    data = request.get_json()
    required = ['subject_code', 'section_id', 'exam_type', 'max_marks', 'records']
    if not data or not all(data.get(field) for field in required):
        return jsonify({'error': 'subject_code, section_id, exam_type, max_marks, and records are required'}), 400

    faculty, query = get_allocation_context(current_user, section_id=data['section_id'], subject_code=data['subject_code'])
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404
    if not query.first():
        return jsonify({'error': 'Not allocated to this section/subject'}), 403

    saved = 0
    for record in data['records']:
        existing = Mark.query.filter_by(
            student_id=record['student_id'],
            subject_code=data['subject_code'],
            exam_type=data['exam_type'],
        ).first()
        obtained_marks = float(record.get('obtained_marks') or 0)
        remarks = record.get('remarks') or ''
        if existing:
            existing.obtained_marks = obtained_marks
            existing.max_marks = float(data['max_marks'])
            existing.remarks = remarks
        else:
            db.session.add(Mark(
                student_id=record['student_id'],
                subject_code=data['subject_code'],
                exam_type=data['exam_type'],
                max_marks=float(data['max_marks']),
                obtained_marks=obtained_marks,
                remarks=remarks,
            ))
        saved += 1

    db.session.commit()
    return jsonify({'message': f'Marks saved for {saved} students', 'count': saved})


@faculty_bp.route('/marks', methods=['GET'])
@token_required
@role_required('FACULTY')
def get_marks(current_user):
    subject_code = request.args.get('subject_code') or request.args.get('subject_id')
    section_id = request.args.get('section_id', type=int)
    exam_type = request.args.get('exam_type')
    if not subject_code:
        return jsonify({'error': 'subject_code is required'}), 400

    faculty, query = get_allocation_context(current_user, section_id=section_id, subject_code=subject_code)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404
    if not query.first():
        return jsonify({'error': 'Not allocated to this section/subject'}), 403

    marks_query = Mark.query.filter_by(subject_code=subject_code)
    if exam_type:
        marks_query = marks_query.filter_by(exam_type=exam_type)
    if section_id:
        student_ids = [student.student_id for student in Student.query.filter_by(section_id=section_id).all()]
        marks_query = marks_query.filter(Mark.student_id.in_(student_ids))

    return jsonify([mark.to_dict() for mark in marks_query.all()])


@faculty_bp.route('/marks/report', methods=['GET'])
@token_required
@role_required('FACULTY')
def marks_report(current_user):
    subject_code = request.args.get('subject_code') or request.args.get('subject_id')
    section_id = request.args.get('section_id', type=int)
    if not subject_code or not section_id:
        return jsonify({'error': 'subject_code and section_id are required'}), 400

    faculty, query = get_allocation_context(current_user, section_id=section_id, subject_code=subject_code)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404
    if not query.first():
        return jsonify({'error': 'Not allocated to this section/subject'}), 403

    students = Student.query.filter_by(section_id=section_id).order_by(Student.roll_no.asc()).all()
    student_ids = [student.student_id for student in students]
    marks = Mark.query.filter(Mark.subject_code == subject_code, Mark.student_id.in_(student_ids)).all() if student_ids else []

    marks_by_student = {}
    for mark in marks:
        marks_by_student.setdefault(mark.student_id, []).append(mark)

    report = []
    for student in students:
        user = db.session.get(User, student.student_id)
        student_marks = marks_by_student.get(student.student_id, [])
        marks_data = {}
        total_obtained = 0
        total_max = 0
        for mark in student_marks:
            percentage = round((mark.obtained_marks / mark.max_marks) * 100, 1) if mark.max_marks else 0
            marks_data[mark.exam_type] = {
                'obtained': mark.obtained_marks,
                'max': mark.max_marks,
                'percentage': percentage,
                'remarks': mark.remarks,
            }
            total_obtained += mark.obtained_marks
            total_max += mark.max_marks

        report.append({
            'student_id': student.student_id,
            'student_name': user.name if user else student.roll_no,
            'roll_no': student.roll_no,
            'enrollment_no': student.roll_no,
            'marks': marks_data,
            'total_obtained': total_obtained,
            'total_max': total_max,
            'overall_percentage': round((total_obtained / total_max) * 100, 1) if total_max else 0,
        })
    return jsonify(report)


@faculty_bp.route('/assignments', methods=['GET'])
@token_required
@role_required('FACULTY')
def get_assignments(current_user):
    faculty = get_faculty_profile(current_user)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404

    assignments = Assignment.query.filter_by(faculty_id=faculty.faculty_id).order_by(Assignment.created_at.desc()).all()
    result = []
    for assignment in assignments:
        section = db.session.get(Section, assignment.section_id)
        subject = db.session.get(Subject, assignment.subject_code)
        submissions_count = AssignmentSubmission.query.filter_by(assignment_id=assignment.assignment_id).count()
        total_students = Student.query.filter_by(section_id=assignment.section_id).count()
        result.append({
            **assignment.to_dict(),
            'section_name': section.section_name if section else None,
            'subject_name': subject.subject_name if subject else assignment.subject_code,
            'attachment_url': build_upload_url(assignment.attachment_path),
            'submissions_count': submissions_count,
            'total_students': total_students,
        })
    return jsonify(result)


@faculty_bp.route('/assignments', methods=['POST'])
@token_required
@role_required('FACULTY')
def create_assignment(current_user):
    faculty = get_faculty_profile(current_user)
    if not faculty:
        return jsonify({'error': 'Faculty not found'}), 404

    title = (request.form.get('title') or '').strip()
    description = (request.form.get('description') or '').strip()
    subject_code = (request.form.get('subject_code') or '').strip()
    section_id = request.form.get('section_id', type=int)
    due_date_value = request.form.get('due_date')
    marks_slot = (request.form.get('marks_slot') or '').strip() or None
    max_marks = request.form.get('max_marks', type=float)
    if not title or not subject_code or not section_id:
        return jsonify({'error': 'title, subject_code, and section_id are required'}), 400

    _, query = get_allocation_context(current_user, section_id=section_id, subject_code=subject_code)
    allocation = query.first()
    if not allocation:
        return jsonify({'error': 'Not allocated to this section/subject'}), 403

    due_date = datetime.strptime(due_date_value, '%Y-%m-%d').date() if due_date_value else None
    attachment_path, attachment_name = save_uploaded_file(request.files.get('attachment'), 'assignments')

    assignment = Assignment(
        title=title,
        description=description,
        subject_code=subject_code,
        batch_id=allocation.batch_id,
        section_id=section_id,
        faculty_id=faculty.faculty_id,
        due_date=due_date,
        marks_slot=marks_slot,
        max_marks=max_marks if max_marks is not None else None,
        attachment_name=attachment_name,
        attachment_path=attachment_path,
    )
    db.session.add(assignment)
    db.session.commit()

    return jsonify({
        **assignment.to_dict(),
        'attachment_url': build_upload_url(assignment.attachment_path),
    }), 201


@faculty_bp.route('/assignments/<int:assignment_id>/submissions', methods=['GET'])
@token_required
@role_required('FACULTY')
def get_assignment_submissions(current_user, assignment_id):
    faculty = get_faculty_profile(current_user)
    assignment = db.session.get(Assignment, assignment_id)
    if not faculty or not assignment or assignment.faculty_id != faculty.faculty_id:
        return jsonify({'error': 'Assignment not found'}), 404

    students = Student.query.filter_by(section_id=assignment.section_id).order_by(Student.roll_no.asc()).all()
    submissions = AssignmentSubmission.query.filter_by(assignment_id=assignment.assignment_id).all()
    submissions_by_student = {submission.student_id: submission for submission in submissions}

    result = []
    for student in students:
        user = db.session.get(User, student.student_id)
        submission = submissions_by_student.get(student.student_id)
        result.append({
            'student_id': student.student_id,
            'student_name': user.name if user else student.roll_no,
            'roll_no': student.roll_no,
            'submitted': submission is not None,
            'submission_id': submission.submission_id if submission else None,
            'submitted_at': submission.submitted_at.isoformat() if submission and submission.submitted_at else None,
            'file_name': submission.file_name if submission else None,
            'file_url': build_upload_url(submission.file_path) if submission else None,
            'marks_awarded': submission.marks_awarded if submission else None,
            'feedback': submission.feedback if submission else '',
        })
    return jsonify(result)


@faculty_bp.route('/assignments/<int:assignment_id>/submissions/<int:student_id>/grade', methods=['POST'])
@token_required
@role_required('FACULTY')
def grade_assignment_submission(current_user, assignment_id, student_id):
    faculty = get_faculty_profile(current_user)
    assignment = db.session.get(Assignment, assignment_id)
    if not faculty or not assignment or assignment.faculty_id != faculty.faculty_id:
        return jsonify({'error': 'Assignment not found'}), 404

    submission = AssignmentSubmission.query.filter_by(assignment_id=assignment_id, student_id=student_id).first()
    if not submission:
        return jsonify({'error': 'Submission not found'}), 404

    data = request.get_json() or {}
    submission.marks_awarded = data.get('marks_awarded', submission.marks_awarded)
    submission.feedback = data.get('feedback', submission.feedback)

    if assignment.marks_slot and assignment.max_marks and submission.marks_awarded is not None:
        mark = Mark.query.filter_by(
            student_id=student_id,
            subject_code=assignment.subject_code,
            exam_type=assignment.marks_slot,
        ).first()
        if not mark:
            mark = Mark(
                student_id=student_id,
                subject_code=assignment.subject_code,
                exam_type=assignment.marks_slot,
                max_marks=assignment.max_marks,
                obtained_marks=float(submission.marks_awarded),
                remarks=submission.feedback or f'Graded from assignment {assignment.title}',
            )
            db.session.add(mark)
        else:
            mark.max_marks = assignment.max_marks
            mark.obtained_marks = float(submission.marks_awarded)
            mark.remarks = submission.feedback or mark.remarks

    db.session.commit()
    return jsonify({'message': 'Submission graded successfully'})
