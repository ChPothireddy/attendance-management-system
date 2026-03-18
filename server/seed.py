"""
Database seeder — run this once to populate the database with demo data.
Usage: python seed.py
"""
from app import create_app
from models import db, User, College, Branch, Section, Subject, FacultyAllocation, Attendance, Marks
import bcrypt
from datetime import date, timedelta
import random

def hash_pw(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def seed():
    app = create_app()
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()

        # ── College ────────────────────────────────────
        college = College(name='Sunrise University', code='SRU', address='123 University Road, Tech City')
        db.session.add(college)
        db.session.flush()

        # ── Branches ──────────────────────────────────
        cse = Branch(name='Computer Science & Engineering', code='CSE', college_id=college.id)
        ece = Branch(name='Electronics & Communication', code='ECE', college_id=college.id)
        me = Branch(name='Mechanical Engineering', code='ME', college_id=college.id)
        db.session.add_all([cse, ece, me])
        db.session.flush()

        # ── Sections ──────────────────────────────────
        sections = []
        for branch in [cse, ece, me]:
            for sem in [1, 3, 5]:
                for sec_name in ['A', 'B']:
                    s = Section(name=sec_name, branch_id=branch.id, semester=sem)
                    sections.append(s)
                    db.session.add(s)
        db.session.flush()

        cse_sem5_a = Section.query.filter_by(branch_id=cse.id, semester=5, name='A').first()
        cse_sem5_b = Section.query.filter_by(branch_id=cse.id, semester=5, name='B').first()

        # ── Subjects ──────────────────────────────────
        cse_subjects = [
            Subject(name='Data Structures & Algorithms', code='CS301', branch_id=cse.id, semester=5, credits=4),
            Subject(name='Database Management Systems', code='CS302', branch_id=cse.id, semester=5, credits=4),
            Subject(name='Operating Systems', code='CS303', branch_id=cse.id, semester=5, credits=3),
            Subject(name='Computer Networks', code='CS304', branch_id=cse.id, semester=5, credits=3),
            Subject(name='Software Engineering', code='CS305', branch_id=cse.id, semester=5, credits=3),
        ]
        ece_subjects = [
            Subject(name='Digital Signal Processing', code='EC301', branch_id=ece.id, semester=5, credits=4),
            Subject(name='VLSI Design', code='EC302', branch_id=ece.id, semester=5, credits=3),
            Subject(name='Microprocessors', code='EC303', branch_id=ece.id, semester=5, credits=3),
        ]
        db.session.add_all(cse_subjects + ece_subjects)
        db.session.flush()

        # ── Users ─────────────────────────────────────
        super_admin = User(
            name='Super Admin', email='superadmin@university.com',
            password_hash=hash_pw('Admin@123'), role='super_admin',
            college_id=college.id,
        )

        dept_admin_cse = User(
            name='Dr. Rajesh Kumar', email='rajesh@university.com',
            password_hash=hash_pw('Admin@123'), role='dept_admin',
            college_id=college.id, branch_id=cse.id,
        )
        dept_admin_ece = User(
            name='Dr. Priya Sharma', email='priya@university.com',
            password_hash=hash_pw('Admin@123'), role='dept_admin',
            college_id=college.id, branch_id=ece.id,
        )

        faculty_list = [
            User(name='Prof. Anil Verma', email='anil@university.com', password_hash=hash_pw('Faculty@123'),
                 role='faculty', college_id=college.id, branch_id=cse.id, phone='9876543210'),
            User(name='Prof. Meena Gupta', email='meena@university.com', password_hash=hash_pw('Faculty@123'),
                 role='faculty', college_id=college.id, branch_id=cse.id, phone='9876543211'),
            User(name='Prof. Suresh Nair', email='suresh@university.com', password_hash=hash_pw('Faculty@123'),
                 role='faculty', college_id=college.id, branch_id=cse.id, phone='9876543212'),
        ]

        db.session.add_all([super_admin, dept_admin_cse, dept_admin_ece] + faculty_list)
        db.session.flush()

        # ── Students ──────────────────────────────────
        first_names = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
                       'Ananya', 'Diya', 'Myra', 'Sara', 'Aanya', 'Aadhya', 'Ira', 'Saanvi', 'Pari', 'Meera']
        last_names = ['Patel', 'Sharma', 'Singh', 'Kumar', 'Gupta', 'Joshi', 'Reddy', 'Nair', 'Iyer', 'Das']

        students = []
        for i, section in enumerate([cse_sem5_a, cse_sem5_b]):
            for j in range(15):
                idx = i * 15 + j
                fn = first_names[idx % len(first_names)]
                ln = last_names[idx % len(last_names)]
                student = User(
                    name=f'{fn} {ln}',
                    email=f'{fn.lower()}.{ln.lower()}{idx}@student.university.com',
                    password_hash=hash_pw('Student@123'),
                    role='student',
                    college_id=college.id,
                    branch_id=cse.id,
                    section_id=section.id,
                    enrollment_no=f'SRU2024CSE{str(idx + 1).zfill(3)}',
                    phone=f'98765{str(43200 + idx).zfill(5)}',
                )
                students.append(student)
                db.session.add(student)
        db.session.flush()

        # ── Faculty Allocations ───────────────────────
        allocations = [
            FacultyAllocation(faculty_id=faculty_list[0].id, section_id=cse_sem5_a.id, subject_id=cse_subjects[0].id),
            FacultyAllocation(faculty_id=faculty_list[0].id, section_id=cse_sem5_a.id, subject_id=cse_subjects[1].id),
            FacultyAllocation(faculty_id=faculty_list[0].id, section_id=cse_sem5_b.id, subject_id=cse_subjects[0].id),
            FacultyAllocation(faculty_id=faculty_list[1].id, section_id=cse_sem5_a.id, subject_id=cse_subjects[2].id),
            FacultyAllocation(faculty_id=faculty_list[1].id, section_id=cse_sem5_b.id, subject_id=cse_subjects[2].id),
            FacultyAllocation(faculty_id=faculty_list[1].id, section_id=cse_sem5_b.id, subject_id=cse_subjects[1].id),
            FacultyAllocation(faculty_id=faculty_list[2].id, section_id=cse_sem5_a.id, subject_id=cse_subjects[3].id),
            FacultyAllocation(faculty_id=faculty_list[2].id, section_id=cse_sem5_a.id, subject_id=cse_subjects[4].id),
        ]
        db.session.add_all(allocations)
        db.session.flush()

        # ── Sample Attendance (last 30 days) ──────────
        today = date.today()
        section_a_students = [s for s in students if s.section_id == cse_sem5_a.id]
        for day_offset in range(30):
            d = today - timedelta(days=day_offset)
            if d.weekday() >= 5:  # skip weekends
                continue
            for subject in cse_subjects[:3]:
                for student in section_a_students:
                    status = random.choices(['present', 'absent', 'late'], weights=[75, 15, 10])[0]
                    att = Attendance(
                        student_id=student.id, subject_id=subject.id, section_id=cse_sem5_a.id,
                        date=d, status=status, marked_by=faculty_list[0].id,
                    )
                    db.session.add(att)

        # ── Sample Marks ──────────────────────────────
        exam_types = ['mid1', 'mid2', 'quiz1', 'assignment1']
        max_marks_map = {'mid1': 30, 'mid2': 30, 'quiz1': 10, 'assignment1': 10}
        for subject in cse_subjects[:3]:
            for student in section_a_students:
                for exam in exam_types:
                    mm = max_marks_map[exam]
                    obtained = round(random.uniform(mm * 0.4, mm), 1)
                    mark = Marks(
                        student_id=student.id, subject_id=subject.id,
                        exam_type=exam, max_marks=mm, obtained_marks=obtained,
                    )
                    db.session.add(mark)

        db.session.commit()
        print('✅ Database seeded successfully!')
        print(f'   College: {college.name}')
        print(f'   Branches: CSE, ECE, ME')
        print(f'   Students: {len(students)}')
        print(f'   Faculty: {len(faculty_list)}')
        print()
        print('   Login Credentials:')
        print('   ┌──────────────┬──────────────────────────────┬──────────────┐')
        print('   │ Role         │ Email                        │ Password     │')
        print('   ├──────────────┼──────────────────────────────┼──────────────┤')
        print('   │ Super Admin  │ superadmin@university.com    │ Admin@123    │')
        print('   │ Dept Admin   │ rajesh@university.com        │ Admin@123    │')
        print('   │ Faculty      │ anil@university.com          │ Faculty@123  │')
        print('   │ Student      │ aarav.patel0@student.uni...  │ Student@123  │')
        print('   └──────────────┴──────────────────────────────┴──────────────┘')

if __name__ == '__main__':
    seed()
