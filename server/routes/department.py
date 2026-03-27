from flask import Blueprint, request, jsonify
from models import db, User, Section, Batch, BatchSection, Faculty, FacultyBatchSection, Student, Department, AttendanceSession, AttendanceRecord, Subject, Semester, Program, Mark
from auth import hash_password, normalize_email, token_required, role_required

dept_bp = Blueprint('department', __name__, url_prefix='/api/department')


def sync_batch_active_semester(batch_id, semester_no):
    Semester.query.filter_by(batch_id=batch_id).update({'is_active': False})
    active_semester = Semester.query.filter_by(batch_id=batch_id, semester_no=semester_no).first()
    if not active_semester:
        active_semester = Semester(batch_id=batch_id, semester_no=semester_no, is_active=True)
        db.session.add(active_semester)
    else:
        active_semester.is_active = True
    return active_semester

@dept_bp.route('/batches', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_batches(current_user):
    batches = (
        Batch.query
        .filter_by(dept_id=current_user.dept_id)
        .order_by(Batch.batch_name.desc(), Batch.batch_id.asc())
        .all()
    )
    result = []
    for batch in batches:
        program = db.session.get(Program, batch.program_id)
        active_semester = Semester.query.filter_by(batch_id=batch.batch_id, is_active=True).first()
        result.append({
            'id': batch.batch_id,
            'name': batch.batch_name,
            'program_id': batch.program_id,
            'program_name': program.program_name if program else None,
            'current_semester': active_semester.semester_no if active_semester else None,
        })
    return jsonify(result)

@dept_bp.route('/batches', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_batch(current_user):
    data = request.get_json()
    required = ['name', 'program_id']
    if not data or not all(data.get(k) for k in required):
        return jsonify({'error': 'name and program_id are required'}), 400
    if Batch.query.filter_by(batch_name=data['name'], dept_id=current_user.dept_id).first():
        return jsonify({'error': 'Batch name already exists in this department'}), 409
    batch = Batch(batch_name=data['name'], dept_id=current_user.dept_id, program_id=data['program_id'])
    db.session.add(batch)
    db.session.flush()
    program = db.session.get(Program, batch.program_id)
    duration = program.duration_semesters if program else 8
    for semester_no in range(1, duration + 1):
        db.session.add(Semester(batch_id=batch.batch_id, semester_no=semester_no, is_active=(semester_no == 1)))
    db.session.commit()
    return jsonify({'id': batch.batch_id, 'name': batch.batch_name}), 201

@dept_bp.route('/programs', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_programs(current_user):
    return jsonify([{'id': p.program_id, 'name': p.program_name, 'duration_semesters': p.duration_semesters} for p in Program.query.all()])

@dept_bp.route('/stats', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_stats(current_user):
    section_count = Section.query.filter_by(dept_id=current_user.dept_id).count()
    subject_count = Subject.query.filter_by(dept_id=current_user.dept_id).count()
    faculty_count = Faculty.query.filter_by(dept_id=current_user.dept_id).count()
    student_count = Student.query.filter_by(dept_id=current_user.dept_id).count()
    allocation_count = FacultyBatchSection.query.join(Faculty, FacultyBatchSection.faculty_id == Faculty.faculty_id).filter(Faculty.dept_id == current_user.dept_id).count()
    return jsonify({
        'sections': section_count,
        'subjects': subject_count,
        'faculty': faculty_count,
        'students': student_count,
        'allocations': allocation_count,
    })

# ── Sections CRUD ─────────────────────────────────────
@dept_bp.route('/sections', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_sections(current_user):
    # Group sections by batch for batch-level view
    batches = Batch.query.filter_by(dept_id=current_user.dept_id).all()
    result = []
    for batch in batches:
        sections = Section.query.filter_by(batch_id=batch.batch_id, dept_id=current_user.dept_id).all()
        if sections:
            result.append({
                'batch_id': batch.batch_id,
                'batch_name': batch.batch_name,
                'section_count': len(sections),
                'sections': [{'id': s.section_id, 'name': s.section_name, 'current_semester': s.current_semester} for s in sections],
                'current_semester': sections[0].current_semester if sections else 1,
            })
    return jsonify(result)

@dept_bp.route('/sections', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_section(current_user):
    data = request.get_json()
    if not data or not data.get('name') or not data.get('batch_id'):
        return jsonify({'error': 'Name and batch_id are required'}), 400
    # Check if section name already exists in this batch
    existing = Section.query.filter_by(section_name=data['name'], batch_id=data['batch_id']).first()
    if existing:
        return jsonify({'error': 'Section already exists in this batch'}), 409
    batch = db.session.get(Batch, data['batch_id'])
    if not batch or batch.dept_id != current_user.dept_id:
        return jsonify({'error': 'Invalid batch'}), 400
    section = Section(
        section_name=data['name'],
        current_semester=data.get('current_semester', 1),
        batch_id=data['batch_id'],
        dept_id=current_user.dept_id
    )
    db.session.add(section)
    sync_batch_active_semester(section.batch_id, section.current_semester or 1)
    db.session.commit()
    result = section.to_dict()
    result['batch_name'] = batch.batch_name if batch else None
    return jsonify(result), 201

@dept_bp.route('/sections/<int:section_id>', methods=['PUT'])
@token_required
@role_required('DEPT_ADMIN')
def update_section(current_user, section_id):
    section = db.session.get(Section, section_id)
    if not section or section.dept_id != current_user.dept_id:
        return jsonify({'error': 'Section not found'}), 404
    data = request.get_json()
    if data.get('current_semester') is not None:
        section.current_semester = data['current_semester']
    if data.get('batch_id') is not None:
        # Check if new batch_id is in same dept
        batch = db.session.get(Batch, data['batch_id'])
        if not batch or batch.dept_id != current_user.dept_id:
            return jsonify({'error': 'Invalid batch'}), 400
        section.batch_id = data['batch_id']
    sync_batch_active_semester(section.batch_id, section.current_semester or 1)
    db.session.commit()
    batch = db.session.get(Batch, section.batch_id)
    result = section.to_dict()
    result['batch_name'] = batch.batch_name if batch else None
    return jsonify(result)

@dept_bp.route('/sections/<int:section_id>', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_section(current_user, section_id):
    section = db.session.get(Section, section_id)
    if not section or section.dept_id != current_user.dept_id:
        return jsonify({'error': 'Section not found'}), 404
    db.session.delete(section)
    db.session.commit()
    return jsonify({'message': 'Section deleted'})

@dept_bp.route('/sections/flat', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_sections_flat(current_user):
    # Return flat list of sections for components that need individual sections
    sections = Section.query.filter_by(dept_id=current_user.dept_id).all()
    result = []
    for section in sections:
        batch = db.session.get(Batch, section.batch_id)
        result.append({
            'id': section.section_id,
            'name': section.section_name,
            'batch_id': section.batch_id,
            'batch_name': batch.batch_name if batch else None,
            'current_semester': section.current_semester,
            'dept_id': section.dept_id,
        })
    return jsonify(result)

@dept_bp.route('/batches/<int:batch_id>/sections', methods=['PUT'])
@token_required
@role_required('DEPT_ADMIN')
def update_batch_sections(current_user, batch_id):
    """Update semester for all sections in a batch"""
    batch = db.session.get(Batch, batch_id)
    if not batch or batch.dept_id != current_user.dept_id:
        return jsonify({'error': 'Batch not found'}), 404
    data = request.get_json()
    if not data or not data.get('current_semester'):
        return jsonify({'error': 'current_semester is required'}), 400
    sections = Section.query.filter_by(batch_id=batch_id, dept_id=current_user.dept_id).all()
    for s in sections:
        s.current_semester = data['current_semester']
    sync_batch_active_semester(batch_id, data['current_semester'])
    db.session.commit()
    return jsonify({'message': f'Updated {len(sections)} sections', 'count': len(sections)})

@dept_bp.route('/batches/<int:batch_id>/sections', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_batch_sections(current_user, batch_id):
    """Delete all sections in a batch"""
    batch = db.session.get(Batch, batch_id)
    if not batch or batch.dept_id != current_user.dept_id:
        return jsonify({'error': 'Batch not found'}), 404
    sections = Section.query.filter_by(batch_id=batch_id, dept_id=current_user.dept_id).all()
    count = len(sections)
    for s in sections:
        db.session.delete(s)
    db.session.commit()
    return jsonify({'message': f'Deleted {count} sections', 'count': count})

@dept_bp.route('/subjects', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_subjects(current_user):
    query = Subject.query.filter_by(dept_id=current_user.dept_id)
    semester = request.args.get('semester')
    if semester:
        try:
            semester = int(semester)
            query = query.filter_by(semester=semester)
        except ValueError:
            pass
    subjects = query.order_by(Subject.semester.asc(), Subject.subject_code.asc()).all()
    return jsonify([{
        'code': s.subject_code,
        'name': s.subject_name,
        'semester': s.semester,
        'credits': s.credits,
    } for s in subjects])

@dept_bp.route('/subjects', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_subject(current_user):
    data = request.get_json()
    required = ['code', 'name', 'semester', 'credits']
    if not data or not all(data.get(k) for k in required):
        return jsonify({'error': 'code, name, semester, credits are required'}), 400
    code = data['code'].strip().upper()
    if db.session.get(Subject, code):
        return jsonify({'error': 'Subject code already exists'}), 409
    subject = Subject(subject_code=code, subject_name=data['name'], semester=data['semester'], credits=data['credits'], dept_id=current_user.dept_id)
    db.session.add(subject)
    db.session.commit()
    return jsonify({'subject_code': subject.subject_code, 'subject_name': subject.subject_name, 'semester': subject.semester, 'credits': subject.credits}), 201

@dept_bp.route('/subjects/<subject_code>', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_subject(current_user, subject_code):
    subject = db.session.get(Subject, subject_code)
    if not subject or subject.dept_id != current_user.dept_id:
        return jsonify({'error': 'Subject not found'}), 404
    db.session.delete(subject)
    db.session.commit()
    return jsonify({'message': 'Subject deleted'})

# ── Faculty Management ────────────────────────────────
@dept_bp.route('/faculty', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_faculty(current_user):
    faculty_list = []
    for f in Faculty.query.filter_by(dept_id=current_user.dept_id).all():
        user = db.session.get(User, f.user_id)
        allocations = FacultyBatchSection.query.filter_by(faculty_id=f.faculty_id).all()
        # Format allocations as Section-Subject (e.g., A1-CS301)
        formatted_allocs = []
        for a in allocations:
            section = db.session.get(Section, a.section_id)
            section_name = section.section_name if section else 'Unknown'
            formatted_allocs.append({
                'batch_id': a.batch_id,
                'section_id': a.section_id,
                'section_name': section_name,
                'subject_code': a.subject_code,
                'display': f'{section_name}{a.batch_id}-{a.subject_code}',  # e.g., A1-CS301
            })
        faculty_list.append({
            'id': f.faculty_id,
            'name': user.name if user else None,
            'email': user.email if user else None,
            'phone': user.phone if user else None,
            'dept_id': f.dept_id,
            'allocations': formatted_allocs,
        })
    return jsonify(faculty_list)

@dept_bp.route('/faculty', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_faculty(current_user):
    data = request.get_json()
    required = ['name', 'email', 'password']
    if not data or not all(data.get(k) for k in required):
        return jsonify({'error': 'name, email, password are required'}), 400
    email = normalize_email(data['email'])
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409
    user = User(name=data['name'], email=email, password_hash=hash_password(data['password']), phone=data.get('phone'), role='FACULTY', dept_id=current_user.dept_id, college_id=current_user.college_id)
    db.session.add(user)
    db.session.flush()
    faculty = Faculty(user_id=user.user_id, dept_id=current_user.dept_id)
    db.session.add(faculty)
    db.session.commit()
    return jsonify({'id': faculty.faculty_id, 'name': user.name, 'email': user.email, 'phone': user.phone, 'dept_id': faculty.dept_id}), 201

@dept_bp.route('/faculty/<int:faculty_id>', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_faculty(current_user, faculty_id):
    faculty = db.session.get(Faculty, faculty_id)
    if not faculty or faculty.dept_id != current_user.dept_id:
        return jsonify({'error': 'Faculty not found'}), 404
    user = db.session.get(User, faculty.user_id)
    FacultyBatchSection.query.filter_by(faculty_id=faculty_id).delete()
    db.session.delete(faculty)
    if user:
        db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Faculty deleted'})

@dept_bp.route('/faculty/<int:faculty_id>/allocations', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def clear_faculty_allocations(current_user, faculty_id):
    faculty = db.session.get(Faculty, faculty_id)
    if not faculty or faculty.dept_id != current_user.dept_id:
        return jsonify({'error': 'Faculty not found'}), 404
    count = FacultyBatchSection.query.filter_by(faculty_id=faculty_id).delete()
    db.session.commit()
    return jsonify({'message': f'Cleared {count} allocations'})

@dept_bp.route('/faculty/<int:faculty_id>/timetable', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_faculty_timetable(current_user, faculty_id):
    allocations = FacultyBatchSection.query.filter_by(faculty_id=faculty_id).all()
    output = []
    for a in allocations:
        section = db.session.get(Section, a.section_id)
        batch = db.session.get(Batch, a.batch_id)
        subject = db.session.get(Subject, a.subject_code)
        output.append({
            'batch_id': a.batch_id,
            'batch_name': batch.batch_name if batch else None,
            'section_id': a.section_id,
            'section_name': section.section_name if section else None,
            'subject_code': a.subject_code,
            'subject_name': subject.subject_name if subject else None,
        })
    return jsonify(output)

@dept_bp.route('/faculty/<int:faculty_id>/allocations', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def assign_faculty_allocation(current_user, faculty_id):
    data = request.get_json()
    required = ['batch_id', 'section_id', 'subject_code']
    if not data or not all(data.get(k) for k in required):
        return jsonify({'error': 'batch_id, section_id, subject_code are required'}), 400

    # ensure faculty exists and belongs to department
    faculty = db.session.get(Faculty, faculty_id)
    if not faculty or faculty.dept_id != current_user.dept_id:
        return jsonify({'error': 'Faculty not found'}), 404

    # ensure batch/section belongs to department and section is in batch
    batch = db.session.get(Batch, data['batch_id'])
    section = db.session.get(Section, data['section_id'])
    if (not batch or batch.dept_id != current_user.dept_id or
        not section or section.dept_id != current_user.dept_id or
        section.batch_id != data['batch_id']):
        return jsonify({'error': 'Invalid batch or section'}), 400

    # subject from correct dept and semester
    subject = db.session.get(Subject, data['subject_code'])
    if not subject or subject.dept_id != current_user.dept_id:
        return jsonify({'error': 'Invalid subject'}), 400
    if subject.semester is not None and section.current_semester is not None and subject.semester != section.current_semester:
        return jsonify({'error': 'Subject semester does not match section semester'}), 400

    # avoid duplicate allocation
    if FacultyBatchSection.query.filter_by(faculty_id=faculty_id, batch_id=data['batch_id'], section_id=data['section_id'], subject_code=data['subject_code']).first():
        return jsonify({'error': 'Allocation exists'}), 409

    # limit at most 2 allocations per faculty per section
    allocation_count = FacultyBatchSection.query.filter_by(faculty_id=faculty_id, section_id=data['section_id']).count()
    if allocation_count >= 2:
        return jsonify({'error': 'Faculty can have at most 2 allocations in a section'}), 400

    alloc = FacultyBatchSection(faculty_id=faculty_id, batch_id=data['batch_id'], section_id=data['section_id'], subject_code=data['subject_code'])
    db.session.add(alloc)
    db.session.commit()
    return jsonify({'message': 'Allocation assigned'}), 201

@dept_bp.route('/allocations', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_allocations(current_user):
    allocs = FacultyBatchSection.query.join(Faculty, FacultyBatchSection.faculty_id == Faculty.faculty_id).filter(Faculty.dept_id == current_user.dept_id).all()
    data = []
    for a in allocs:
        faculty = db.session.get(Faculty, a.faculty_id)
        user = db.session.get(User, faculty.user_id) if faculty else None
        section = db.session.get(Section, a.section_id)
        batch = db.session.get(Batch, a.batch_id)
        subject = db.session.get(Subject, a.subject_code)
        data.append({
            'faculty_id': a.faculty_id,
            'faculty_name': user.name if user else None,
            'section_id': a.section_id,
            'section_name': section.section_name if section else None,
            'batch_id': a.batch_id,
            'batch_name': batch.batch_name if batch else None,
            'subject_code': a.subject_code,
            'subject_name': subject.subject_name if subject else None,
        })
    return jsonify(data)

@dept_bp.route('/allocations', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_allocation(current_user):
    data = request.get_json()
    required = ['faculty_id', 'batch_id', 'section_id', 'subject_code']
    if not data or not all(data.get(k) for k in required):
        return jsonify({'error': 'faculty_id, batch_id, section_id, subject_code are required'}), 400
    alloc = FacultyBatchSection.query.filter_by(faculty_id=data['faculty_id'], batch_id=data['batch_id'], section_id=data['section_id'], subject_code=data['subject_code']).first()
    if not alloc:
        return jsonify({'error': 'Allocation not found'}), 404
    db.session.delete(alloc)
    db.session.commit()
    return jsonify({'message': 'Allocation deleted'})

@dept_bp.route('/sections/<int:section_id>/timetable', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_section_timetable(current_user, section_id):
    allocations = FacultyBatchSection.query.filter_by(section_id=section_id).all()
    result = []
    for a in allocations:
        faculty = db.session.get(Faculty, a.faculty_id)
        user = db.session.get(User, faculty.user_id) if faculty else None
        subject = db.session.get(Subject, a.subject_code)
        result.append({
            'faculty_id': a.faculty_id,
            'faculty_name': user.name if user else None,
            'batch_id': a.batch_id,
            'subject_code': a.subject_code,
            'subject_name': subject.subject_name if subject else None,
        })
    return jsonify(result)

@dept_bp.route('/sections/<int:section_id>/faculty', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_section_faculty(current_user, section_id):
    allocations = FacultyBatchSection.query.filter_by(section_id=section_id).all()
    faculty_ids = {a.faculty_id for a in allocations}
    data = []
    for fid in faculty_ids:
        faculty = db.session.get(Faculty, fid)
        user = db.session.get(User, faculty.user_id) if faculty else None
        data.append({'faculty_id': fid, 'name': user.name if user else None})
    return jsonify(data)

# ── Student Management ────────────────────────────────
@dept_bp.route('/students', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_students(current_user):
    query = Student.query.filter_by(dept_id=current_user.dept_id).order_by(Student.batch_id.asc(), Student.section_id.asc(), Student.roll_no.asc())
    student_list = []
    for s in query.all():
        u = db.session.get(User, s.student_id)
        if not u:
            u = User.query.filter_by(email=s.email).first()
        section = db.session.get(Section, s.section_id)
        batch = db.session.get(Batch, s.batch_id)
        total = AttendanceRecord.query.filter_by(student_id=s.student_id).count()
        present = AttendanceRecord.query.filter_by(student_id=s.student_id, status='P').count()
        percent = round((present / total) * 100, 1) if total > 0 else 0
        marks = Mark.query.filter_by(student_id=s.student_id).all()
        total_obtained = sum(mark.obtained_marks for mark in marks)
        total_max = sum(mark.max_marks for mark in marks)
        marks_pct = round((total_obtained / total_max) * 100, 1) if total_max > 0 else 0
        student_list.append({
            'id': s.student_id,
            'roll_no': s.roll_no,
            'name': u.name if u else None,
            'email': s.email,
            'section_id': s.section_id,
            'section_name': section.section_name if section else None,
            'batch_id': s.batch_id,
            'batch_name': batch.batch_name if batch else None,
            'attendance_pct': percent,
            'marks': marks_pct,
        })
    return jsonify(student_list)

@dept_bp.route('/students', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def create_student(current_user):
    data = request.get_json()
    required = ['name', 'email', 'password', 'roll_no', 'batch_id', 'section_id']
    if not data or not all(data.get(k) for k in required):
        return jsonify({'error': 'name, email, password, roll_no, batch_id, section_id are required'}), 400
    # Ensure batch_id and section_id are integers
    try:
        batch_id = int(data['batch_id'])
        section_id = int(data['section_id'])
    except (ValueError, TypeError):
        return jsonify({'error': 'batch_id and section_id must be integers'}), 400
    # Check if batch and section are in the same dept
    batch = db.session.get(Batch, batch_id)
    section = db.session.get(Section, section_id)
    if not batch or batch.dept_id != current_user.dept_id:
        return jsonify({'error': 'Invalid batch'}), 400
    if not section or section.dept_id != current_user.dept_id:
        return jsonify({'error': 'Invalid section'}), 400
    if section.batch_id != batch_id:
        return jsonify({'error': 'Section does not belong to this batch'}), 400
    email = normalize_email(data['email'])
    roll_no = data['roll_no'].strip().upper()
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409
    if Student.query.filter_by(roll_no=roll_no, dept_id=current_user.dept_id).first():
        return jsonify({'error': 'Roll number already exists'}), 409
    phone = (data.get('phone') or '').strip()
    user = User(name=data['name'].strip(), email=email, password_hash=hash_password(data['password']), phone=phone, role='STUDENT', dept_id=current_user.dept_id, college_id=current_user.college_id)
    db.session.add(user)
    db.session.flush()
    student = Student(student_id=user.user_id, roll_no=roll_no, batch_id=batch_id, section_id=section_id, dept_id=current_user.dept_id, email=email, phone=phone)
    db.session.add(student)
    db.session.commit()
    return jsonify({'id': student.student_id, 'name': user.name, 'roll_no': student.roll_no}), 201

@dept_bp.route('/students/<int:student_id>', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_student(current_user, student_id):
    student = db.session.get(Student, student_id)
    if not student or student.dept_id != current_user.dept_id:
        return jsonify({'error': 'Student not found'}), 404
    user = db.session.get(User, student.student_id)
    db.session.delete(student)
    if user:
        db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'Student deleted'})

@dept_bp.route('/batches/<int:batch_id>/students', methods=['DELETE'])
@token_required
@role_required('DEPT_ADMIN')
def delete_batch_students(current_user, batch_id):
    """Delete all students in a batch"""
    batch = db.session.get(Batch, batch_id)
    if not batch or batch.dept_id != current_user.dept_id:
        return jsonify({'error': 'Batch not found'}), 404
    students = Student.query.filter_by(batch_id=batch_id, dept_id=current_user.dept_id).all()
    count = len(students)
    for student in students:
        user = db.session.get(User, student.student_id)
        db.session.delete(student)
        if user:
            db.session.delete(user)
    db.session.commit()
    return jsonify({'message': f'Deleted {count} students from batch', 'count': count})
