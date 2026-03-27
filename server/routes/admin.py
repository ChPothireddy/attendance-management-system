from flask import Blueprint, request, jsonify
from models import db, User, Department, Section, Faculty, Student, Subject
from auth import hash_password, normalize_email, token_required, role_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# ── Dashboard Stats ───────────────────────────────────
@admin_bp.route('/stats', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_stats(current_user):
    return jsonify({
        'departments': Department.query.count(),
        'branches': Department.query.count(),
        'faculty': Faculty.query.count(),
        'students': Student.query.count(),
        'dept_admins': User.query.filter_by(role='DEPT_ADMIN').count(),
        'sections': Section.query.count(),
        'subjects': Subject.query.count(),
    })

@admin_bp.route('/users', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_users(current_user):
    role = request.args.get('role', '').lower()
    role_map = {
        'super_admin': 'SUPER_ADMIN',
        'dept_admin': 'DEPT_ADMIN',
        'faculty': 'FACULTY',
        'student': 'STUDENT',
    }
    query = User.query
    if role:
        if role in role_map:
            query = query.filter_by(role=role_map[role])
        else:
            query = query.filter_by(role=role.upper())

    users = query.all()
    result = []
    for u in users:
        dept = db.session.get(Department, u.dept_id) if u.dept_id else None
        result.append({
            'id': u.user_id,
            'name': u.name,
            'email': u.email,
            'role': u.role.lower().replace('dept_admin', 'dept_admin'),
            'college_name': dept.dept_name if dept else None,
            'branch_name': dept.dept_name if dept else None,
            'created_at': None,
        })
    return jsonify(result)

# ── Departments CRUD ─────────────────────────────────────
@admin_bp.route('/departments', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_departments(current_user):
    departments = Department.query.all()
    return jsonify([d.to_dict() for d in departments])

@admin_bp.route('/departments', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_department(current_user):
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    if Department.query.filter_by(dept_name=data['name']).first():
        return jsonify({'error': 'Department name already exists'}), 409
    department = Department(dept_name=data['name'])
    db.session.add(department)
    db.session.commit()
    return jsonify(department.to_dict()), 201

@admin_bp.route('/departments/<int:dept_id>', methods=['PUT'])
@token_required
@role_required('DEPT_ADMIN')
def update_department(current_user, dept_id):
    department = db.session.get(Department, dept_id)
    if not department:
        return jsonify({'error': 'Department not found'}), 404
    data = request.get_json()
    if data.get('name'):
        department.dept_name = data['name']
    db.session.commit()
    return jsonify(department.to_dict())

@admin_bp.route('/departments/<int:dept_id>', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_department(current_user, dept_id):
    department = db.session.get(Department, dept_id)
    if not department:
        return jsonify({'error': 'Department not found'}), 404
    db.session.delete(department)
    db.session.commit()
    return jsonify({'message': 'Department deleted'})

# ── Branches CRUD ─────────────────────────────────────
@admin_bp.route('/branches', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_branches(current_user):
    branches = Department.query.all()
    return jsonify([b.to_dict() for b in branches])

@admin_bp.route('/branches', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_branch(current_user):
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    if Department.query.filter_by(dept_name=data['name']).first():
        return jsonify({'error': 'Branch name already exists'}), 409
    branch = Department(dept_name=data['name'])
    db.session.add(branch)
    db.session.commit()
    return jsonify(branch.to_dict()), 201

@admin_bp.route('/branches/<int:branch_id>', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_branch(current_user, branch_id):
    branch = db.session.get(Department, branch_id)
    if not branch:
        return jsonify({'error': 'Branch not found'}), 404
    db.session.delete(branch)
    db.session.commit()
    return jsonify({'message': 'Branch deleted'})

# ── Colleges CRUD (alias for departments) ─────────────────────────────────────
@admin_bp.route('/colleges', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_colleges(current_user):
    colleges = Department.query.all()
    return jsonify([c.to_dict() for c in colleges])

# ── Subjects CRUD ─────────────────────────────────────
@admin_bp.route('/subjects', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_subjects(current_user):
    subjects = Subject.query.all()
    return jsonify([s.to_dict() for s in subjects])

@admin_bp.route('/subjects', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_subject(current_user):
    data = request.get_json()
    if not data or not data.get('code') or not data.get('name'):
        return jsonify({'error': 'Code and name are required'}), 400
    if Subject.query.filter_by(subject_code=data['code']).first():
        return jsonify({'error': 'Subject code already exists'}), 409
    subject = Subject(
        subject_code=data['code'],
        subject_name=data['name'],
        semester=data.get('semester'),
        credits=data.get('credits'),
    )
    db.session.add(subject)
    db.session.commit()
    return jsonify(subject.to_dict()), 201

@admin_bp.route('/subjects/<string:subject_code>', methods=['PUT'])
@token_required
@role_required('DEPT_ADMIN')
def update_subject(current_user, subject_code):
    subject = db.session.get(Subject, subject_code)
    if not subject:
        return jsonify({'error': 'Subject not found'}), 404
    data = request.get_json()
    if data.get('name'):
        subject.subject_name = data['name']
    if 'semester' in data:
        subject.semester = data['semester']
    if 'credits' in data:
        subject.credits = data['credits']
    db.session.commit()
    return jsonify(subject.to_dict())

@admin_bp.route('/subjects/<string:subject_code>', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_subject(current_user, subject_code):
    subject = db.session.get(Subject, subject_code)
    if not subject:
        return jsonify({'error': 'Subject not found'}), 404
    db.session.delete(subject)
    db.session.commit()
    return jsonify({'message': 'Subject deleted'})

# ── Dept Admins CRUD ──────────────────────────────────
@admin_bp.route('/dept-admins', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_dept_admins(current_user):
    admins = User.query.filter_by(role='dept_admin').all()
    return jsonify([a.to_dict() for a in admins])

@admin_bp.route('/dept-admins', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_dept_admin(current_user):
    data = request.get_json()
    required = ['name', 'email', 'password']
    if not data or not all(data.get(f) for f in required):
        return jsonify({'error': 'name, email, password are required'}), 400
    email = normalize_email(data['email'])
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409
    user = User(
        name=data['name'], email=email, password_hash=hash_password(data['password']),
        role='DEPT_ADMIN'
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@admin_bp.route('/dept-admins/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_dept_admin(current_user, user_id):
    user = db.session.get(User, user_id)
    if not user or user.role != 'dept_admin':
        return jsonify({'error': 'Dept admin not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Dept admin deleted'})

# ── All Users (admin view) ────────────────────────────
@admin_bp.route('/users', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_all_users(current_user):
    role = request.args.get('role')
    query = User.query
    if role:
        query = query.filter_by(role=role)
    users = query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])
