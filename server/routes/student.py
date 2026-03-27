from flask import Blueprint, jsonify, request

from auth import role_required, token_required
from models import AttendanceRecord, AttendanceSession, Mark, Student, Subject

student_bp = Blueprint('student', __name__, url_prefix='/api/student')


def get_student_profile(current_user):
    student = Student.query.filter_by(student_id=current_user.user_id).first()
    if not student:
        student = Student.query.filter_by(email=current_user.email).first()
    return student


@student_bp.route('/stats', methods=['GET'])
@token_required
@role_required('STUDENT')
def get_stats(current_user):
    student = get_student_profile(current_user)
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    total_classes = AttendanceRecord.query.filter_by(student_id=student.student_id).count()
    present_count = AttendanceRecord.query.filter_by(student_id=student.student_id, status='P').count()
    attendance_pct = round((present_count / total_classes) * 100, 1) if total_classes > 0 else 0
    subject_count = Subject.query.filter_by(dept_id=student.dept_id).count()
    marks = Mark.query.filter_by(student_id=student.student_id).all()
    total_obtained = sum(mark.obtained_marks for mark in marks)
    total_max = sum(mark.max_marks for mark in marks)
    avg_marks = round((total_obtained / total_max) * 100, 1) if total_max > 0 else 0

    return jsonify({
        'subjects': subject_count,
        'total_classes': total_classes,
        'present': present_count,
        'attendance_percentage': attendance_pct,
        'avg_marks': avg_marks,
        'total_exams': len(marks),
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

    subjects = (
        Subject.query
        .filter_by(dept_id=student.dept_id)
        .order_by(Subject.semester.asc(), Subject.subject_code.asc())
        .all()
    )
    return jsonify([s.to_dict() for s in subjects])
