from flask import Blueprint, request, jsonify
from models import db, User, Attendance, Marks, FacultyAllocation, Section
from auth import token_required, role_required
from datetime import datetime, date

faculty_bp = Blueprint('faculty', __name__, url_prefix='/api/faculty')

# ── My Allocations ────────────────────────────────────
@faculty_bp.route('/allocations', methods=['GET'])
@token_required
@role_required('faculty')
def get_my_allocations(current_user):
    allocations = FacultyAllocation.query.filter_by(faculty_id=current_user.id).all()
    return jsonify([a.to_dict() for a in allocations])

# ── Dashboard Stats ───────────────────────────────────
@faculty_bp.route('/stats', methods=['GET'])
@token_required
@role_required('faculty')
def get_stats(current_user):
    allocations = FacultyAllocation.query.filter_by(faculty_id=current_user.id).all()
    section_ids = list(set(a.section_id for a in allocations))
    subject_ids = list(set(a.subject_id for a in allocations))
    total_students = User.query.filter(
        User.role == 'student', User.section_id.in_(section_ids)
    ).count() if section_ids else 0
    today_attendance = Attendance.query.filter(
        Attendance.marked_by == current_user.id, Attendance.date == date.today()
    ).count()
    return jsonify({
        'allocations': len(allocations),
        'sections': len(section_ids),
        'subjects': len(subject_ids),
        'total_students': total_students,
        'today_attendance': today_attendance,
    })

# ── Students for a section ────────────────────────────
@faculty_bp.route('/students/<int:section_id>', methods=['GET'])
@token_required
@role_required('faculty')
def get_students(current_user, section_id):
    # Verify faculty is allocated to this section
    alloc = FacultyAllocation.query.filter_by(
        faculty_id=current_user.id, section_id=section_id
    ).first()
    if not alloc:
        return jsonify({'error': 'Not allocated to this section'}), 403
    students = User.query.filter_by(role='student', section_id=section_id).order_by(User.enrollment_no).all()
    return jsonify([s.to_dict() for s in students])

# ── Mark Attendance ───────────────────────────────────
@faculty_bp.route('/attendance', methods=['POST'])
@token_required
@role_required('faculty')
def mark_attendance(current_user):
    data = request.get_json()
    if not data or not data.get('subject_id') or not data.get('section_id') or not data.get('date') or not data.get('records'):
        return jsonify({'error': 'subject_id, section_id, date, and records are required'}), 400

    att_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    section_id = data['section_id']
    subject_id = data['subject_id']

    # Verify allocation
    alloc = FacultyAllocation.query.filter_by(
        faculty_id=current_user.id, section_id=section_id, subject_id=subject_id
    ).first()
    if not alloc:
        return jsonify({'error': 'Not allocated to this section/subject'}), 403

    saved = 0
    for record in data['records']:
        student_id = record['student_id']
        status = record.get('status', 'present')
        existing = Attendance.query.filter_by(
            student_id=student_id, subject_id=subject_id, date=att_date
        ).first()
        if existing:
            existing.status = status
        else:
            att = Attendance(
                student_id=student_id, subject_id=subject_id, section_id=section_id,
                date=att_date, status=status, marked_by=current_user.id,
            )
            db.session.add(att)
        saved += 1

    db.session.commit()
    return jsonify({'message': f'Attendance saved for {saved} students', 'count': saved})

# ── Get Attendance Records ────────────────────────────
@faculty_bp.route('/attendance', methods=['GET'])
@token_required
@role_required('faculty')
def get_attendance(current_user):
    subject_id = request.args.get('subject_id', type=int)
    section_id = request.args.get('section_id', type=int)
    att_date = request.args.get('date')

    query = Attendance.query.filter_by(marked_by=current_user.id)
    if subject_id:
        query = query.filter_by(subject_id=subject_id)
    if section_id:
        query = query.filter_by(section_id=section_id)
    if att_date:
        query = query.filter_by(date=datetime.strptime(att_date, '%Y-%m-%d').date())

    records = query.order_by(Attendance.date.desc()).all()
    return jsonify([r.to_dict() for r in records])

# ── Attendance Report ─────────────────────────────────
@faculty_bp.route('/attendance/report', methods=['GET'])
@token_required
@role_required('faculty')
def attendance_report(current_user):
    subject_id = request.args.get('subject_id', type=int)
    section_id = request.args.get('section_id', type=int)
    if not subject_id or not section_id:
        return jsonify({'error': 'subject_id and section_id are required'}), 400

    students = User.query.filter_by(role='student', section_id=section_id).order_by(User.enrollment_no).all()
    report = []
    for student in students:
        records = Attendance.query.filter_by(student_id=student.id, subject_id=subject_id).all()
        total = len(records)
        present = sum(1 for r in records if r.status == 'present')
        late = sum(1 for r in records if r.status == 'late')
        absent = sum(1 for r in records if r.status == 'absent')
        percentage = round(((present + late) / total) * 100, 1) if total > 0 else 0
        report.append({
            'student_id': student.id,
            'student_name': student.name,
            'enrollment_no': student.enrollment_no,
            'total_classes': total,
            'present': present,
            'late': late,
            'absent': absent,
            'percentage': percentage,
        })
    return jsonify(report)

# ── Enter Marks ───────────────────────────────────────
@faculty_bp.route('/marks', methods=['POST'])
@token_required
@role_required('faculty')
def enter_marks(current_user):
    data = request.get_json()
    if not data or not data.get('subject_id') or not data.get('exam_type') or not data.get('max_marks') or not data.get('records'):
        return jsonify({'error': 'subject_id, exam_type, max_marks, and records are required'}), 400

    saved = 0
    for record in data['records']:
        student_id = record['student_id']
        obtained = record.get('obtained_marks', 0)
        remarks = record.get('remarks', '')
        existing = Marks.query.filter_by(
            student_id=student_id, subject_id=data['subject_id'], exam_type=data['exam_type']
        ).first()
        if existing:
            existing.obtained_marks = obtained
            existing.max_marks = data['max_marks']
            existing.remarks = remarks
        else:
            mark = Marks(
                student_id=student_id, subject_id=data['subject_id'],
                exam_type=data['exam_type'], max_marks=data['max_marks'],
                obtained_marks=obtained, remarks=remarks,
            )
            db.session.add(mark)
        saved += 1

    db.session.commit()
    return jsonify({'message': f'Marks saved for {saved} students', 'count': saved})

# ── Get Marks ─────────────────────────────────────────
@faculty_bp.route('/marks', methods=['GET'])
@token_required
@role_required('faculty')
def get_marks(current_user):
    subject_id = request.args.get('subject_id', type=int)
    section_id = request.args.get('section_id', type=int)
    exam_type = request.args.get('exam_type')

    if not subject_id:
        return jsonify({'error': 'subject_id is required'}), 400

    query = Marks.query.filter_by(subject_id=subject_id)
    if exam_type:
        query = query.filter_by(exam_type=exam_type)
    if section_id:
        query = query.join(User, Marks.student_id == User.id).filter(User.section_id == section_id)

    records = query.all()
    return jsonify([r.to_dict() for r in records])

# ── Marks Report ──────────────────────────────────────
@faculty_bp.route('/marks/report', methods=['GET'])
@token_required
@role_required('faculty')
def marks_report(current_user):
    subject_id = request.args.get('subject_id', type=int)
    section_id = request.args.get('section_id', type=int)
    if not subject_id or not section_id:
        return jsonify({'error': 'subject_id and section_id are required'}), 400

    students = User.query.filter_by(role='student', section_id=section_id).order_by(User.enrollment_no).all()
    report = []
    for student in students:
        marks = Marks.query.filter_by(student_id=student.id, subject_id=subject_id).all()
        marks_data = {}
        total_obtained = 0
        total_max = 0
        for m in marks:
            marks_data[m.exam_type] = {'obtained': m.obtained_marks, 'max': m.max_marks, 'percentage': round((m.obtained_marks / m.max_marks) * 100, 1) if m.max_marks else 0}
            total_obtained += m.obtained_marks
            total_max += m.max_marks
        report.append({
            'student_id': student.id,
            'student_name': student.name,
            'enrollment_no': student.enrollment_no,
            'marks': marks_data,
            'total_obtained': total_obtained,
            'total_max': total_max,
            'overall_percentage': round((total_obtained / total_max) * 100, 1) if total_max else 0,
        })
    return jsonify(report)
