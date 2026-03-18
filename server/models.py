from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()

# ── Users ──────────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # super_admin, dept_admin, faculty, student
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=True)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=True)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'), nullable=True)
    enrollment_no = db.Column(db.String(50), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    college = db.relationship('College', backref='users', lazy=True)
    branch = db.relationship('Branch', backref='users', lazy=True)
    section = db.relationship('Section', backref='users', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'college_id': self.college_id,
            'branch_id': self.branch_id,
            'section_id': self.section_id,
            'enrollment_no': self.enrollment_no,
            'phone': self.phone,
            'college_name': self.college.name if self.college else None,
            'branch_name': self.branch.name if self.branch else None,
            'section_name': self.section.name if self.section else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# ── Colleges ───────────────────────────────────────────
class College(db.Model):
    __tablename__ = 'colleges'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=False)
    address = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    branches = db.relationship('Branch', backref='college', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'address': self.address,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'branch_count': len(self.branches),
        }

# ── Branches (Departments) ────────────────────────────
class Branch(db.Model):
    __tablename__ = 'branches'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    college_id = db.Column(db.Integer, db.ForeignKey('colleges.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    sections = db.relationship('Section', backref='branch', lazy=True, cascade='all, delete-orphan')
    subjects = db.relationship('Subject', backref='branch', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'college_id': self.college_id,
            'college_name': self.college.name if self.college else None,
            'section_count': len(self.sections),
            'subject_count': len(self.subjects),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# ── Sections ──────────────────────────────────────────
class Section(db.Model):
    __tablename__ = 'sections'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    semester = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'branch_id': self.branch_id,
            'branch_name': self.branch.name if self.branch else None,
            'semester': self.semester,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

# ── Subjects ──────────────────────────────────────────
class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    branch_id = db.Column(db.Integer, db.ForeignKey('branches.id'), nullable=False)
    semester = db.Column(db.Integer, nullable=False, default=1)
    credits = db.Column(db.Integer, nullable=False, default=3)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'code': self.code,
            'branch_id': self.branch_id,
            'branch_name': self.branch.name if self.branch else None,
            'semester': self.semester,
            'credits': self.credits,
        }

# ── Faculty Allocations ──────────────────────────────
class FacultyAllocation(db.Model):
    __tablename__ = 'faculty_allocations'
    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    faculty = db.relationship('User', backref='allocations', lazy=True)
    section = db.relationship('Section', backref='allocations', lazy=True)
    subject = db.relationship('Subject', backref='allocations', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'faculty_id': self.faculty_id,
            'faculty_name': self.faculty.name if self.faculty else None,
            'section_id': self.section_id,
            'section_name': self.section.name if self.section else None,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'subject_code': self.subject.code if self.subject else None,
        }

# ── Attendance ────────────────────────────────────────
class Attendance(db.Model):
    __tablename__ = 'attendance'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey('sections.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(10), nullable=False, default='present')  # present, absent, late
    marked_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    student = db.relationship('User', foreign_keys=[student_id], backref='attendance_records', lazy=True)
    subject = db.relationship('Subject', backref='attendance_records', lazy=True)
    section = db.relationship('Section', backref='attendance_records', lazy=True)
    marker = db.relationship('User', foreign_keys=[marked_by], lazy=True)

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject_id', 'date', name='uq_attendance'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'enrollment_no': self.student.enrollment_no if self.student else None,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'date': self.date.isoformat() if self.date else None,
            'status': self.status,
        }

# ── Marks ─────────────────────────────────────────────
class Marks(db.Model):
    __tablename__ = 'marks'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    exam_type = db.Column(db.String(50), nullable=False)  # mid1, mid2, final, assignment, quiz
    max_marks = db.Column(db.Float, nullable=False, default=100)
    obtained_marks = db.Column(db.Float, nullable=False, default=0)
    remarks = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    student = db.relationship('User', backref='marks_records', lazy=True)
    subject = db.relationship('Subject', backref='marks_records', lazy=True)

    __table_args__ = (
        db.UniqueConstraint('student_id', 'subject_id', 'exam_type', name='uq_marks'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else None,
            'enrollment_no': self.student.enrollment_no if self.student else None,
            'subject_id': self.subject_id,
            'subject_name': self.subject.name if self.subject else None,
            'subject_code': self.subject.code if self.subject else None,
            'exam_type': self.exam_type,
            'max_marks': self.max_marks,
            'obtained_marks': self.obtained_marks,
            'percentage': round((self.obtained_marks / self.max_marks) * 100, 1) if self.max_marks else 0,
            'remarks': self.remarks,
        }
