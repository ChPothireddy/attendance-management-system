from flask import Blueprint, request, jsonify
from models import db, User, College, Branch, Section, Subject
from auth import token_required, role_required
import bcrypt

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# ── Dashboard Stats ───────────────────────────────────
@admin_bp.route('/stats', methods=['GET'])
@token_required
@role_required('super_admin')
def get_stats(current_user):
    return jsonify({
        'colleges': College.query.count(),
        'branches': Branch.query.count(),
        'faculty': User.query.filter_by(role='faculty').count(),
        'students': User.query.filter_by(role='student').count(),
        'dept_admins': User.query.filter_by(role='dept_admin').count(),
        'sections': Section.query.count(),
        'subjects': Subject.query.count(),
    })

# ── Colleges CRUD ─────────────────────────────────────
@admin_bp.route('/colleges', methods=['GET'])
@token_required
@role_required('super_admin')
def get_colleges(current_user):
    colleges = College.query.all()
    return jsonify([c.to_dict() for c in colleges])

@admin_bp.route('/colleges', methods=['POST'])
@token_required
@role_required('super_admin')
def create_college(current_user):
    data = request.get_json()
    if not data or not data.get('name') or not data.get('code'):
        return jsonify({'error': 'Name and code are required'}), 400
    if College.query.filter_by(code=data['code'].upper()).first():
        return jsonify({'error': 'College code already exists'}), 409
    college = College(name=data['name'], code=data['code'].upper(), address=data.get('address', ''))
    db.session.add(college)
    db.session.commit()
    return jsonify(college.to_dict()), 201

@admin_bp.route('/colleges/<int:college_id>', methods=['PUT'])
@token_required
@role_required('super_admin')
def update_college(current_user, college_id):
    college = db.session.get(College, college_id)
    if not college:
        return jsonify({'error': 'College not found'}), 404
    data = request.get_json()
    if data.get('name'):
        college.name = data['name']
    if data.get('code'):
        college.code = data['code'].upper()
    if data.get('address') is not None:
        college.address = data['address']
    db.session.commit()
    return jsonify(college.to_dict())

@admin_bp.route('/colleges/<int:college_id>', methods=['DELETE'])
@token_required
@role_required('super_admin')
def delete_college(current_user, college_id):
    college = db.session.get(College, college_id)
    if not college:
        return jsonify({'error': 'College not found'}), 404
    db.session.delete(college)
    db.session.commit()
    return jsonify({'message': 'College deleted'})

# ── Branches CRUD ─────────────────────────────────────
@admin_bp.route('/branches', methods=['GET'])
@token_required
@role_required('super_admin')
def get_branches(current_user):
    branches = Branch.query.all()
    return jsonify([b.to_dict() for b in branches])

@admin_bp.route('/branches', methods=['POST'])
@token_required
@role_required('super_admin')
def create_branch(current_user):
    data = request.get_json()
    if not data or not data.get('name') or not data.get('code') or not data.get('college_id'):
        return jsonify({'error': 'Name, code, and college_id are required'}), 400
    branch = Branch(name=data['name'], code=data['code'].upper(), college_id=data['college_id'])
    db.session.add(branch)
    db.session.commit()
    return jsonify(branch.to_dict()), 201

@admin_bp.route('/branches/<int:branch_id>', methods=['DELETE'])
@token_required
@role_required('super_admin')
def delete_branch(current_user, branch_id):
    branch = db.session.get(Branch, branch_id)
    if not branch:
        return jsonify({'error': 'Branch not found'}), 404
    db.session.delete(branch)
    db.session.commit()
    return jsonify({'message': 'Branch deleted'})

# ── Dept Admins CRUD ──────────────────────────────────
@admin_bp.route('/dept-admins', methods=['GET'])
@token_required
@role_required('super_admin')
def get_dept_admins(current_user):
    admins = User.query.filter_by(role='dept_admin').all()
    return jsonify([a.to_dict() for a in admins])

@admin_bp.route('/dept-admins', methods=['POST'])
@token_required
@role_required('super_admin')
def create_dept_admin(current_user):
    data = request.get_json()
    required = ['name', 'email', 'password', 'college_id', 'branch_id']
    if not data or not all(data.get(f) for f in required):
        return jsonify({'error': 'name, email, password, college_id, branch_id are required'}), 400
    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'error': 'Email already exists'}), 409
    hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    user = User(
        name=data['name'], email=data['email'].lower(), password_hash=hashed.decode('utf-8'),
        role='dept_admin', college_id=data['college_id'], branch_id=data['branch_id'],
        phone=data.get('phone', ''),
    )
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201

@admin_bp.route('/dept-admins/<int:user_id>', methods=['DELETE'])
@token_required
@role_required('super_admin')
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
@role_required('super_admin')
def get_all_users(current_user):
    role = request.args.get('role')
    query = User.query
    if role:
        query = query.filter_by(role=role)
    users = query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])
