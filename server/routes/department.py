import io
from collections import Counter, defaultdict

from flask import Blueprint, request, jsonify, make_response
from models import db, User, Section, Batch, BatchSection, Faculty, FacultyBatchSection, Student, Department, College, AttendanceSession, AttendanceRecord, Subject, Semester, Program, Mark, TimetableEntry
from auth import hash_password, normalize_email, token_required, role_required

dept_bp = Blueprint('department', __name__, url_prefix='/api/department')

TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
TIMETABLE_SLOTS = [
    '09:00-09:50',
    '09:50-10:40',
    '10:40-11:30',
    '11:30-12:20',
    '01:30-02:20',
    '02:20-03:10',
]
NON_TEACHING_LABELS = [
    'Library',
    'Tutorial',
    'Mentoring',
    'Sports',
    'Placement Prep',
    'Project Work',
    'Seminar',
    'Club Activity',
]



def escape_pdf_text(value):
    return (
        str(value)
        .replace('\\', '\\\\')
        .replace('(', '\\(')
        .replace(')', '\\)')
    )


def build_pdf_document(page_stream, page_width=842, page_height=595):
    pdf = bytearray(b'%PDF-1.4\n')
    offsets = []

    def add_object(obj_id, content_bytes):
        offsets.append(len(pdf))
        pdf.extend(f'{obj_id} 0 obj\n'.encode('latin-1'))
        pdf.extend(content_bytes)
        pdf.extend(b'\nendobj\n')

    add_object(1, b'<< /Type /Catalog /Pages 2 0 R >>')
    add_object(2, b'<< /Type /Pages /Count 1 /Kids [5 0 R] >>')
    add_object(3, b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
    add_object(4, b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')
    add_object(
        5,
        (
            f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_width} {page_height}] '
            f'/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>'
        ).encode('latin-1')
    )
    stream = page_stream.encode('latin-1', errors='replace')
    stream_object = b'<< /Length ' + str(len(stream)).encode('latin-1') + b' >>\nstream\n' + stream + b'\nendstream'
    add_object(6, stream_object)

    xref_offset = len(pdf)
    pdf.extend(f'xref\n0 {len(offsets) + 1}\n'.encode('latin-1'))
    pdf.extend(b'0000000000 65535 f \n')
    for offset in offsets:
        pdf.extend(f'{offset:010d} 00000 n \n'.encode('latin-1'))
    pdf.extend(
        (
            f'trailer\n<< /Size {len(offsets) + 1} /Root 1 0 R >>\n'
            f'startxref\n{xref_offset}\n%%EOF'
        ).encode('latin-1')
    )
    return bytes(pdf)


def build_pdf_text(x, y, text, font='F1', size=10):
    escaped = escape_pdf_text(text)
    return f'0 g 0 G BT /{font} {size} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({escaped}) Tj ET'


def build_pdf_centered_text(x, y, width, text, font='F1', size=10):
    approx_width = len(str(text)) * size * 0.5
    start_x = x + max(0, (width - approx_width) / 2)
    return build_pdf_text(start_x, y, text, font=font, size=size)


def build_pdf_rect(x, y, width, height, fill_gray=None, stroke_gray=0):
    commands = []
    if fill_gray is not None:
        commands.append(f'{fill_gray:.2f} g {x:.2f} {y:.2f} {width:.2f} {height:.2f} re f')
    commands.append(f'{stroke_gray:.2f} G {x:.2f} {y:.2f} {width:.2f} {height:.2f} re S')
    return '\n'.join(commands)


def truncate_text(text, max_chars):
    value = str(text)
    return value if len(value) <= max_chars else value[:max_chars - 3] + '...'


def build_timetable_pdf(section, entries):
    department = db.session.get(Department, section.dept_id)
    college = db.session.get(College, department.college_id) if department and department.college_id else None
    batch = db.session.get(Batch, section.batch_id)
    entry_map = {(entry.day_order, entry.slot_index): entry for entry in entries}
    unique_subjects = []
    seen_subjects = set()
    for entry in entries:
        if entry.subject_code in seen_subjects:
            continue
        seen_subjects.add(entry.subject_code)
        unique_subjects.append((entry.subject_code, entry.subject_name or '-', entry.faculty_name or '-'))

    page_width = 842
    page_height = 595
    margin = 28
    content_width = page_width - (margin * 2)
    top_y = page_height - margin
    commands = ['1.10 w', '0 g', '0 G']

    commands.append(build_pdf_rect(margin - 6, margin - 6, content_width + 12, page_height - (margin * 2) + 12))

    commands.append(build_pdf_rect(margin, top_y - 24, content_width, 18, fill_gray=0.80))
    commands.append(build_pdf_centered_text(margin, top_y - 18, content_width, f'DEPARTMENT OF {department.dept_name.upper() if department else "ACADEMICS"}', font='F2', size=11))
    commands.append(build_pdf_centered_text(margin, top_y - 38, content_width, (college.college_name if college else 'Attendance Management System').upper(), font='F2', size=11))
    commands.append(build_pdf_centered_text(margin, top_y - 58, content_width, 'HANDOUT TIMETABLE', font='F2', size=11))

    meta_top = top_y - 78
    meta_height = 34
    meta_cols = [content_width * 0.38, content_width * 0.18, content_width * 0.18, content_width * 0.26]
    meta_labels = [
        f'BATCH: {batch.batch_name if batch else "-"}',
        f'SEM: {section.current_semester}',
        f'SEC: {section.section_name}',
        f'DEPT: {department.dept_name if department else "-"}',
    ]
    current_x = margin
    for width, label in zip(meta_cols, meta_labels):
        commands.append(build_pdf_rect(current_x, meta_top - meta_height, width, meta_height))
        commands.append(build_pdf_centered_text(current_x, meta_top - 21, width, label, font='F2', size=9))
        current_x += width

    table_top = meta_top - 46
    day_width = 58
    slot_width = 92
    lunch_width = 34
    header_height = 34
    row_height = 30
    day_x = margin
    time_x = day_x + day_width
    lunch_x = time_x + (slot_width * 4)

    commands.append(build_pdf_rect(day_x, table_top - header_height, day_width, header_height, fill_gray=0.84))
    commands.append(build_pdf_centered_text(day_x, table_top - 20, day_width, 'DAY', font='F2', size=9))

    for slot_index in range(4):
        x = time_x + (slot_index * slot_width)
        commands.append(build_pdf_rect(x, table_top - header_height, slot_width, header_height, fill_gray=0.84))
        commands.append(build_pdf_centered_text(x, table_top - 18, slot_width, TIMETABLE_SLOTS[slot_index], font='F2', size=8))

    commands.append(build_pdf_rect(lunch_x, table_top - header_height - (len(TIMETABLE_DAYS) * row_height), lunch_width, header_height + (len(TIMETABLE_DAYS) * row_height), fill_gray=0.88))
    lunch_letters = list('LUNCH BREAK')
    for index, letter in enumerate(lunch_letters):
        y = table_top - 18 - (index * 14)
        commands.append(build_pdf_centered_text(lunch_x, y, lunch_width, letter, font='F2', size=8))

    after_lunch_x = lunch_x + lunch_width
    for slot_index in range(4, 6):
        x = after_lunch_x + ((slot_index - 4) * slot_width)
        commands.append(build_pdf_rect(x, table_top - header_height, slot_width, header_height, fill_gray=0.84))
        commands.append(build_pdf_centered_text(x, table_top - 18, slot_width, TIMETABLE_SLOTS[slot_index], font='F2', size=8))

    for day_order, day_name in enumerate(TIMETABLE_DAYS):
        row_top = table_top - header_height - (day_order * row_height)
        row_bottom = row_top - row_height
        commands.append(build_pdf_rect(day_x, row_bottom, day_width, row_height))
        commands.append(build_pdf_centered_text(day_x, row_bottom + 11, day_width, day_name[:3].upper(), font='F2', size=9))

        for slot_index in range(4):
            x = time_x + (slot_index * slot_width)
            commands.append(build_pdf_rect(x, row_bottom, slot_width, row_height))
            entry = entry_map.get((day_order, slot_index))
            if entry:
                commands.append(build_pdf_centered_text(x, row_bottom + 16, slot_width, truncate_text(entry.subject_code, 14), font='F2', size=8))
                commands.append(build_pdf_centered_text(x, row_bottom + 6, slot_width, truncate_text(entry.faculty_name or '-', 16), size=7))
            else:
                commands.append(build_pdf_centered_text(x, row_bottom + 11, slot_width, truncate_text(get_non_teaching_label(day_order, slot_index), 16), size=7))

        for slot_index in range(4, 6):
            x = after_lunch_x + ((slot_index - 4) * slot_width)
            commands.append(build_pdf_rect(x, row_bottom, slot_width, row_height))
            entry = entry_map.get((day_order, slot_index))
            if entry:
                commands.append(build_pdf_centered_text(x, row_bottom + 16, slot_width, truncate_text(entry.subject_code, 14), font='F2', size=8))
                commands.append(build_pdf_centered_text(x, row_bottom + 6, slot_width, truncate_text(entry.faculty_name or '-', 16), size=7))
            else:
                commands.append(build_pdf_centered_text(x, row_bottom + 11, slot_width, truncate_text(get_non_teaching_label(day_order, slot_index), 16), size=7))

    subjects_top = table_top - header_height - (len(TIMETABLE_DAYS) * row_height) - 18
    code_w = 90
    subject_w = 420
    faculty_w = content_width - code_w - subject_w
    subject_header_h = 24
    subject_row_h = 20
    commands.append(build_pdf_rect(margin, subjects_top - subject_header_h, code_w, subject_header_h, fill_gray=0.84))
    commands.append(build_pdf_rect(margin + code_w, subjects_top - subject_header_h, subject_w, subject_header_h, fill_gray=0.84))
    commands.append(build_pdf_rect(margin + code_w + subject_w, subjects_top - subject_header_h, faculty_w, subject_header_h, fill_gray=0.84))
    commands.append(build_pdf_centered_text(margin, subjects_top - 16, code_w, 'SUBJECT CODE', font='F2', size=9))
    commands.append(build_pdf_centered_text(margin + code_w, subjects_top - 16, subject_w, 'SUBJECT NAME', font='F2', size=9))
    commands.append(build_pdf_centered_text(margin + code_w + subject_w, subjects_top - 16, faculty_w, 'FACULTY NAME', font='F2', size=9))

    for row_index, (subject_code, subject_name, faculty_name) in enumerate(unique_subjects[:8]):
        row_top = subjects_top - subject_header_h - (row_index * subject_row_h)
        row_bottom = row_top - subject_row_h
        commands.append(build_pdf_rect(margin, row_bottom, code_w, subject_row_h))
        commands.append(build_pdf_rect(margin + code_w, row_bottom, subject_w, subject_row_h))
        commands.append(build_pdf_rect(margin + code_w + subject_w, row_bottom, faculty_w, subject_row_h))
        commands.append(build_pdf_text(margin + 6, row_bottom + 7, truncate_text(subject_code, 14), font='F2', size=8))
        commands.append(build_pdf_text(margin + code_w + 6, row_bottom + 7, truncate_text(subject_name, 52), size=8))
        commands.append(build_pdf_text(margin + code_w + subject_w + 6, row_bottom + 7, truncate_text(faculty_name, 24), size=8))

    footer_y = margin + 10
    commands.append(build_pdf_text(margin, footer_y, 'Generated from Attendance Management System', size=8))

    return build_pdf_document('\n'.join(commands), page_width=page_width, page_height=page_height)


def get_section_semester_subjects(dept_id, semester_no):
    return (
        Subject.query
        .filter_by(dept_id=dept_id, semester=semester_no)
        .order_by(Subject.subject_code.asc())
        .all()
    )


def get_section_subject_allocations(section):
    allocations = (
        FacultyBatchSection.query
        .filter_by(section_id=section.section_id, batch_id=section.batch_id)
        .all()
    )
    return {allocation.subject_code: allocation for allocation in allocations}


def get_weekly_class_target(subject_count):
    if subject_count <= 0:
        return 0
    return max(3, min(4, (len(TIMETABLE_DAYS) * len(TIMETABLE_SLOTS)) // subject_count))


def validate_section_timetable_readiness(section, dept_id):
    semester_subjects = get_section_semester_subjects(dept_id, section.current_semester)
    if not semester_subjects:
        return {
            'ready': False,
            'error': 'No subjects found for the current semester',
            'subjects': [],
            'allocations': {},
            'missing_subjects': [],
            'weekly_class_target': 0,
        }

    allocation_map = get_section_subject_allocations(section)
    missing_subjects = [subject.subject_code for subject in semester_subjects if subject.subject_code not in allocation_map]
    return {
        'ready': len(missing_subjects) == 0,
        'error': None if not missing_subjects else 'Allocate faculty for all semester subjects before generating the timetable',
        'subjects': semester_subjects,
        'allocations': allocation_map,
        'missing_subjects': missing_subjects,
        'weekly_class_target': get_weekly_class_target(len(semester_subjects)),
    }


def get_busy_faculty_slots(exclude_section_id=None):
    busy_slots = defaultdict(set)
    query = TimetableEntry.query
    if exclude_section_id is not None:
        query = query.filter(TimetableEntry.section_id != exclude_section_id)
    for entry in query.all():
        busy_slots[(entry.day_order, entry.slot_index)].add(entry.faculty_id)
    return busy_slots


def get_non_teaching_label(day_order, slot_index):
    return NON_TEACHING_LABELS[(day_order * len(TIMETABLE_SLOTS) + slot_index) % len(NON_TEACHING_LABELS)]


def build_timetable_grid(entries):
    entry_map = {(entry.day_order, entry.slot_index): entry for entry in entries}
    grid = []
    for day_order, day_name in enumerate(TIMETABLE_DAYS):
        row = {
            'day_order': day_order,
            'day_name': day_name,
            'slots': [],
        }
        for slot_index, slot_label in enumerate(TIMETABLE_SLOTS):
            entry = entry_map.get((day_order, slot_index))
            row['slots'].append({
                'day_order': day_order,
                'day_name': day_name,
                'slot_index': slot_index,
                'slot_label': slot_label,
                'subject_code': entry.subject_code if entry else None,
                'subject_name': getattr(entry, 'subject_name', None) if entry else None,
                'faculty_id': entry.faculty_id if entry else None,
                'faculty_name': getattr(entry, 'faculty_name', None) if entry else None,
                'activity_label': None if entry else get_non_teaching_label(day_order, slot_index),
            })
        grid.append(row)
    return grid


def enrich_timetable_entries(entries):
    enriched = []
    for entry in entries:
        subject = db.session.get(Subject, entry.subject_code)
        faculty = db.session.get(Faculty, entry.faculty_id)
        user = db.session.get(User, faculty.user_id) if faculty else None
        entry.subject_name = subject.subject_name if subject else None
        entry.faculty_name = user.name if user else None
        enriched.append(entry)
    return enriched


def generate_section_timetable(section, subjects, allocation_map):
    session_templates = []
    weekly_target = get_weekly_class_target(len(subjects))
    for subject in subjects:
        allocation = allocation_map[subject.subject_code]
        session_templates.extend([
            {
                'subject_code': subject.subject_code,
                'faculty_id': allocation.faculty_id,
            }
            for _ in range(weekly_target)
        ])

    faculty_load = Counter(item['faculty_id'] for item in session_templates)
    session_templates.sort(key=lambda item: (-faculty_load[item['faculty_id']], item['subject_code']))

    busy_slots = get_busy_faculty_slots(exclude_section_id=section.section_id)
    assigned_slots = {}
    faculty_day_usage = Counter()
    subject_day_usage = Counter()
    day_load = Counter()
    max_day_load = max(1, (len(session_templates) + len(TIMETABLE_DAYS) - 1) // len(TIMETABLE_DAYS))

    def candidate_slots(session):
        preferred = []
        fallback = []
        for day_order in range(len(TIMETABLE_DAYS)):
            for slot_index in range(len(TIMETABLE_SLOTS)):
                slot_key = (day_order, slot_index)
                if slot_key in assigned_slots:
                    continue
                if session['faculty_id'] in busy_slots.get(slot_key, set()):
                    continue
                ranking = (
                    day_load[day_order] >= max_day_load,
                    subject_day_usage[(session['subject_code'], day_order)] > 0,
                    faculty_day_usage[(session['faculty_id'], day_order)],
                    day_load[day_order],
                    slot_index,
                )
                if subject_day_usage[(session['subject_code'], day_order)] == 0:
                    preferred.append((ranking, slot_key))
                else:
                    fallback.append((ranking, slot_key))
        ordered = preferred or fallback
        ordered.sort(key=lambda item: item[0])
        return [slot_key for _, slot_key in ordered]

    def backtrack(index):
        if index == len(session_templates):
            return True
        session = session_templates[index]
        for day_order, slot_index in candidate_slots(session):
            assigned_slots[(day_order, slot_index)] = session
            faculty_day_usage[(session['faculty_id'], day_order)] += 1
            subject_day_usage[(session['subject_code'], day_order)] += 1
            day_load[day_order] += 1
            if backtrack(index + 1):
                return True
            del assigned_slots[(day_order, slot_index)]
            faculty_day_usage[(session['faculty_id'], day_order)] -= 1
            subject_day_usage[(session['subject_code'], day_order)] -= 1
            day_load[day_order] -= 1
        return False

    if not backtrack(0):
        raise ValueError('Unable to generate a conflict-free timetable with the current faculty allocations')

    generated_entries = []
    for (day_order, slot_index), session in sorted(assigned_slots.items()):
        generated_entries.append(
            TimetableEntry(
                section_id=section.section_id,
                batch_id=section.batch_id,
                faculty_id=session['faculty_id'],
                subject_code=session['subject_code'],
                day_order=day_order,
                day_name=TIMETABLE_DAYS[day_order],
                slot_index=slot_index,
                slot_label=TIMETABLE_SLOTS[slot_index],
            )
        )
    return generated_entries, weekly_target


def save_section_timetable(section, subjects, allocation_map, raw_entries):
    weekly_target = get_weekly_class_target(len(subjects))
    subject_codes = {subject.subject_code for subject in subjects}
    busy_slots = get_busy_faculty_slots(exclude_section_id=section.section_id)
    seen_slots = set()
    subject_counts = Counter()
    prepared_entries = []

    for item in raw_entries:
        subject_code = (item.get('subject_code') or '').strip().upper()
        if not subject_code:
            continue
        day_order = item.get('day_order')
        slot_index = item.get('slot_index')
        if day_order is None or slot_index is None:
            raise ValueError('Each timetable entry must include day_order and slot_index')
        try:
            day_order = int(day_order)
            slot_index = int(slot_index)
        except (TypeError, ValueError):
            raise ValueError('Invalid timetable slot coordinates')
        if day_order < 0 or day_order >= len(TIMETABLE_DAYS) or slot_index < 0 or slot_index >= len(TIMETABLE_SLOTS):
            raise ValueError('Timetable slot is out of range')
        if subject_code not in subject_codes:
            raise ValueError(f'{subject_code} is not a valid subject for this section')
        if subject_code not in allocation_map:
            raise ValueError(f'{subject_code} is not allocated to any faculty for this section')
        slot_key = (day_order, slot_index)
        if slot_key in seen_slots:
            raise ValueError('A timetable slot cannot contain more than one subject')
        faculty_id = allocation_map[subject_code].faculty_id
        if faculty_id in busy_slots.get(slot_key, set()):
            raise ValueError(f'Faculty conflict detected for {subject_code} on {TIMETABLE_DAYS[day_order]} {TIMETABLE_SLOTS[slot_index]}')
        seen_slots.add(slot_key)
        subject_counts[subject_code] += 1
        prepared_entries.append(
            TimetableEntry(
                section_id=section.section_id,
                batch_id=section.batch_id,
                faculty_id=faculty_id,
                subject_code=subject_code,
                day_order=day_order,
                day_name=TIMETABLE_DAYS[day_order],
                slot_index=slot_index,
                slot_label=TIMETABLE_SLOTS[slot_index],
            )
        )

    expected_counts = {subject.subject_code: weekly_target for subject in subjects}
    if dict(subject_counts) != expected_counts:
        raise ValueError(f'Each subject must appear exactly {weekly_target} times in the timetable')

    TimetableEntry.query.filter_by(section_id=section.section_id).delete()
    db.session.add_all(prepared_entries)
    return weekly_target


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
    TimetableEntry.query.filter_by(section_id=section.section_id).delete()
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
        TimetableEntry.query.filter_by(section_id=s.section_id).delete()
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
    impacted_section_ids = [alloc.section_id for alloc in FacultyBatchSection.query.filter_by(faculty_id=faculty_id).all()]
    count = FacultyBatchSection.query.filter_by(faculty_id=faculty_id).delete()
    for section_id in impacted_section_ids:
        TimetableEntry.query.filter_by(section_id=section_id).delete()
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

    existing_allocation = FacultyBatchSection.query.filter_by(
        batch_id=data['batch_id'],
        section_id=data['section_id'],
        subject_code=data['subject_code'],
    ).first()
    if existing_allocation:
        if existing_allocation.faculty_id == faculty_id:
            return jsonify({'error': 'Allocation exists'}), 409
        return jsonify({'error': 'This subject is already allocated for the section. Delete it before reassigning faculty.'}), 409

    alloc = FacultyBatchSection(faculty_id=faculty_id, batch_id=data['batch_id'], section_id=data['section_id'], subject_code=data['subject_code'])
    db.session.add(alloc)
    TimetableEntry.query.filter_by(section_id=data['section_id']).delete()
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
    TimetableEntry.query.filter_by(section_id=data['section_id']).delete()
    db.session.commit()
    return jsonify({'message': 'Allocation deleted'})


@dept_bp.route('/allocations', methods=['PUT'])
@token_required
@role_required('DEPT_ADMIN')
def reassign_allocation(current_user):
    data = request.get_json()
    required = ['faculty_id', 'batch_id', 'section_id', 'subject_code']
    if not data or not all(data.get(k) for k in required):
        return jsonify({'error': 'faculty_id, batch_id, section_id, subject_code are required'}), 400

    faculty = db.session.get(Faculty, data['faculty_id'])
    if not faculty or faculty.dept_id != current_user.dept_id:
        return jsonify({'error': 'Faculty not found'}), 404

    batch = db.session.get(Batch, data['batch_id'])
    section = db.session.get(Section, data['section_id'])
    if (not batch or batch.dept_id != current_user.dept_id or
        not section or section.dept_id != current_user.dept_id or
        section.batch_id != data['batch_id']):
        return jsonify({'error': 'Invalid batch or section'}), 400

    subject = db.session.get(Subject, data['subject_code'])
    if not subject or subject.dept_id != current_user.dept_id:
        return jsonify({'error': 'Invalid subject'}), 400

    allocation = FacultyBatchSection.query.filter_by(
        batch_id=data['batch_id'],
        section_id=data['section_id'],
        subject_code=data['subject_code'],
    ).first()
    if not allocation:
        return jsonify({'error': 'Allocation not found'}), 404

    if allocation.faculty_id == data['faculty_id']:
        return jsonify({'message': 'Allocation already assigned to this faculty'})

    db.session.delete(allocation)
    db.session.flush()
    db.session.add(FacultyBatchSection(
        faculty_id=data['faculty_id'],
        batch_id=data['batch_id'],
        section_id=data['section_id'],
        subject_code=data['subject_code'],
    ))
    TimetableEntry.query.filter_by(section_id=data['section_id']).delete()
    db.session.commit()
    return jsonify({'message': 'Allocation reassigned successfully'})

@dept_bp.route('/sections/<int:section_id>/timetable', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def get_section_timetable(current_user, section_id):
    section = db.session.get(Section, section_id)
    if not section or section.dept_id != current_user.dept_id:
        return jsonify({'error': 'Section not found'}), 404

    readiness = validate_section_timetable_readiness(section, current_user.dept_id)
    entries = enrich_timetable_entries(
        TimetableEntry.query
        .filter_by(section_id=section.section_id)
        .order_by(TimetableEntry.day_order.asc(), TimetableEntry.slot_index.asc())
        .all()
    )
    allocation_details = []
    for subject in readiness['subjects']:
        allocation = readiness['allocations'].get(subject.subject_code)
        faculty = db.session.get(Faculty, allocation.faculty_id) if allocation else None
        user = db.session.get(User, faculty.user_id) if faculty else None
        allocation_details.append({
            'subject_code': subject.subject_code,
            'subject_name': subject.subject_name,
            'faculty_id': allocation.faculty_id if allocation else None,
            'faculty_name': user.name if user else None,
        })

    return jsonify({
        'generated': len(entries) > 0,
        'can_generate': readiness['ready'],
        'message': readiness['error'],
        'missing_subjects': readiness['missing_subjects'],
        'weekly_class_target': readiness['weekly_class_target'],
        'allocated_subjects': allocation_details,
        'grid': build_timetable_grid(entries),
    })


@dept_bp.route('/sections/<int:section_id>/timetable/generate', methods=['POST'])
@token_required
@role_required('DEPT_ADMIN')
def generate_timetable(current_user, section_id):
    section = db.session.get(Section, section_id)
    if not section or section.dept_id != current_user.dept_id:
        return jsonify({'error': 'Section not found'}), 404

    readiness = validate_section_timetable_readiness(section, current_user.dept_id)
    if not readiness['ready']:
        return jsonify({'error': readiness['error'], 'missing_subjects': readiness['missing_subjects']}), 400

    TimetableEntry.query.filter_by(section_id=section.section_id).delete()
    try:
        generated_entries, weekly_target = generate_section_timetable(section, readiness['subjects'], readiness['allocations'])
    except ValueError as exc:
        db.session.rollback()
        return jsonify({'error': str(exc)}), 400

    db.session.add_all(generated_entries)
    db.session.commit()
    return jsonify({'message': 'Timetable generated successfully', 'weekly_class_target': weekly_target}), 201


@dept_bp.route('/sections/<int:section_id>/timetable', methods=['PUT'])
@token_required
@role_required('DEPT_ADMIN')
def update_section_timetable(current_user, section_id):
    section = db.session.get(Section, section_id)
    if not section or section.dept_id != current_user.dept_id:
        return jsonify({'error': 'Section not found'}), 404

    readiness = validate_section_timetable_readiness(section, current_user.dept_id)
    if not readiness['ready']:
        return jsonify({'error': readiness['error'], 'missing_subjects': readiness['missing_subjects']}), 400

    data = request.get_json() or {}
    entries = data.get('entries')
    if not isinstance(entries, list):
        return jsonify({'error': 'entries must be provided as a list'}), 400

    try:
        weekly_target = save_section_timetable(section, readiness['subjects'], readiness['allocations'], entries)
        db.session.commit()
    except ValueError as exc:
        db.session.rollback()
        return jsonify({'error': str(exc)}), 400

    return jsonify({'message': 'Timetable updated successfully', 'weekly_class_target': weekly_target})


@dept_bp.route('/sections/<int:section_id>/timetable/download', methods=['GET'])
@token_required
@role_required('DEPT_ADMIN')
def download_section_timetable(current_user, section_id):
    section = db.session.get(Section, section_id)
    if not section or section.dept_id != current_user.dept_id:
        return jsonify({'error': 'Section not found'}), 404

    entries = enrich_timetable_entries(
        TimetableEntry.query
        .filter_by(section_id=section.section_id)
        .order_by(TimetableEntry.day_order.asc(), TimetableEntry.slot_index.asc())
        .all()
    )
    if not entries:
        return jsonify({'error': 'Timetable has not been generated yet'}), 404

    pdf_bytes = build_timetable_pdf(section, entries)
    response = make_response(pdf_bytes)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=section_{section.section_name}_{section.batch_id}_timetable.pdf'
    return response

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
