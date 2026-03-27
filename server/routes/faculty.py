from datetime import date, datetime

from flask import Blueprint, jsonify, request

from auth import role_required, token_required
from models import (
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

    return jsonify({
        'subjects': len(subject_codes),
        'sections': len(section_ids),
        'total_students': total_students,
        'today_attendance': today_attendance,
        'allocations': len(allocations),
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
