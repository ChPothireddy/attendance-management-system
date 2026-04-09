import argparse
<<<<<<< HEAD
import random
from datetime import date, timedelta
=======
>>>>>>> upstream/master
from pathlib import Path

from flask import Flask

from config import Config
<<<<<<< HEAD
from models import (
    db, College, Department, Program, Batch, Section, User, Faculty,
    Student, Subject, SectionSubjectFormat, FormatSubject,
    SectionSubjectAssignment, FacultyBatchSection, Semester,
    AttendanceSession, AttendanceRecord, Mark, TimetableEntry
)
from auth import hash_password


TIMETABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
TIMETABLE_SLOTS = [
    '09:00-10:40',
    '10:40-12:20',
    '01:30-03:10',
    '03:10-04:00',
]


=======
from models import db, College, Department, Program, Batch, Section, User, Faculty, Student, Subject, SectionSubjectFormat, FormatSubject, SectionSubjectAssignment
from auth import hash_password


>>>>>>> upstream/master
def reset_schema_only():
    app = Flask(__name__, instance_path=str(Path(__file__).resolve().parent / 'instance'))
    app.config.from_object(Config)
    db.init_app(app)
<<<<<<< HEAD
=======

>>>>>>> upstream/master
    with app.app_context():
        db.drop_all()
        db.create_all()
        print('Schema reset complete. No demo data inserted.')


def seed_demo_data(reset=False):
    app = Flask(__name__, instance_path=str(Path(__file__).resolve().parent / 'instance'))
    app.config.from_object(Config)
    db.init_app(app)

    with app.app_context():
        if reset:
            db.drop_all()
            db.create_all()
        else:
            db.create_all()
            if College.query.first():
<<<<<<< HEAD
                print('Database already has data. Skipping demo seed.')
                print('Run: python seed.py --reset-demo  to wipe and reseed')
                return

        random.seed(42)

        # ── College ──────────────────────────────────────────────────
        college = College(college_name='Sunrise University')
        db.session.add(college)
        db.session.flush()

        # ── Super Admin ──────────────────────────────────────────────
        super_admin = User(
            email='superadmin@demo.com', role='SUPER_ADMIN',
            password_hash=hash_password('superadmin123'),
            name='Super Admin', phone='9000000000',
            college_id=college.college_id,
        )
        db.session.add(super_admin)
        db.session.flush()

        # ── Program ──────────────────────────────────────────────────
        program = Program(program_name='B.Tech', duration_semesters=8)
        db.session.add(program)
        db.session.flush()

        # ── Department ───────────────────────────────────────────────
        dept = Department(dept_name='Computer Science', college_id=college.college_id)
        db.session.add(dept)
        db.session.flush()

        # ── Dept Admin ───────────────────────────────────────────────
        dept_admin_user = User(
            email='admin@demo.com', role='DEPT_ADMIN',
            password_hash=hash_password('admin123'),
            name='Dr. Rajesh Kumar', phone='9111111111',
            dept_id=dept.dept_id, college_id=college.college_id,
        )
        db.session.add(dept_admin_user)
        db.session.flush()

        # ── Batch ─────────────────────────────────────────────────────
        batch = Batch(batch_name='2023-2027', dept_id=dept.dept_id, program_id=program.program_id)
        db.session.add(batch)
        db.session.flush()

        # ── Semesters (activate sem 3) ─────────────────────────────────
        active_sem_no = 3
        semesters = {}
        for sem_no in range(1, 9):
            sem = Semester(
                batch_id=batch.batch_id,
                semester_no=sem_no,
                is_active=(sem_no == active_sem_no),
            )
            db.session.add(sem)
            db.session.flush()
            semesters[sem_no] = sem

        # ── Sections ──────────────────────────────────────────────────
        section_a = Section(
            section_name='A', batch_id=batch.batch_id,
            dept_id=dept.dept_id, program_id=program.program_id,
            current_semester=active_sem_no,
        )
        section_b = Section(
            section_name='B', batch_id=batch.batch_id,
            dept_id=dept.dept_id, program_id=program.program_id,
            current_semester=active_sem_no,
        )
        db.session.add_all([section_a, section_b])
        db.session.flush()

        # ── Subjects ──────────────────────────────────────────────────
        subjects_data = [
            {'code': 'CS201', 'name': 'Database Management Systems', 'type': 'Common',        'credits': 3.0, 'periods': 3},
            {'code': 'CS301', 'name': 'Operating Systems',           'type': 'Common',        'credits': 4.0, 'periods': 4},
            {'code': 'CS302', 'name': 'Machine Learning',            'type': 'Elective',      'credits': 3.0, 'periods': 3},
            {'code': 'CS303', 'name': 'Computer Networks',           'type': 'Elective',      'credits': 3.0, 'periods': 3},
            {'code': 'CS304', 'name': 'Software Engineering',        'type': 'Elective',      'credits': 3.0, 'periods': 3},
            {'code': 'OE101', 'name': 'Digital Marketing',           'type': 'Open Elective', 'credits': 2.0, 'periods': 2},
            {'code': 'OE102', 'name': 'Entrepreneurship',            'type': 'Open Elective', 'credits': 2.0, 'periods': 2},
        ]
        subjects = {}
        for s in subjects_data:
            subj = Subject(
                subject_code=s['code'], subject_name=s['name'],
                subject_type=s['type'], credits=s['credits'],
                periods=s['periods'], dept_id=dept.dept_id,
                batch_id=batch.batch_id, program_id=program.program_id,
                semester=active_sem_no,
            )
            db.session.add(subj)
            subjects[s['code']] = subj
        db.session.flush()

        # ── Subject Format ─────────────────────────────────────────────
        fmt = SectionSubjectFormat(batch_id=batch.batch_id, semester=active_sem_no)
        db.session.add(fmt)
        db.session.flush()

        for fi in [
            FormatSubject(format_id=fmt.id, subject_code='CS201', subject_type='Common',        mapped_subject_code='CS201'),
            FormatSubject(format_id=fmt.id, subject_code='CS301', subject_type='Common',        mapped_subject_code='CS301'),
            FormatSubject(format_id=fmt.id, subject_code='CS302', subject_type='Elective',      mapped_subject_code=None),
            FormatSubject(format_id=fmt.id, subject_code='OE101', subject_type='Open Elective', mapped_subject_code=None),
        ]:
            db.session.add(fi)
        db.session.flush()

        # ── Section Subject Assignments ────────────────────────────────
        # Section A: CS201, CS301, CS302, OE101
        # Section B: CS201, CS301, CS303, OE102
        sec_a_subjects = ['CS201', 'CS301', 'CS302', 'OE101']
        sec_b_subjects = ['CS201', 'CS301', 'CS303', 'OE102']

        type_map = {'CS201': 'Common', 'CS301': 'Common', 'CS302': 'Elective',
                    'CS303': 'Elective', 'OE101': 'Open Elective', 'OE102': 'Open Elective'}
        fmt_map  = {'CS201': 'CS201', 'CS301': 'CS301', 'CS302': 'CS302',
                    'CS303': 'CS302', 'OE101': 'OE101', 'OE102': 'OE101'}

        for code in sec_a_subjects:
            db.session.add(SectionSubjectAssignment(
                section_id=section_a.section_id, semester=active_sem_no,
                subject_code=code, format_code=fmt_map[code], subject_type=type_map[code],
            ))
        for code in sec_b_subjects:
            db.session.add(SectionSubjectAssignment(
                section_id=section_b.section_id, semester=active_sem_no,
                subject_code=code, format_code=fmt_map[code], subject_type=type_map[code],
            ))
        db.session.flush()

        # ── Faculty ───────────────────────────────────────────────────
        faculty_info = [
            ('Dr. Anil Sharma',   'anil@demo.com'),
            ('Prof. Meena Iyer',  'meena@demo.com'),
            ('Dr. Suresh Reddy',  'suresh@demo.com'),
            ('Prof. Kavita Nair', 'kavita@demo.com'),
        ]
        faculty_objs = []
        for fname, femail in faculty_info:
            fu = User(
                email=femail, role='FACULTY',
                password_hash=hash_password('faculty123'),
                name=fname, phone=f'9{random.randint(100000000,999999999)}',
                dept_id=dept.dept_id, college_id=college.college_id,
            )
            db.session.add(fu)
            db.session.flush()
            f = Faculty(user_id=fu.user_id, dept_id=dept.dept_id)
            db.session.add(f)
            db.session.flush()
            faculty_objs.append(f)

        # ── Faculty Allocations ────────────────────────────────────────
        # f0=Anil→CS201, f1=Meena→CS301, f2=Suresh→CS302/CS303, f3=Kavita→OE101/OE102
        alloc_defs = [
            (0, section_a.section_id, 'CS201'),
            (1, section_a.section_id, 'CS301'),
            (2, section_a.section_id, 'CS302'),
            (3, section_a.section_id, 'OE101'),
            (0, section_b.section_id, 'CS201'),
            (1, section_b.section_id, 'CS301'),
            (2, section_b.section_id, 'CS303'),
            (3, section_b.section_id, 'OE102'),
        ]
        sec_faculty = {section_a.section_id: {}, section_b.section_id: {}}
        for fi, sid, scode in alloc_defs:
            db.session.add(FacultyBatchSection(
                faculty_id=faculty_objs[fi].faculty_id,
                batch_id=batch.batch_id, section_id=sid, subject_code=scode,
            ))
            sec_faculty[sid][scode] = faculty_objs[fi].faculty_id
        db.session.flush()

        # ── Timetable ──────────────────────────────────────────────────
        def make_timetable(section, subj_fac_map):
            codes = list(subj_fac_map.keys())
            # build a repeating list of 3 per subject
            pool = []
            for c in codes:
                if 'lab' in c.lower():
                    pool += [c]
                else:
                    pool += [c, c]
            random.shuffle(pool)
            entries = []
            used = set()
            idx = 0
            for day in range(len(TIMETABLE_DAYS)):
                day_count = 0
                for slot in range(len(TIMETABLE_SLOTS)):
                    if idx >= len(pool):
                        break
                    if day_count >= 2:
                        break
                    key = (day, slot)
                    if key in used:
                        continue
                    code = pool[idx]
                    entries.append(TimetableEntry(
                        section_id=section.section_id,
                        batch_id=section.batch_id,
                        faculty_id=subj_fac_map[code],
                        subject_code=code,
                        day_order=day,
                        day_name=TIMETABLE_DAYS[day],
                        slot_index=slot,
                        slot_label=TIMETABLE_SLOTS[slot],
                    ))
                    used.add(key)
                    idx += 1
                    day_count += 1
            return entries

        # db.session.add_all(make_timetable(section_a, sec_faculty[section_a.section_id]))
        # db.session.add_all(make_timetable(section_b, sec_faculty[section_b.section_id]))
        # db.session.flush()

        # ── Students ───────────────────────────────────────────────────
        names_a = [
            'Aarav Patel', 'Vivaan Sharma', 'Aditya Singh', 'Vihaan Kumar', 'Arjun Gupta',
            'Sai Joshi', 'Reyansh Reddy', 'Ayaan Nair', 'Krishna Iyer', 'Ishaan Mehta',
            'Shaurya Das', 'Atharv Verma', 'Advik Rao', 'Pranav Pillai', 'Kabir Menon',
        ]
        names_b = [
            'Ananya Kapoor', 'Isha Mishra', 'Kavya Nambiar', 'Diya Bhat', 'Riya Kulkarni',
            'Saanvi Desai', 'Anika Tiwari', 'Myra Choudhary', 'Navya Sinha', 'Kiara Pandey',
            'Dev Malhotra', 'Rohan Jain', 'Yash Aggarwal', 'Harsh Bajaj', 'Nikhil Saxena',
        ]
        cats = ['General', 'OBC', 'SC', 'ST']

        def create_students(names, section, email_prefix, roll_prefix):
            objs = []
            for i, name in enumerate(names):
                email = f'{email_prefix}{i}@demo.com'
                roll  = f'{roll_prefix}{i+1:03d}'
                u = User(
                    email=email, role='STUDENT',
                    password_hash=hash_password('student123'),
                    name=name, phone=f'9{random.randint(100000000,999999999)}',
                    dept_id=dept.dept_id, college_id=college.college_id,
                )
                db.session.add(u)
                db.session.flush()
                s = Student(
                    student_id=u.user_id, roll_no=roll,
                    batch_id=batch.batch_id, section_id=section.section_id,
                    dept_id=dept.dept_id, email=email, phone=u.phone,
                    student_type='Regular', category=random.choice(cats),
                    entrance_marks=round(random.uniform(50, 100), 1),
                )
                db.session.add(s)
                db.session.flush()
                objs.append(s)
            return objs

        students_a = create_students(names_a, section_a, 'sa', '23CSA')
        students_b = create_students(names_b, section_b, 'sb', '23CSB')

        # ── Attendance ─────────────────────────────────────────────────
        today = date.today()
        def working_dates(n):
            dates, d = [], today - timedelta(days=60)
            while len(dates) < n:
                if d.weekday() < 6:
                    dates.append(d)
                d += timedelta(days=1)
            return dates

        all_dates = working_dates(40)
        sem_obj   = semesters[active_sem_no]
        att_sessions = att_records = 0

        for section, students, subj_codes in [
            (section_a, students_a, sec_a_subjects),
            (section_b, students_b, sec_b_subjects),
        ]:
            fac_map = sec_faculty[section.section_id]
            for i, code in enumerate(subj_codes):
                class_dates = all_dates[i*10:(i+1)*10]  # 10 sessions per subject
                for d in class_dates:
                    if d > today:
                        continue
                    sess = AttendanceSession(
                        semester_id=sem_obj.semester_id,
                        batch_id=batch.batch_id,
                        section_id=section.section_id,
                        faculty_id=fac_map[code],
                        date=d, subject_code=code,
                    )
                    db.session.add(sess)
                    db.session.flush()
                    att_sessions += 1
                    for st in students:
                        status = 'P' if random.random() < random.uniform(0.78, 0.96) else 'A'
                        db.session.add(AttendanceRecord(
                            session_id=sess.session_id,
                            student_id=st.student_id,
                            status=status,
                        ))
                        att_records += 1
        db.session.flush()

        # ── Marks ──────────────────────────────────────────────────────
        exams = [
            ('mid1', 30), ('mid2', 30),
            ('assignment1', 10), ('assignment2', 10), ('quiz1', 10),
        ]
        marks_count = 0
        for section, students, subj_codes in [
            (section_a, students_a, sec_a_subjects),
            (section_b, students_b, sec_b_subjects),
        ]:
            for st in students:
                for code in subj_codes:
                    for etype, emax in exams:
                        db.session.add(Mark(
                            student_id=st.student_id,
                            subject_code=code,
                            exam_type=etype,
                            max_marks=emax,
                            obtained_marks=round(random.uniform(emax * 0.45, emax), 1),
                            remarks='',
                        ))
                        marks_count += 1

        db.session.commit()

        print('')
        print('=' * 55)
        print('  Demo data seeded successfully!')
        print('=' * 55)
        print('  ACCOUNTS')
        print('  Super Admin : superadmin@demo.com / superadmin123')
        print('  Dept Admin  : admin@demo.com      / admin123')
        print('  Faculty     : anil@demo.com       / faculty123')
        print('  Faculty     : meena@demo.com      / faculty123')
        print('  Faculty     : suresh@demo.com     / faculty123')
        print('  Faculty     : kavita@demo.com     / faculty123')
        print('  Student (A) : sa0@demo.com        / student123')
        print('  Student (B) : sb0@demo.com        / student123')
        print('')
        print('  DATA SUMMARY')
        print('  College     : Sunrise University')
        print('  Dept        : Computer Science')
        print('  Batch       : 2023-2027  (Active Sem: 3)')
        print('  Sections    : A & B (15 students each)')
        print(f'  Subjects    : {len(subjects_data)}')
        print(f'  Attendance  : {att_sessions} sessions, {att_records} records')
        print(f'  Marks       : {marks_count} records')
        print('=' * 55)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--reset-schema', action='store_true')
    parser.add_argument('--reset-demo',   action='store_true')
=======
                print('Database already has data. Skipping demo seed to preserve existing records.')
                print('Run: python seed.py --reset-demo  (to wipe and reseed)')
                return

        # Create demo college
        college = College(college_name='Demo College')
        db.session.add(college)
        db.session.commit()

        # Create demo department
        dept = Department(dept_name='Computer Science', college_id=college.college_id)
        db.session.add(dept)
        db.session.commit()

        # Create demo program
        program = Program(program_name='B.Tech', duration_semesters=8)
        db.session.add(program)
        db.session.commit()

        # Create demo batch
        batch = Batch(batch_name='2023-2027', dept_id=dept.dept_id, program_id=program.program_id)
        db.session.add(batch)
        db.session.commit()

        # Create demo section
        section = Section(section_name='A', batch_id=batch.batch_id, dept_id=dept.dept_id, program_id=program.program_id)
        db.session.add(section)
        db.session.commit()

        # Create demo users
        # Dept Admin
        dept_admin = User(
            email='admin@demo.com',
            role='DEPT_ADMIN',
            password_hash=hash_password('admin123'),
            name='Demo Admin',
            phone='1234567890',
            dept_id=dept.dept_id,
            college_id=college.college_id
        )
        db.session.add(dept_admin)
        db.session.commit()

        # Faculty
        faculty_user = User(
            email='faculty@demo.com',
            role='FACULTY',
            password_hash=hash_password('faculty123'),
            name='Demo Faculty',
            phone='1234567891',
            dept_id=dept.dept_id,
            college_id=college.college_id
        )
        db.session.add(faculty_user)
        db.session.commit()

        faculty = Faculty(user_id=faculty_user.user_id, dept_id=dept.dept_id)
        db.session.add(faculty)
        db.session.commit()

        # Student
        student_user = User(
            email='student@demo.com',
            role='STUDENT',
            password_hash=hash_password('student123'),
            name='Demo Student',
            phone='1234567892',
            dept_id=dept.dept_id,
            college_id=college.college_id
        )
        db.session.add(student_user)
        db.session.commit()

        student = Student(
            student_id=student_user.user_id,  # Link to user
            roll_no='CS001',
            batch_id=batch.batch_id,
            section_id=section.section_id,
            dept_id=dept.dept_id,
            email='student@demo.com',
            phone='1234567892'
        )
        db.session.add(student)
        db.session.commit()

        # Create demo subjects with credits and periods
        subjects_data = [
            # Common subjects
            {'code': 'CS101', 'name': 'Programming Fundamentals', 'type': 'Common', 'credits': 4.0, 'periods': 4},
            {'code': 'CS102', 'name': 'Data Structures', 'type': 'Common', 'credits': 4.0, 'periods': 4},
            {'code': 'CS201', 'name': 'Database Management Systems', 'type': 'Common', 'credits': 3.0, 'periods': 3},
            {'code': 'CS202', 'name': 'Web Development', 'type': 'Common', 'credits': 3.0, 'periods': 3},
            # Electives
            {'code': 'CS301', 'name': 'Machine Learning', 'type': 'Elective', 'credits': 3.0, 'periods': 3},
            {'code': 'CS302', 'name': 'Computer Networks', 'type': 'Elective', 'credits': 3.0, 'periods': 3},
            {'code': 'CS303', 'name': 'Software Engineering', 'type': 'Elective', 'credits': 3.0, 'periods': 3},
            # Open Electives
            {'code': 'OE101', 'name': 'Digital Marketing', 'type': 'Open Elective', 'credits': 2.0, 'periods': 2},
            {'code': 'OE102', 'name': 'Entrepreneurship', 'type': 'Open Elective', 'credits': 2.0, 'periods': 2},
        ]

        for subj_data in subjects_data:
            subject = Subject(
                subject_code=subj_data['code'],
                subject_name=subj_data['name'],
                subject_type=subj_data['type'],
                credits=subj_data['credits'],
                periods=subj_data['periods'],
                dept_id=dept.dept_id,
                batch_id=batch.batch_id,
                program_id=program.program_id
            )
            db.session.add(subject)
        db.session.commit()

        # Create demo format and assignments
        format = SectionSubjectFormat(batch_id=batch.batch_id, semester=1)
        db.session.add(format)
        db.session.commit()

        format_subjects = [
            FormatSubject(format_id=format.id, subject_code='CS101', subject_type='Common'),
            FormatSubject(format_id=format.id, subject_code='CS301', subject_type='Elective'),
            FormatSubject(format_id=format.id, subject_code='OE101', subject_type='Open Elective'),
        ]
        for fs in format_subjects:
            db.session.add(fs)
        db.session.commit()

        # Assign subjects to section
        section_assignments = [
            SectionSubjectAssignment(section_id=section.section_id, subject_code='CS101', semester=1, subject_type='Common'),
            SectionSubjectAssignment(section_id=section.section_id, subject_code='CS301', semester=1, subject_type='Elective'),
            SectionSubjectAssignment(section_id=section.section_id, subject_code='OE101', semester=1, subject_type='Open Elective'),
        ]
        for sa in section_assignments:
            db.session.add(sa)
        db.session.commit()

        print('Demo data seeded successfully!')
        print('Demo Accounts:')
        print('Dept Admin: admin@demo.com / admin123')
        print('Faculty: faculty@demo.com / faculty123')
        print('Student: student@demo.com / student123')
        print('')
        print('Demo Subjects Created:')
        for subj in subjects_data:
            print(f"- {subj['type']}: {subj['code']} ({subj['name']}) - {subj['credits']} credits, {subj['periods']} periods")
        print('')
        print('Demo Format & Assignments:')
        print('- Format created for 2023-2027 batch, Semester 1')
        print('- Section A assigned: CS101 (Common) + CS301 (Elective) + OE101 (Open Elective)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Seed/reset database for Attendance Management System')
    parser.add_argument('--reset-schema', action='store_true', help='Drop and recreate schema only')
    parser.add_argument('--reset-demo', action='store_true', help='Drop and recreate schema, then insert demo data')
>>>>>>> upstream/master
    args = parser.parse_args()

    if args.reset_schema:
        reset_schema_only()
    elif args.reset_demo:
        seed_demo_data(reset=True)
    else:
        seed_demo_data(reset=False)
