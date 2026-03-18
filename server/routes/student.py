from flask import Blueprint, request, jsonify
from models import db, User, Attendance, Marks, Subject, Section
from auth import token_required, role_required

student_bp = Blueprint('student', __name__, url_prefix='/api/student')

# ── Dashboard Stats ───────────────────────────────────
@student_bp.route('/stats', methods=['GET'])
@token_required
@role_required('student')
def get_stats(current_user):
    subjects = Subject.query.filter_by(
        branch_id=current_user.branch_id,
        semester=current_user.section.semester if current_user.section else 1
    ).all()
    subject_ids = [s.id for s in subjects]

    total_attendance = Attendance.query.filter(
        Attendance.student_id == current_user.id,
        Attendance.subject_id.in_(subject_ids)
    ).count() if subject_ids else 0

    present_count = Attendance.query.filter(
        Attendance.student_id == current_user.id,
        Attendance.subject_id.in_(subject_ids),
        Attendance.status.in_(['present', 'late'])
    ).count() if subject_ids else 0

    attendance_pct = round((present_count / total_attendance) * 100, 1) if total_attendance > 0 else 0

    marks_entries = Marks.query.filter(
        Marks.student_id == current_user.id,
        Marks.subject_id.in_(subject_ids)
    ).all() if subject_ids else []

    total_obtained = sum(m.obtained_marks for m in marks_entries)
    total_max = sum(m.max_marks for m in marks_entries)
    avg_marks = round((total_obtained / total_max) * 100, 1) if total_max > 0 else 0

    return jsonify({
        'subjects': len(subjects),
        'total_classes': total_attendance,
        'present': present_count,
        'attendance_percentage': attendance_pct,
        'avg_marks': avg_marks,
        'total_exams': len(marks_entries),
    })

# ── My Attendance ─────────────────────────────────────
@student_bp.route('/attendance', methods=['GET'])
@token_required
@role_required('student')
def get_attendance(current_user):
    subject_id = request.args.get('subject_id', type=int)
    query = Attendance.query.filter_by(student_id=current_user.id)
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    records = query.order_by(Attendance.date.desc()).all()
    return jsonify([r.to_dict() for r in records])

# ── Attendance Summary per Subject ────────────────────
@student_bp.route('/attendance/summary', methods=['GET'])
@token_required
@role_required('student')
def attendance_summary(current_user):
    subjects = Subject.query.filter_by(
        branch_id=current_user.branch_id,
        semester=current_user.section.semester if current_user.section else 1
    ).all()

    summary = []
    for subject in subjects:
        records = Attendance.query.filter_by(student_id=current_user.id, subject_id=subject.id).all()
        total = len(records)
        present = sum(1 for r in records if r.status in ('present', 'late'))
        absent = sum(1 for r in records if r.status == 'absent')
        pct = round((present / total) * 100, 1) if total > 0 else 0
        summary.append({
            'subject_id': subject.id,
            'subject_name': subject.name,
            'subject_code': subject.code,
            'total': total,
            'present': present,
            'absent': absent,
            'percentage': pct,
        })
    return jsonify(summary)

# ── My Marks ──────────────────────────────────────────
@student_bp.route('/marks', methods=['GET'])
@token_required
@role_required('student')
def get_marks(current_user):
    subject_id = request.args.get('subject_id', type=int)
    query = Marks.query.filter_by(student_id=current_user.id)
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    records = query.all()
    return jsonify([r.to_dict() for r in records])

# ── Marks Summary per Subject ─────────────────────────
@student_bp.route('/marks/summary', methods=['GET'])
@token_required
@role_required('student')
def marks_summary(current_user):
    subjects = Subject.query.filter_by(
        branch_id=current_user.branch_id,
        semester=current_user.section.semester if current_user.section else 1
    ).all()

    summary = []
    for subject in subjects:
        marks = Marks.query.filter_by(student_id=current_user.id, subject_id=subject.id).all()
        marks_data = {}
        total_obtained = 0
        total_max = 0
        for m in marks:
            marks_data[m.exam_type] = {
                'obtained': m.obtained_marks,
                'max': m.max_marks,
                'percentage': round((m.obtained_marks / m.max_marks) * 100, 1) if m.max_marks else 0,
            }
            total_obtained += m.obtained_marks
            total_max += m.max_marks
        summary.append({
            'subject_id': subject.id,
            'subject_name': subject.name,
            'subject_code': subject.code,
            'marks': marks_data,
            'total_obtained': total_obtained,
            'total_max': total_max,
            'overall_percentage': round((total_obtained / total_max) * 100, 1) if total_max else 0,
        })
    return jsonify(summary)

# ── My Subjects ───────────────────────────────────────
@student_bp.route('/subjects', methods=['GET'])
@token_required
@role_required('student')
def get_subjects(current_user):
    subjects = Subject.query.filter_by(
        branch_id=current_user.branch_id,
        semester=current_user.section.semester if current_user.section else 1
    ).all()
    return jsonify([s.to_dict() for s in subjects])
