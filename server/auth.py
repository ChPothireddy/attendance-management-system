from functools import wraps
from flask import Blueprint, request, jsonify, current_app
from models import db, User
import bcrypt
import jwt
import datetime

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# ── Helpers ────────────────────────────────────────────
def generate_token(user):
    payload = {
        'user_id': user.id,
        'role': user.role,
        'exp': datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            hours=current_app.config['JWT_EXPIRATION_HOURS']
        ),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split(' ')
            if len(parts) == 2 and parts[0] == 'Bearer':
                token = parts[1]
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = db.session.get(User, data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if current_user.role not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator

# ── Routes ─────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=data['email'].lower().strip()).first()
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401

    if not bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_token(user)
    return jsonify({
        'token': token,
        'user': user.to_dict(),
    })

@auth_bp.route('/me', methods=['GET'])
@token_required
def me(current_user):
    return jsonify({'user': current_user.to_dict()})

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json()
    if not data or not data.get('old_password') or not data.get('new_password'):
        return jsonify({'error': 'Old and new password are required'}), 400

    if not bcrypt.checkpw(data['old_password'].encode('utf-8'), current_user.password_hash.encode('utf-8')):
        return jsonify({'error': 'Incorrect old password'}), 400

    hashed = bcrypt.hashpw(data['new_password'].encode('utf-8'), bcrypt.gensalt())
    current_user.password_hash = hashed.decode('utf-8')
    db.session.commit()
    return jsonify({'message': 'Password changed successfully'})
