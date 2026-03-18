from flask import Blueprint, request, jsonify
from models import db, User, Section, Subject, FacultyAllocation, Branch
from auth import token_required, role_required
import bcrypt

dept_bp = Blueprint('department', __name__, url_prefix='/api/department')

# ── Dashboard Stats ───────────────────────────────────
@dept_bp.route('/stats', methods=['GET'])
@token_required
@role_required('dept_admin')
def get_stats(current_user):
    branch_id = current_user.branch_id
    return jsonify({
        'sections': Section.query.filter_by(branch_id=branch_id).count(),
        'subjects': Subject.query.filter_by(branch_id=branch_id).count(),
        'faculty': User.query.filter_by(role='faculty', branch_id=branch_id).count(),
        'students': User.query.filter_by(role='student', branch_id=branch_id).count(),
        'allocations': FacultyAllocation.query.join(Section).filter(Section.branch_id == branch_id).count(),
    })

# ── Sections CRUD ─────────────────────────────────────
@dept_bp.route('/sections', methods=['GET'])
@token_required
@role_required('dept_admin')
def get_sections(current_user):
    sections = Section.query.filter_by(branch_id=current_user.branch_id).all()
    return jsonify([s.to_dict() for s in sections])

@dept_bp.route('/sections', methods=['POST'])
@token_required
@role_required('dept_admin')
def create_section(current_user):
    data = request.get_json()
    if not data or not data.get('name') or not data.get('semester'):
        return jsonify({'error': 'Name and semester are required'}), 400
    section = Section(name=data['name'], branch_id=current_user.branch_id, semester=data['semester'])
    db.session.add(section)
    db.session.commit()
    return jsonify(section.to_dict()), 201

@dept_bp.route('/sections/<int:section_id>', methods=['DELETE'])
@token_required
@role_required('dept_admin')
def delete_section(current_user, section_id):
    section = db.session.get(Section, section_id)
    if not section or section.branch_id != current_user.branch_id:
        return jsonify({'error': 'Section not found'}), 404
    db.session.delete(section)
    db.session.commit()
    return jsonify({'message': 'Section deleted'})

# ── Subjects CRUD ─────────────────────────────────────
@dept_bp.route('/subjects', methods=['GET'])
@token_required
@role_required('dept_admin')
def get_subjects(current_user):
    subjects = Subject.query.filter_by(branch_id=current_user.branch_id).all()
    return jsonify([s.to_dict() for s in subjects])

@dept_bp.route('/subjects', methods=['POST'])
@token_required
@role_required('dept_admin')
def create_subject(current_user):
    data = request.get_json()
    if not data or not data.get('name') or not data.get('code') or not data.get('semester'):
        return jsonify({'error': 'Name, code, and semester are required'}), 400
    subject = Subject(
        name=data['name'], code=data['code'].upper(),
        branch_id=current_user.branch_id, semester=data['semester'],
        credits=data.get('credits', 3),
    )
    db.session.add(subject)
    db.session.commit()
    return jsonify(subject.to_dict()), 201

@dept_bp.route('/subjects/<int:subject_id>', methods=['DELETE'])
@token_required
@role_required('dept_admin')
def delete_subject(current_user, subject_id):
    subject = db.session.get(Subject, subject_id)
    if not subject or subject.branch_id != current_user.branch_id:
        return jsonify({'error': 'Subject not found'}), 404
    db.session.delete(subject)
    db.session.commit()
    return jsonify({'message': 'Subject deleted'})

# ── Faculty Management ────────────────────────────────
@dept_bp.route('/faculty', methods=['GET'])
@token_required
@role_required('dept_admin')
def get_faculty(current_user):
    faculty = User.query.filter_by(role='faculty', branch_id=current_user.branch_id).all()
    return jsonify([f.to_dict() for f in faculty])

@dept_bp.route('/faculty', methods=['POST'])
@token_required
@role_required('dept_admin')
def create_faculty(current_user):
    data = request.get_json()
    required = ['name', 'email', 'password']
    if not data or not all(data.get(f) for f in required):
        return jsonify({'error': 'name, email, password are required'}), 400
    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'error': 'Email already exists'}), 409
    hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    user = User(
        name=data['name'], email=data['email'].lower(), password_hash=hashed.decode('utf-8'),
        role='faculty', college_id=current_user.college_id, branch_id=current_user.branch_id,
        phone=data.get('phone', ''),
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@dept_bp.route('/faculty/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('dept_admin')
def delete_faculty(current_user, user_id):
    user = db.session.get(User, user_id)
    if not user or user.role != 'faculty' or user.branch_id != current_user.branch_id:
        return jsonify({'error': 'Faculty not found'}), 404
    FacultyAllocation.query.filter_by(faculty_id=user_id).delete()
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Faculty deleted'})

# ── Student Management ────────────────────────────────
@dept_bp.route('/students', methods=['GET'])
@token_required
@role_required('dept_admin')
def get_students(current_user):
    section_id = request.args.get('section_id', type=int)
    query = User.query.filter_by(role='student', branch_id=current_user.branch_id)
    if section_id:
        query = query.filter_by(section_id=section_id)
    students = query.order_by(User.enrollment_no).all()
    return jsonify([s.to_dict() for s in students])

@dept_bp.route('/students', methods=['POST'])
@token_required
@role_required('dept_admin')
def create_student(current_user):
    data = request.get_json()
    required = ['name', 'email', 'password', 'enrollment_no', 'section_id']
    if not data or not all(data.get(f) for f in required):
        return jsonify({'error': 'name, email, password, enrollment_no, section_id are required'}), 400
    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'error': 'Email already exists'}), 409
    if User.query.filter_by(enrollment_no=data['enrollment_no']).first():
        return jsonify({'error': 'Enrollment number already exists'}), 409
    hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    user = User(
        name=data['name'], email=data['email'].lower(), password_hash=hashed.decode('utf-8'),
        role='student', college_id=current_user.college_id, branch_id=current_user.branch_id,
        section_id=data['section_id'], enrollment_no=data['enrollment_no'],
        phone=data.get('phone', ''),
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@dept_bp.route('/students/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('dept_admin')
def delete_student(current_user, user_id):
    user = db.session.get(User, user_id)
    if not user or user.role != 'student' or user.branch_id != current_user.branch_id:
        return jsonify({'error': 'Student not found'}), 404
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Student deleted'})

# ── Faculty Allocations ───────────────────────────────
@dept_bp.route('/allocations', methods=['GET'])
@token_required
@role_required('dept_admin')
def get_allocations(current_user):
    allocations = FacultyAllocation.query.join(Section).filter(
        Section.branch_id == current_user.branch_id
    ).all()
    return jsonify([a.to_dict() for a in allocations])

@dept_bp.route('/allocations', methods=['POST'])
@token_required
@role_required('dept_admin')
def create_allocation(current_user):
    data = request.get_json()
    if not data or not data.get('faculty_id') or not data.get('section_id') or not data.get('subject_id'):
        return jsonify({'error': 'faculty_id, section_id, subject_id are required'}), 400
    existing = FacultyAllocation.query.filter_by(
        faculty_id=data['faculty_id'], section_id=data['section_id'], subject_id=data['subject_id']
    ).first()
    if existing:
        return jsonify({'error': 'Allocation already exists'}), 409
    alloc = FacultyAllocation(
        faculty_id=data['faculty_id'], section_id=data['section_id'], subject_id=data['subject_id']
    )
    db.session.add(alloc)
    db.session.commit()
    return jsonify(alloc.to_dict()), 201

@dept_bp.route('/allocations/<int:alloc_id>', methods=['DELETE'])
@token_required
@role_required('dept_admin')
def delete_allocation(current_user, alloc_id):
    alloc = db.session.get(FacultyAllocation, alloc_id)
    if not alloc:
        return jsonify({'error': 'Allocation not found'}), 404
    db.session.delete(alloc)
    db.session.commit()
    return jsonify({'message': 'Allocation deleted'})
