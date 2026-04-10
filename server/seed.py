import argparse
from pathlib import Path

from flask import Flask

from config import Config
from models import db, College, Department, Program, Batch, Section, User, Faculty, Student, Subject, SectionSubjectFormat, FormatSubject, SectionSubjectAssignment
from auth import hash_password


def reset_schema_only():
    app = Flask(__name__, instance_path=str(Path(__file__).resolve().parent / 'instance'))
    app.config.from_object(Config)
    db.init_app(app)

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
    args = parser.parse_args()

    if args.reset_schema:
        reset_schema_only()
    elif args.reset_demo:
        seed_demo_data(reset=True)
    else:
        seed_demo_data(reset=False)
