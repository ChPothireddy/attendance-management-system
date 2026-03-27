from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()

# ── Departments ──────────────────────────────────────────────
class Department(db.Model):
    __tablename__ = 'departments'
    dept_id = db.Column(db.Integer, primary_key=True)
    dept_name = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id': self.dept_id,
            'name': self.dept_name,
        }

# ── Programs ──────────────────────────────────────────────
class Program(db.Model):
    __tablename__ = 'programs'
    program_id = db.Column(db.Integer, primary_key=True)
    program_name = db.Column(db.String(100), nullable=False)
    duration_semesters = db.Column(db.Integer, nullable=False)

# ── Batches ──────────────────────────────────────────────
class Batch(db.Model):
    __tablename__ = 'batches'
    batch_id = db.Column(db.Integer, primary_key=True)
    batch_name = db.Column(db.String(50), nullable=False)
    dept_id = db.Column(db.Integer, db.ForeignKey('departments.dept_id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.program_id'), nullable=False)

# ── Sections ──────────────────────────────────────────────
class Section(db.Model):
    __tablename__ = 'sections'
    section_id = db.Column(db.Integer, primary_key=True)
    section_name = db.Column(db.String(10), nullable=False)
    current_semester = db.Column(db.Integer, nullable=True, default=1)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.batch_id'), nullable=False)
    dept_id = db.Column(db.Integer, db.ForeignKey('departments.dept_id'), nullable=False)

    __table_args__ = (db.UniqueConstraint('section_name', 'batch_id', name='unique_section_batch'),)

    def to_dict(self):
        return {
            'id': self.section_id,
            'name': self.section_name,
            'current_semester': self.current_semester,
            'batch_id': self.batch_id,
            'dept_id': self.dept_id,
        }

# ── Subjects ──────────────────────────────────────────────
class Subject(db.Model):
    __tablename__ = 'subjects'
    subject_code = db.Column(db.String(20), primary_key=True)
    subject_name = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=True)
    credits = db.Column(db.Integer, nullable=True)
    dept_id = db.Column(db.Integer, db.ForeignKey('departments.dept_id'), nullable=False)

    def to_dict(self):
        return {
            'code': self.subject_code,
            'name': self.subject_name,
            'semester': self.semester,
            'credits': self.credits,
            'dept_id': self.dept_id,
        }

# ── Batch Sections ──────────────────────────────────────────────
class BatchSection(db.Model):
    __tablename__ = 'batch_sections'
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.batch_id'), primary_key=True)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.section_id'), primary_key=True)

# ── Users ──────────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False)  # DEPT_ADMIN, FACULTY, STUDENT
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    dept_id = db.Column(db.Integer, db.ForeignKey('departments.dept_id'), nullable=True)  # For DEPT_ADMIN

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'email': self.email,
            'role': self.role,
            'name': self.name,
            'phone': self.phone,
            'dept_id': self.dept_id,
        }

# ── Faculties ──────────────────────────────────────────────
class Faculty(db.Model):
    __tablename__ = 'faculties'
    faculty_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    dept_id = db.Column(db.Integer, db.ForeignKey('departments.dept_id'), nullable=False)

    def to_dict(self):
        return {
            'faculty_id': self.faculty_id,
            'user_id': self.user_id,
            'dept_id': self.dept_id,
        }

# ── Faculty Batch Sections ──────────────────────────────────────────────
class FacultyBatchSection(db.Model):
    __tablename__ = 'faculty_batch_sections'
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculties.faculty_id'), primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.batch_id'), primary_key=True)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.section_id'), primary_key=True)
    subject_code = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            'faculty_id': self.faculty_id,
            'batch_id': self.batch_id,
            'section_id': self.section_id,
            'subject_code': self.subject_code,
        }

# ── Students ──────────────────────────────────────────────
class Student(db.Model):
    __tablename__ = 'students'
    student_id = db.Column(db.Integer, primary_key=True)
    roll_no = db.Column(db.String(20), nullable=False)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.batch_id'), nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.section_id'), nullable=False)
    dept_id = db.Column(db.Integer, db.ForeignKey('departments.dept_id'), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)

    def to_dict(self):
        return {
            'student_id': self.student_id,
            'roll_no': self.roll_no,
            'batch_id': self.batch_id,
            'section_id': self.section_id,
            'dept_id': self.dept_id,
            'email': self.email,
            'phone': self.phone,
        }

# ── Semesters ──────────────────────────────────────────────
class Semester(db.Model):
    __tablename__ = 'semesters'
    semester_id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.batch_id'), nullable=False)
    semester_no = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=False)

# ── Attendance Sessions ──────────────────────────────────────────────
class AttendanceSession(db.Model):
    __tablename__ = 'attendance_sessions'
    session_id = db.Column(db.Integer, primary_key=True)
    semester_id = db.Column(db.Integer, db.ForeignKey('semesters.semester_id'), nullable=False)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.batch_id'), nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.section_id'), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculties.faculty_id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    subject_code = db.Column(db.String(20), nullable=False)

# ── Attendance Records ──────────────────────────────────────────────
class AttendanceRecord(db.Model):
    __tablename__ = 'attendance_records'
    session_id = db.Column(db.Integer, db.ForeignKey('attendance_sessions.session_id'), primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id'), primary_key=True)
    status = db.Column(db.String(1), nullable=False)  # P, A


class Mark(db.Model):
    __tablename__ = 'marks'
    mark_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.student_id'), nullable=False)
    subject_code = db.Column(db.String(20), nullable=False)
    exam_type = db.Column(db.String(30), nullable=False)
    max_marks = db.Column(db.Float, nullable=False)
    obtained_marks = db.Column(db.Float, nullable=False, default=0)
    remarks = db.Column(db.String(255), nullable=True)

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject_code', 'exam_type', name='unique_student_subject_exam'),
    )

    def to_dict(self):
        return {
            'mark_id': self.mark_id,
            'student_id': self.student_id,
            'subject_code': self.subject_code,
            'exam_type': self.exam_type,
            'max_marks': self.max_marks,
            'obtained_marks': self.obtained_marks,
            'remarks': self.remarks,
        }


