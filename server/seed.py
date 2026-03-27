from datetime import date, timedelta
from pathlib import Path

import bcrypt
from flask import Flask

from config import Config
from models import (
    AttendanceRecord,
    AttendanceSession,
    Batch,
    Department,
    Faculty,
    FacultyBatchSection,
    Mark,
    Program,
    Section,
    Semester,
    Student,
    Subject,
    User,
    db,
)


def hash_pw(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def build_subjects(dept_id, prefix, semester_topics):
    subjects = []
    for semester_no, topics in semester_topics.items():
        for index, (name, credits) in enumerate(topics, start=1):
            code = f'{prefix}{semester_no}{index:02d}'
            subjects.append(
                Subject(
                    subject_code=code,
                    subject_name=name,
                    semester=semester_no,
                    credits=credits,
                    dept_id=dept_id,
                )
            )
    return subjects


def seed():
    app = Flask(__name__, instance_path=str(Path(__file__).resolve().parent / 'instance'))
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        db.drop_all()
        db.create_all()

        departments = [
            Department(dept_id=1, dept_name='CSE'),
            Department(dept_id=2, dept_name='ECE'),
            Department(dept_id=3, dept_name='MBA'),
            Department(dept_id=4, dept_name='CSE'),
            Department(dept_id=5, dept_name='ME'),
            Department(dept_id=6, dept_name='CSE'),
            Department(dept_id=7, dept_name='EEE'),
        ]
        db.session.add_all(departments)

        programs = [
            Program(program_id=1, program_name='B.Tech', duration_semesters=8),
            Program(program_id=2, program_name='M.Tech', duration_semesters=4),
            Program(program_id=3, program_name='MBA', duration_semesters=4),
        ]
        db.session.add_all(programs)

        batches = [
            Batch(batch_id=1, batch_name='2022-26', dept_id=1, program_id=1),
            Batch(batch_id=2, batch_name='2022-24', dept_id=1, program_id=2),
            Batch(batch_id=3, batch_name='2023-25', dept_id=3, program_id=3),
            Batch(batch_id=4, batch_name='2022-26', dept_id=4, program_id=1),
            Batch(batch_id=5, batch_name='2021-25', dept_id=5, program_id=1),
            Batch(batch_id=6, batch_name='2023-27', dept_id=6, program_id=1),
            Batch(batch_id=7, batch_name='2024-28', dept_id=2, program_id=1),
            Batch(batch_id=8, batch_name='2022-26', dept_id=7, program_id=1),
        ]
        db.session.add_all(batches)

        sections = [
            Section(section_id=1, section_name='A', current_semester=5, batch_id=1, dept_id=1),
            Section(section_id=2, section_name='B', current_semester=5, batch_id=1, dept_id=1),
            Section(section_id=3, section_name='C', current_semester=5, batch_id=1, dept_id=1),
            Section(section_id=4, section_name='A', current_semester=3, batch_id=2, dept_id=1),
            Section(section_id=5, section_name='A', current_semester=1, batch_id=3, dept_id=3),
            Section(section_id=6, section_name='B', current_semester=1, batch_id=3, dept_id=3),
            Section(section_id=7, section_name='A', current_semester=5, batch_id=4, dept_id=4),
            Section(section_id=8, section_name='B', current_semester=5, batch_id=4, dept_id=4),
            Section(section_id=9, section_name='A', current_semester=8, batch_id=5, dept_id=5),
            Section(section_id=10, section_name='A', current_semester=1, batch_id=6, dept_id=6),
            Section(section_id=11, section_name='B', current_semester=2, batch_id=6, dept_id=6),
            Section(section_id=12, section_name='A', current_semester=3, batch_id=7, dept_id=2),
            Section(section_id=13, section_name='A', current_semester=4, batch_id=8, dept_id=7),
        ]
        db.session.add_all(sections)

        subject_catalog = {
            1: ('CS', {
                1: [('Programming in C', 4), ('Digital Logic Design', 4), ('Engineering Mathematics I', 3)],
                2: [('Object Oriented Programming', 4), ('Computer Organization', 4), ('Engineering Mathematics II', 3)],
                3: [('Data Structures', 4), ('Discrete Mathematics', 4), ('Python Programming', 3)],
                4: [('Algorithms', 4), ('Database Management Systems', 4), ('Operating Systems', 3)],
                5: [('Computer Networks', 4), ('Web Technologies', 4), ('Software Engineering', 3)],
                6: [('Compiler Design', 4), ('Machine Learning', 4), ('Distributed Systems', 3)],
                7: [('Artificial Intelligence', 4), ('Cloud Computing', 4), ('Information Security', 3)],
                8: [('Deep Learning', 4), ('Blockchain Technology', 3), ('Project Work', 6)],
            }),
            2: ('EC', {
                1: [('Basic Electronics', 4), ('Circuit Theory', 4), ('Applied Mathematics I', 3)],
                2: [('Electronic Devices', 4), ('Signals and Systems', 4), ('Applied Mathematics II', 3)],
                3: [('Network Analysis', 4), ('Analog Circuits', 4), ('Control Systems', 3)],
                4: [('Digital Electronics', 4), ('Microprocessors', 4), ('Probability and Random Processes', 3)],
                5: [('Communication Systems', 4), ('Linear Integrated Circuits', 4), ('Electromagnetic Waves', 3)],
                6: [('VLSI Design', 4), ('Embedded Systems', 4), ('Digital Signal Processing', 3)],
                7: [('Wireless Communication', 4), ('Optical Communication', 4), ('Microwave Engineering', 3)],
                8: [('IoT Systems', 4), ('Satellite Communication', 3), ('Project Work', 6)],
            }),
            3: ('MBA', {
                1: [('Marketing Management', 3), ('Financial Accounting', 3), ('Organizational Behaviour', 3)],
                2: [('Human Resource Management', 3), ('Operations Management', 3), ('Business Analytics', 3)],
                3: [('Strategic Management', 3), ('International Business', 3), ('Supply Chain Management', 3)],
                4: [('Project Management', 3), ('Entrepreneurship', 3), ('Business Ethics', 3)],
            }),
            4: ('CSX', {
                1: [('Programming Fundamentals', 4), ('Discrete Structures', 4), ('Calculus', 3)],
                2: [('Java Programming', 4), ('Computer Architecture', 4), ('Probability and Statistics', 3)],
                3: [('Data Structures', 4), ('Database Systems', 4), ('Linux Programming', 3)],
                4: [('Algorithms', 4), ('Operating Systems', 4), ('Computer Graphics', 3)],
                5: [('Software Engineering', 4), ('Computer Networks', 4), ('Full Stack Development', 3)],
                6: [('Machine Learning', 4), ('Mobile Computing', 4), ('DevOps', 3)],
                7: [('Artificial Intelligence', 4), ('Big Data Analytics', 4), ('Cyber Security', 3)],
                8: [('Natural Language Processing', 4), ('Blockchain Applications', 3), ('Project Work', 6)],
            }),
            5: ('ME', {
                1: [('Engineering Mechanics', 4), ('Workshop Technology', 4), ('Engineering Mathematics I', 3)],
                2: [('Thermodynamics I', 4), ('Materials Science', 4), ('Engineering Mathematics II', 3)],
                3: [('Fluid Mechanics', 4), ('Manufacturing Processes', 4), ('Kinematics of Machines', 3)],
                4: [('Heat Transfer', 4), ('Machine Drawing', 4), ('Strength of Materials', 3)],
                5: [('Dynamics of Machines', 4), ('Design of Machine Elements', 4), ('CAD/CAM', 3)],
                6: [('Finite Element Methods', 4), ('Automobile Engineering', 4), ('Industrial Engineering', 3)],
                7: [('Robotics', 4), ('Refrigeration and Air Conditioning', 4), ('Operations Research', 3)],
                8: [('Renewable Energy Systems', 4), ('Additive Manufacturing', 3), ('Project Work', 6)],
            }),
            6: ('CSY', {
                1: [('Problem Solving with C', 4), ('Digital Systems', 4), ('Mathematics I', 3)],
                2: [('Java and DSA', 4), ('Computer Organization', 4), ('Mathematics II', 3)],
                3: [('Python for Engineers', 4), ('Discrete Mathematics', 4), ('Database Concepts', 3)],
                4: [('Operating Systems', 4), ('Design and Analysis of Algorithms', 4), ('Computer Networks', 3)],
                5: [('Software Engineering', 4), ('Web Development', 4), ('Data Warehousing', 3)],
                6: [('Artificial Intelligence', 4), ('Cloud Native Development', 4), ('Cyber Security', 3)],
                7: [('Big Data', 4), ('Internet of Things', 4), ('Information Retrieval', 3)],
                8: [('Machine Vision', 4), ('Edge Computing', 3), ('Project Work', 6)],
            }),
            7: ('EE', {
                1: [('Basic Electrical Engineering', 4), ('Engineering Physics', 4), ('Applied Mathematics I', 3)],
                2: [('Network Theory', 4), ('Electrical Measurements', 4), ('Applied Mathematics II', 3)],
                3: [('Electrical Machines I', 4), ('Analog Electronics', 4), ('Control Engineering', 3)],
                4: [('Electrical Machines II', 4), ('Power Generation', 4), ('Digital Systems', 3)],
                5: [('Power Systems I', 4), ('Power Electronics', 4), ('Microcontrollers', 3)],
                6: [('Power Systems II', 4), ('Renewable Energy Systems', 4), ('High Voltage Engineering', 3)],
                7: [('Smart Grids', 4), ('Electric Drives', 4), ('Energy Auditing', 3)],
                8: [('HVDC Transmission', 4), ('Electric Vehicles', 3), ('Project Work', 6)],
            }),
        }

        subjects = []
        for dept_id, (prefix, semester_topics) in subject_catalog.items():
            subjects.extend(build_subjects(dept_id, prefix, semester_topics))
        db.session.add_all(subjects)

        users = [
            User(user_id=1, email='admin_cse@abc.edu', role='DEPT_ADMIN', password_hash=hash_pw('password'), name='CSE Admin', dept_id=1),
            User(user_id=2, email='admin_mba@abc.edu', role='DEPT_ADMIN', password_hash=hash_pw('password'), name='MBA Admin', dept_id=3),
            User(user_id=3, email='admin_cse@xyz.edu', role='DEPT_ADMIN', password_hash=hash_pw('password'), name='CSE Admin XYZ', dept_id=4),
            User(user_id=4, email='admin@pqr.edu', role='DEPT_ADMIN', password_hash=hash_pw('password'), name='PQR Admin', dept_id=6),
        ]

        faculty_specs = [
            (10, 110, 'Rao', 'rao@abc.edu', 1),
            (11, 111, 'Sharma', 'sharma@abc.edu', 1),
            (12, 112, 'Patel', 'patel@mba.edu', 3),
            (13, 113, 'Jain', 'jain@mba.edu', 3),
            (14, 114, 'Kumar', 'kumar@xyz.edu', 4),
            (15, 115, 'Anita', 'anita@pqr.edu', 6),
            (16, 116, 'Verma', 'verma@ece.edu', 2),
            (17, 117, 'Yadav', 'yadav@me.edu', 5),
            (18, 118, 'Aggarwal', 'aggarwal@eee.edu', 7),
            (19, 119, 'Gupta', 'gupta@abc.edu', 1),
            (20, 120, 'Singh', 'singh@xyz.edu', 4),
        ]

        faculties = []
        faculty_by_dept = {}
        for faculty_id, user_id, name, email, dept_id in faculty_specs:
            users.append(User(user_id=user_id, email=email, role='FACULTY', password_hash=hash_pw('password'), name=name, dept_id=dept_id))
            faculties.append(Faculty(faculty_id=faculty_id, user_id=user_id, dept_id=dept_id))
            faculty_by_dept.setdefault(dept_id, []).append(faculty_id)
        db.session.add_all(users)
        db.session.add_all(faculties)

        domain_map = {
            1: 'abc.edu',
            2: 'ece.edu',
            3: 'mba.edu',
            4: 'xyz.edu',
            5: 'me.edu',
            6: 'pqr.edu',
            7: 'eee.edu',
        }
        roll_prefix_map = {
            1: 'CS',
            2: 'EC',
            3: 'MBA',
            4: 'CX',
            5: 'ME',
            6: 'CY',
            7: 'EE',
        }

        students = []
        student_users = []
        section_students = {}
        next_student_id = 200
        for section in sections:
            batch = next(batch for batch in batches if batch.batch_id == section.batch_id)
            start_year = batch.batch_name.split('-')[0][2:]
            dept_code = roll_prefix_map[section.dept_id]
            roster = []
            for idx in range(1, 6):
                student_id = next_student_id
                next_student_id += 1
                roll_no = f'{start_year}{dept_code}{batch.batch_id}{section.section_name}{idx:02d}'
                email = f'{roll_no.lower()}@{domain_map[section.dept_id]}'
                phone = f'90000{student_id:05d}'[-10:]
                student_users.append(
                    User(
                        user_id=student_id,
                        email=email,
                        role='STUDENT',
                        password_hash=hash_pw('password'),
                        name=f'Student {roll_no}',
                        phone=phone,
                        dept_id=section.dept_id,
                    )
                )
                students.append(
                    Student(
                        student_id=student_id,
                        roll_no=roll_no,
                        batch_id=section.batch_id,
                        section_id=section.section_id,
                        dept_id=section.dept_id,
                        email=email,
                        phone=phone,
                    )
                )
                roster.append(student_id)
            section_students[section.section_id] = roster
        db.session.add_all(student_users)
        db.session.add_all(students)

        semesters = []
        semester_lookup = {}
        for batch in batches:
            program = next(program for program in programs if program.program_id == batch.program_id)
            batch_sections = [section for section in sections if section.batch_id == batch.batch_id]
            active_semester_no = batch_sections[0].current_semester if batch_sections else 1
            for semester_no in range(1, program.duration_semesters + 1):
                semester = Semester(batch_id=batch.batch_id, semester_no=semester_no, is_active=(semester_no == active_semester_no))
                semesters.append(semester)
                semester_lookup[(batch.batch_id, semester_no)] = semester
        db.session.add_all(semesters)
        db.session.flush()

        allocations = []
        for section in sections:
            dept_faculty = faculty_by_dept.get(section.dept_id, [])
            dept_subjects = [subject for subject in subjects if subject.dept_id == section.dept_id and subject.semester == section.current_semester]
            max_allocations = min(len(dept_faculty), 2)
            for index, subject in enumerate(dept_subjects[:max_allocations]):
                faculty_id = dept_faculty[index % len(dept_faculty)]
                allocations.append(
                    FacultyBatchSection(
                        faculty_id=faculty_id,
                        batch_id=section.batch_id,
                        section_id=section.section_id,
                        subject_code=subject.subject_code,
                    )
                )
        db.session.add_all(allocations)

        sessions = []
        records = []
        marks = []
        next_session_id = 1001
        base_date = date(2026, 1, 10)
        for section in sections:
            section_allocations = [alloc for alloc in allocations if alloc.section_id == section.section_id]
            if not section_allocations:
                continue
            session_alloc = section_allocations[0]
            semester = semester_lookup[(section.batch_id, section.current_semester)]
            session = AttendanceSession(
                session_id=next_session_id,
                semester_id=semester.semester_id,
                batch_id=section.batch_id,
                section_id=section.section_id,
                faculty_id=session_alloc.faculty_id,
                date=base_date + timedelta(days=section.section_id),
                subject_code=session_alloc.subject_code,
            )
            sessions.append(session)
            for idx, student_id in enumerate(section_students[section.section_id]):
                records.append(
                    AttendanceRecord(
                        session_id=next_session_id,
                        student_id=student_id,
                        status='P' if idx % 4 != 0 else 'A',
                    )
                )
            for exam_type, max_marks in [('mid1', 30), ('assignment1', 10)]:
                for idx, student_id in enumerate(section_students[section.section_id]):
                    score_ratio = 0.55 + (idx * 0.08)
                    obtained_marks = round(min(max_marks, max_marks * score_ratio), 1)
                    marks.append(
                        Mark(
                            student_id=student_id,
                            subject_code=session_alloc.subject_code,
                            exam_type=exam_type,
                            max_marks=max_marks,
                            obtained_marks=obtained_marks,
                            remarks='Seeded demo mark',
                        )
                    )
            next_session_id += 1
        db.session.add_all(sessions)
        db.session.add_all(records)
        db.session.add_all(marks)

        db.session.commit()

        print('Database seeded successfully!')
        print(f'Departments: {Department.query.count()}')
        print(f'Programs: {Program.query.count()}')
        print(f'Batches: {Batch.query.count()}')
        print(f'Sections: {Section.query.count()}')
        print(f'Subjects: {Subject.query.count()}')
        print(f'Faculty: {Faculty.query.count()}')
        print(f'Students: {Student.query.count()}')
        print(f'Attendance Sessions: {AttendanceSession.query.count()}')
        print(f'Attendance Records: {AttendanceRecord.query.count()}')
        print()
        print('Login Credentials:')
        print('Dept Admins: admin_cse@abc.edu / password, admin_mba@abc.edu / password, admin_cse@xyz.edu / password, admin@pqr.edu / password')
        print('Faculty: rao@abc.edu / password, sharma@abc.edu / password, patel@mba.edu / password')
        print('Students: use any seeded student email with password')


if __name__ == '__main__':
    seed()
