from secrets import token_urlsafe

from flask import Blueprint, jsonify, request

from auth import hash_password, normalize_email, token_required, role_required
from models import Batch, College, Department, Faculty, Mark, Section, Student, User, db

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def get_college_scope(current_user):
    return current_user.college_id


@admin_bp.route('/register-college', methods=['POST'])
def register_college():
    data = request.get_json() or {}
    required = ['college_name', 'admin_name', 'admin_email', 'password']
    if not all(data.get(field) for field in required):
        return jsonify({'error': 'college_name, admin_name, admin_email, and password are required'}), 400

    college_name = data['college_name'].strip()
    admin_email = normalize_email(data['admin_email'])
    if College.query.filter_by(college_name=college_name).first():
        return jsonify({'error': 'College already exists'}), 409
    if User.query.filter_by(email=admin_email).first():
        return jsonify({'error': 'Email already exists'}), 409

    college = College(college_name=college_name)
    db.session.add(college)
    db.session.flush()

    user = User(
        name=data['admin_name'].strip(),
        email=admin_email,
        password_hash=hash_password(data['password']),
        role='SUPER_ADMIN',
        college_id=college.college_id,
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'College registered successfully',
        'college': college.to_dict(),
        'super_admin': user.to_dict(),
    }), 201


@admin_bp.route('/stats', methods=['GET'])
@token_required
@role_required('SUPER_ADMIN')
def get_stats(current_user):
    college_id = get_college_scope(current_user)
    departments = Department.query.filter_by(college_id=college_id)
    dept_ids = [dept.dept_id for dept in departments.all()]
    faculty_query = Faculty.query.filter(Faculty.dept_id.in_(dept_ids)) if dept_ids else Faculty.query.filter(False)
    student_query = Student.query.filter(Student.dept_id.in_(dept_ids)) if dept_ids else Student.query.filter(False)
    section_query = Section.query.filter(Section.dept_id.in_(dept_ids)) if dept_ids else Section.query.filter(False)
    batch_query = Batch.query.filter(Batch.dept_id.in_(dept_ids)) if dept_ids else Batch.query.filter(False)
    dept_admin_query = User.query.filter_by(role='DEPT_ADMIN', college_id=college_id)

    return jsonify({
        'college_name': db.session.get(College, college_id).college_name if college_id else None,
        'departments': len(dept_ids),
        'dept_admins': dept_admin_query.count(),
        'faculty': faculty_query.count(),
        'students': student_query.count(),
        'sections': section_query.count(),
        'batches': batch_query.count(),
    })


@admin_bp.route('/college', methods=['GET'])
@token_required
@role_required('SUPER_ADMIN')
def get_college(current_user):
    college = db.session.get(College, current_user.college_id)
    if not college:
        return jsonify({'error': 'College not found'}), 404
    return jsonify(college.to_dict())


@admin_bp.route('/departments', methods=['GET'])
@token_required
@role_required('SUPER_ADMIN')
def get_departments(current_user):
    departments = Department.query.filter_by(college_id=current_user.college_id).order_by(Department.dept_name.asc()).all()
    result = []
    for department in departments:
        dept_admin = User.query.filter_by(role='DEPT_ADMIN', dept_id=department.dept_id).first()
        result.append({
            **department.to_dict(),
            'dept_admin_name': dept_admin.name if dept_admin else None,
            'dept_admin_email': dept_admin.email if dept_admin else None,
        })
    return jsonify(result)


@admin_bp.route('/departments', methods=['POST'])
@token_required
@role_required('SUPER_ADMIN')
def create_department(current_user):
    data = request.get_json() or {}
    required = ['department_name', 'admin_name', 'admin_email']
    if not all(data.get(field) for field in required):
        return jsonify({'error': 'department_name, admin_name, and admin_email are required'}), 400

    department_name = data['department_name'].strip()
    admin_email = normalize_email(data['admin_email'])
    admin_password = (data.get('admin_password') or token_urlsafe(6)).replace('-', '').replace('_', '')

    if Department.query.filter_by(college_id=current_user.college_id, dept_name=department_name).first():
        return jsonify({'error': 'Department already exists for this college'}), 409
    if User.query.filter_by(email=admin_email).first():
        return jsonify({'error': 'Admin email already exists'}), 409

    department = Department(dept_name=department_name, college_id=current_user.college_id)
    db.session.add(department)
    db.session.flush()

    dept_admin = User(
        name=data['admin_name'].strip(),
        email=admin_email,
        password_hash=hash_password(admin_password),
        role='DEPT_ADMIN',
        dept_id=department.dept_id,
        college_id=current_user.college_id,
    )
    db.session.add(dept_admin)
    db.session.commit()

    return jsonify({
        'department': department.to_dict(),
        'dept_admin': {
            'name': dept_admin.name,
            'email': dept_admin.email,
            'password': admin_password,
        },
    }), 201


@admin_bp.route('/students/explorer', methods=['GET'])
@token_required
@role_required('SUPER_ADMIN')
def students_explorer(current_user):
    college_id = current_user.college_id
    dept_id = request.args.get('department_id', type=int)
    batch_id = request.args.get('batch_id', type=int)
    section_id = request.args.get('section_id', type=int)
    search = (request.args.get('search') or '').strip().lower()

    department_query = Department.query.filter_by(college_id=college_id)
    departments = department_query.order_by(Department.dept_name.asc()).all()
    allowed_dept_ids = [department.dept_id for department in departments]

    batch_query = Batch.query.filter(Batch.dept_id.in_(allowed_dept_ids)) if allowed_dept_ids else Batch.query.filter(False)
    if dept_id:
        batch_query = batch_query.filter_by(dept_id=dept_id)
    batches = batch_query.order_by(Batch.batch_name.desc()).all()

    section_query = Section.query.filter(Section.dept_id.in_(allowed_dept_ids)) if allowed_dept_ids else Section.query.filter(False)
    if dept_id:
        section_query = section_query.filter_by(dept_id=dept_id)
    if batch_id:
        section_query = section_query.filter_by(batch_id=batch_id)
    sections = section_query.order_by(Section.section_name.asc()).all()

    student_query = Student.query.filter(Student.dept_id.in_(allowed_dept_ids)) if allowed_dept_ids else Student.query.filter(False)
    if dept_id:
        student_query = student_query.filter_by(dept_id=dept_id)
    if batch_id:
        student_query = student_query.filter_by(batch_id=batch_id)
    if section_id:
        student_query = student_query.filter_by(section_id=section_id)
    students = student_query.order_by(Student.roll_no.asc()).all()

    student_rows = []
    for student in students:
        if search and search not in student.roll_no.lower():
            section = db.session.get(Section, student.section_id)
            batch = db.session.get(Batch, student.batch_id)
            user = db.session.get(User, student.student_id)
            joined_text = ' '.join(filter(None, [
                student.roll_no,
                user.name if user else '',
                section.section_name if section else '',
                batch.batch_name if batch else '',
            ])).lower()
            if search not in joined_text:
                continue
        user = db.session.get(User, student.student_id)
        section = db.session.get(Section, student.section_id)
        batch = db.session.get(Batch, student.batch_id)
        attendance_total = StudentAttendance_total(student.student_id)
        attendance_present = StudentAttendance_present(student.student_id)
        attendance_pct = round((attendance_present / attendance_total) * 100, 1) if attendance_total else 0
        marks = Mark.query.filter_by(student_id=student.student_id).all()
        total_obtained = sum(mark.obtained_marks for mark in marks)
        total_max = sum(mark.max_marks for mark in marks)
        marks_pct = round((total_obtained / total_max) * 100, 1) if total_max else 0
        student_rows.append({
            'student_id': student.student_id,
            'roll_no': student.roll_no,
            'name': user.name if user else None,
            'department_id': student.dept_id,
            'department_name': db.session.get(Department, student.dept_id).dept_name if student.dept_id else None,
            'batch_id': student.batch_id,
            'batch_name': batch.batch_name if batch else None,
            'section_id': student.section_id,
            'section_name': section.section_name if section else None,
            'attendance_pct': attendance_pct,
            'marks_pct': marks_pct,
        })

    return jsonify({
        'departments': [department.to_dict() for department in departments],
        'batches': [{'id': batch.batch_id, 'name': batch.batch_name, 'dept_id': batch.dept_id} for batch in batches],
        'sections': [{'id': section.section_id, 'name': section.section_name, 'batch_id': section.batch_id, 'dept_id': section.dept_id} for section in sections],
        'students': student_rows,
    })


def StudentAttendance_total(student_id):
    from models import AttendanceRecord
    return AttendanceRecord.query.filter_by(student_id=student_id).count()


def StudentAttendance_present(student_id):
    from models import AttendanceRecord
    return AttendanceRecord.query.filter_by(student_id=student_id, status='P').count()


@admin_bp.route('/faculty', methods=['GET'])
@token_required
@role_required('SUPER_ADMIN')
def get_faculty(current_user):
    college_id = current_user.college_id
    dept_id = request.args.get('department_id', type=int)
    search = (request.args.get('search') or '').strip().lower()
    departments = Department.query.filter_by(college_id=college_id).order_by(Department.dept_name.asc()).all()
    allowed_dept_ids = [department.dept_id for department in departments]
    faculty_query = Faculty.query.filter(Faculty.dept_id.in_(allowed_dept_ids)) if allowed_dept_ids else Faculty.query.filter(False)
    if dept_id:
        faculty_query = faculty_query.filter_by(dept_id=dept_id)

    faculty_rows = []
    for faculty in faculty_query.order_by(Faculty.faculty_id.asc()).all():
        user = db.session.get(User, faculty.user_id)
        department = db.session.get(Department, faculty.dept_id)
        haystack = ' '.join(filter(None, [
            str(faculty.faculty_id),
            user.name if user else '',
            user.email if user else '',
            department.dept_name if department else '',
        ])).lower()
        if search and search not in haystack:
            continue
        faculty_rows.append({
            'faculty_id': faculty.faculty_id,
            'name': user.name if user else None,
            'email': user.email if user else None,
            'department_id': faculty.dept_id,
            'department_name': department.dept_name if department else None,
        })

    return jsonify({
        'departments': [department.to_dict() for department in departments],
        'faculty': faculty_rows,
    })
