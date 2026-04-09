from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from auth import role_required, token_required
from models import Assignment, AssignmentSubmission, AttendanceRecord, AttendanceSession, Mark, Section, Student, Subject, db

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


def get_student_profile(current_user):
    student = Student.query.filter_by(student_id=current_user.user_id).first()
    if not student:
        student = Student.query.filter_by(email=current_user.email).first()
    return student


def get_student_section(student):
    return db.session.get(Section, student.section_id) if student else None


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


@student_bp.route('/stats', methods=['GET'])
@token_required
@role_required('STUDENT')
def get_stats(current_user):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    section = get_student_section(student)
    current_semester = section.current_semester if section else None

    total_classes = AttendanceRecord.query.filter_by(student_id=student.student_id).count()
    present_count = AttendanceRecord.query.filter_by(student_id=student.student_id, status='P').count()
    attendance_pct = round((present_count / total_classes) * 100, 1) if total_classes > 0 else 0
    subject_query = Subject.query.filter_by(dept_id=student.dept_id)
    if current_semester is not None:
        subject_query = subject_query.filter_by(semester=current_semester)
    subject_count = subject_query.count()
    marks = Mark.query.filter_by(student_id=student.student_id).all()
    total_obtained = sum(mark.obtained_marks for mark in marks)
    total_max = sum(mark.max_marks for mark in marks)
    avg_marks = round((total_obtained / total_max) * 100, 1) if total_max > 0 else 0
    total_assignments = Assignment.query.filter_by(section_id=student.section_id).count()
    submitted_assignments = AssignmentSubmission.query.filter_by(student_id=student.student_id).count()

    return jsonify({
        'subjects': subject_count,
        'total_classes': total_classes,
        'present': present_count,
        'attendance_percentage': attendance_pct,
        'avg_marks': avg_marks,
        'total_exams': len(marks),
        'total_assignments': total_assignments,
        'submitted_assignments': submitted_assignments,
        'current_semester': current_semester,
    })


@student_bp.route('/attendance', methods=['GET'])
@token_required
@role_required('STUDENT')
def get_attendance(current_user):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    subject_code = request.args.get('subject_code')
    records = AttendanceRecord.query.filter_by(student_id=student.student_id).all()
    result = []

    for record in records:
        session = AttendanceSession.query.get(record.session_id)
        if not session:
            continue
        if subject_code and session.subject_code != subject_code:
            continue
        result.append({
            'session_id': record.session_id,
            'subject_code': session.subject_code,
            'date': session.date.isoformat(),
            'status': record.status,
        })

    result.sort(key=lambda item: item['date'], reverse=True)
    return jsonify(result)


@student_bp.route('/attendance/summary', methods=['GET'])
@token_required
@role_required('STUDENT')
def attendance_summary(current_user):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    records = AttendanceRecord.query.filter_by(student_id=student.student_id).all()
    summary = {}
    for record in records:
        session = AttendanceSession.query.get(record.session_id)
        if not session:
            continue
        subject_code = session.subject_code
        if subject_code not in summary:
            summary[subject_code] = {'total': 0, 'present': 0, 'absent': 0}
        summary[subject_code]['total'] += 1
        if record.status == 'P':
            summary[subject_code]['present'] += 1
        else:
            summary[subject_code]['absent'] += 1

    result = []
    for subject_code, data in sorted(summary.items()):
        subject = Subject.query.get(subject_code)
        result.append({
            'subject_id': subject_code,
            'subject_code': subject_code,
            'subject_name': subject.subject_name if subject else subject_code,
            'total': data['total'],
            'present': data['present'],
            'absent': data['absent'],
            'percentage': round((data['present'] / data['total']) * 100, 1) if data['total'] > 0 else 0,
        })

    return jsonify(result)


@student_bp.route('/marks', methods=['GET'])
@token_required
@role_required('STUDENT')
def get_marks(current_user):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    subject_code = request.args.get('subject_code') or request.args.get('subject_id')
    query = Mark.query.filter_by(student_id=student.student_id)
    if subject_code:
        query = query.filter_by(subject_code=subject_code)

    return jsonify([mark.to_dict() for mark in query.order_by(Mark.subject_code.asc(), Mark.exam_type.asc()).all()])


@student_bp.route('/marks/summary', methods=['GET'])
@token_required
@role_required('STUDENT')
def marks_summary(current_user):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    marks = Mark.query.filter_by(student_id=student.student_id).all()
    grouped = {}
    for mark in marks:
        grouped.setdefault(mark.subject_code, []).append(mark)

    result = []
    for subject_code, subject_marks in sorted(grouped.items()):
        subject = Subject.query.get(subject_code)
        marks_data = {}
        total_obtained = 0
        total_max = 0
        for mark in subject_marks:
            percentage = round((mark.obtained_marks / mark.max_marks) * 100, 1) if mark.max_marks else 0
            marks_data[mark.exam_type] = {
                'obtained': mark.obtained_marks,
                'max': mark.max_marks,
                'percentage': percentage,
                'remarks': mark.remarks,
            }
            total_obtained += mark.obtained_marks
            total_max += mark.max_marks

        result.append({
            'subject_id': subject_code,
            'subject_code': subject_code,
            'subject_name': subject.subject_name if subject else subject_code,
            'marks': marks_data,
            'total_obtained': total_obtained,
            'total_max': total_max,
            'overall_percentage': round((total_obtained / total_max) * 100, 1) if total_max else 0,
        })

    return jsonify(result)


@student_bp.route('/subjects', methods=['GET'])
@token_required
@role_required('STUDENT')
def get_subjects(current_user):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    section = get_student_section(student)
    current_semester = section.current_semester if section else None

    query = Subject.query.filter_by(dept_id=student.dept_id)
    if current_semester is not None:
        query = query.filter_by(semester=current_semester)

    subjects = query.order_by(Subject.subject_code.asc()).all()
    return jsonify([s.to_dict() for s in subjects])


@student_bp.route('/assignments', methods=['GET'])
@token_required
@role_required('STUDENT')
def get_assignments(current_user):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    assignments = Assignment.query.filter_by(section_id=student.section_id).order_by(Assignment.created_at.desc()).all()
    submissions = AssignmentSubmission.query.filter_by(student_id=student.student_id).all()
    submissions_by_assignment = {submission.assignment_id: submission for submission in submissions}

    result = []
    for assignment in assignments:
        submission = submissions_by_assignment.get(assignment.assignment_id)
        subject = Subject.query.get(assignment.subject_code)
        result.append({
            **assignment.to_dict(),
            'subject_name': subject.subject_name if subject else assignment.subject_code,
            'attachment_url': build_upload_url(assignment.attachment_path),
            'submitted': submission is not None,
            'submission_id': submission.submission_id if submission else None,
            'submission_file_name': submission.file_name if submission else None,
            'submission_file_url': build_upload_url(submission.file_path) if submission else None,
            'submitted_at': submission.submitted_at.isoformat() if submission and submission.submitted_at else None,
            'marks_awarded': submission.marks_awarded if submission else None,
            'feedback': submission.feedback if submission else '',
        })
    return jsonify(result)


@student_bp.route('/assignments/<int:assignment_id>/submit', methods=['POST'])
@token_required
@role_required('STUDENT')
def submit_assignment(current_user, assignment_id):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    assignment = db.session.get(Assignment, assignment_id)
    if not assignment or assignment.section_id != student.section_id:
        return jsonify({'error': 'Assignment not found'}), 404

    file_path, file_name = save_uploaded_file(request.files.get('submission'), 'submissions')
    if not file_path:
        return jsonify({'error': 'Submission file is required'}), 400

    submission = AssignmentSubmission.query.filter_by(assignment_id=assignment_id, student_id=student.student_id).first()
    if not submission:
        submission = AssignmentSubmission(assignment_id=assignment_id, student_id=student.student_id)
        db.session.add(submission)

    submission.file_path = file_path
    submission.file_name = file_name
    submission.submitted_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify({
        'message': 'Assignment submitted successfully',
        'submission_id': submission.submission_id,
        'file_name': submission.file_name,
        'file_url': build_upload_url(submission.file_path),
    })
