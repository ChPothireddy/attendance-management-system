# Attendance & Marks Management System

A full-stack, role-based university management system for tracking student attendance and academic marks. Built with **Flask** (Python) on the backend and **React + Vite** on the frontend.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)
- [API Endpoints](#api-endpoints)
- [Frontend Pages & Workflows](#frontend-pages--workflows)
- [Demo Credentials](#demo-credentials)
- [Screenshots](#screenshots)

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + Vite 8 | Single-page application |
| **Styling** | Vanilla CSS | Glassmorphism, animations, responsive design |
| **Charts** | Recharts | Bar charts, pie charts for reports |
| **Icons** | react-icons (HeroIcons) | UI iconography |
| **Notifications** | react-hot-toast | Toast notifications |
| **Routing** | react-router-dom v7 | Client-side routing with protected routes |
| **Backend** | Flask 3.1 | REST API server |
| **ORM** | Flask-SQLAlchemy | Database models & queries |
| **Database** | SQLite | Zero-config relational database |
| **Auth** | PyJWT + bcrypt | JWT token authentication & password hashing |
| **CORS** | Flask-CORS | Cross-origin resource sharing |

---

## Project Structure

```
Attendance-management-sys/
│
├── server/                          # Flask Backend
│   ├── app.py                       # Flask app factory, blueprint registration
│   ├── config.py                    # Configuration (DB URI, JWT secret)
│   ├── models.py                    # SQLAlchemy models (8 tables)
│   ├── auth.py                      # JWT login, token_required decorator, RBAC
│   ├── seed.py                      # Database seeder with demo data
│   ├── requirements.txt             # Python dependencies
│   └── routes/
│       ├── __init__.py
│       ├── admin.py                 # Super Admin endpoints
│       ├── department.py            # Department Admin endpoints
│       ├── faculty.py               # Faculty endpoints
│       └── student.py               # Student endpoints
│
├── client/                          # React + Vite Frontend
│   ├── index.html                   # Entry HTML
│   ├── vite.config.js               # Vite configuration
│   ├── package.json                 # Node dependencies
│   └── src/
│       ├── main.jsx                 # React entry point
│       ├── App.jsx                  # Router with all routes & auth
│       ├── index.css                # Global CSS design system
│       ├── api/
│       │   └── axios.js             # Axios instance with JWT interceptor
│       ├── context/
│       │   └── AuthContext.jsx       # Auth state management
│       ├── components/
│       │   ├── ProtectedRoute.jsx   # Role-based route guard
│       │   ├── Sidebar.jsx          # Navigation sidebar
│       │   └── Sidebar.css
│       └── pages/
│           ├── Login.jsx / .css     # Glassmorphism login page
│           ├── DashboardLayout.jsx  # Sidebar + content layout
│           ├── Dashboard.jsx        # Role-based dashboard router
│           ├── SuperAdminDashboard.jsx
│           ├── DeptAdminDashboard.jsx
│           ├── FacultyDashboard.jsx
│           ├── StudentDashboard.jsx
│           ├── ManageSections.jsx   # CRUD: Sections
│           ├── ManageSubjects.jsx   # CRUD: Subjects
│           ├── ManageFaculty.jsx    # CRUD: Faculty members
│           ├── ManageStudents.jsx   # CRUD: Students
│           ├── ManageAllocations.jsx# CRUD: Faculty-Section-Subject mapping
│           ├── ManageBranches.jsx   # CRUD: Branches (departments)
│           ├── ManageDeptAdmins.jsx # CRUD: Department administrators
│           ├── AllUsers.jsx         # View all users (filterable)
│           ├── MarkAttendance.jsx   # Interactive attendance marking
│           ├── AttendanceReport.jsx # Attendance analytics + charts
│           ├── EnterMarks.jsx       # Marks entry with live validation
│           ├── MarksReport.jsx      # Marks analytics + charts
│           ├── MyAttendance.jsx     # Student attendance view
│           ├── MyMarks.jsx          # Student marks view
│           └── MySubjects.jsx       # Student subjects list
│
├── attendance.db                    # SQLite database (auto-generated)
└── README.md                        # This file
```

---

## Getting Started

### Prerequisites

- **Python 3.9+** with `pip`
- **Node.js 18+** with `npm`

### 1. Install Backend Dependencies

```bash
cd server
pip install -r requirements.txt
```

### 2. Seed the Database

```bash
cd server
python seed.py
```

This creates the SQLite database (`attendance.db`) and populates it with:
- 1 college (Sunrise University)
- 3 branches (CSE, ECE, ME)
- 18 sections across branches and semesters
- 8 subjects (5 CSE, 3 ECE)
- 30 students (15 per section in CSE Sem 5)
- 3 faculty members with allocations
- 30 days of attendance records
- Marks for 4 exam types (mid1, mid2, quiz1, assignment1)

### 3. Start the Backend

```bash
cd server
python app.py
```

The Flask API starts on **http://localhost:5000**

### 4. Install Frontend Dependencies

```bash
cd client
npm install
```

### 5. Start the Frontend

```bash
cd client
npm run dev
```

The React app starts on **http://localhost:5173**

---

## Database Schema

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│     colleges     │     │     branches     │     │     sections     │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)          │◄───┐│ id (PK)          │◄───┐│ id (PK)          │
│ name             │    ││ name             │    ││ name             │
│ code (unique)    │    ││ code             │    ││ branch_id (FK)───┘
│ address          │    ││ college_id (FK)──┘    ││ semester         │
│ created_at       │    │└──────────────────┘    │└──────────────────┘
└──────────────────┘    │                        │
                        │                        │
┌──────────────────┐    │  ┌──────────────────┐  │  ┌──────────────────────┐
│      users       │    │  │     subjects     │  │  │  faculty_allocations  │
├──────────────────┤    │  ├──────────────────┤  │  ├──────────────────────┤
│ id (PK)          │    │  │ id (PK)          │  │  │ id (PK)              │
│ name             │    │  │ name             │  │  │ faculty_id (FK)──────►users
│ email (unique)   │    │  │ code             │  │  │ section_id (FK)──────►sections
│ password_hash    │    │  │ branch_id (FK)───┘  │  │ subject_id (FK)──────►subjects
│ role             │    │  │ semester         │  │  └──────────────────────┘
│ college_id (FK)──┘    │  │ credits          │  │
│ branch_id (FK)────────┘  └──────────────────┘  │
│ section_id (FK)────────────────────────────────┘
│ enrollment_no    │
│ phone            │        ┌──────────────────┐    ┌──────────────────┐
│ created_at       │        │    attendance     │    │      marks       │
└──────────────────┘        ├──────────────────┤    ├──────────────────┤
                            │ id (PK)          │    │ id (PK)          │
                            │ student_id (FK)──►    │ student_id (FK)──►users
                            │ subject_id (FK)──►    │ subject_id (FK)──►subjects
                            │ section_id (FK)──►    │ exam_type        │
                            │ date             │    │ max_marks        │
                            │ status           │    │ obtained_marks   │
                            │ marked_by (FK)───►    │ remarks          │
                            └──────────────────┘    └──────────────────┘

Unique Constraints:
  attendance: (student_id, subject_id, date)
  marks:      (student_id, subject_id, exam_type)
```

### User Roles (stored in `users.role`)

| Value | Description |
|-------|-------------|
| `super_admin` | System-wide administrator |
| `dept_admin` | Department-level administrator |
| `faculty` | Teaching staff |
| `student` | Enrolled student |

### Attendance Status (stored in `attendance.status`)

| Value | Description |
|-------|-------------|
| `present` | Student was present |
| `absent` | Student was absent |
| `late` | Student arrived late |

### Exam Types (stored in `marks.exam_type`)

| Value | Typical Max Marks |
|-------|-------------------|
| `mid1` | 30 |
| `mid2` | 30 |
| `quiz1` / `quiz2` | 10 |
| `assignment1` / `assignment2` | 10 |
| `final` | 100 |

---

## User Roles & Permissions

### Super Admin
- Create/edit/delete **colleges** and **branches**
- Create/delete **department administrators**
- View **all users** in the system with role filtering
- View system-wide **dashboard statistics**

### Department Admin
- Manage **sections** within their branch
- Manage **subjects** for their branch
- Add/remove **faculty** members
- Add/remove **students** (with enrollment numbers)
- Create **faculty allocations** (assign faculty to section + subject pairs)

### Faculty
- **Mark attendance** for allocated sections/subjects (present/late/absent)
- **Enter marks** for multiple exam types (mid-terms, quizzes, assignments, finals)
- View **attendance reports** with bar charts and detailed tables
- View **marks reports** with overall performance analytics

### Student
- View personal **attendance summary** per subject with percentage bars
- View **detailed attendance records** with date-wise status
- View **marks scorecards** per subject with exam breakdowns
- View **subjects list** for current semester

---

## API Endpoints

All endpoints are prefixed with `/api`. Protected routes require a JWT token in the `Authorization: Bearer <token>` header.

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | No | Login with email/password, returns JWT token |
| `GET` | `/auth/me` | Yes | Get current user profile |
| `POST` | `/auth/change-password` | Yes | Change password (requires old + new) |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "superadmin@university.com",
  "password": "Admin@123"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Super Admin",
    "email": "superadmin@university.com",
    "role": "super_admin",
    "college_id": 1,
    "college_name": "Sunrise University",
    ...
  }
}
```

---

### Super Admin (`/api/admin`) — Requires `super_admin` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/stats` | Dashboard statistics (counts of colleges, branches, users) |
| `GET` | `/admin/colleges` | List all colleges |
| `POST` | `/admin/colleges` | Create a college `{name, code, address}` |
| `PUT` | `/admin/colleges/:id` | Update a college |
| `DELETE` | `/admin/colleges/:id` | Delete a college (cascades to branches) |
| `GET` | `/admin/branches` | List all branches |
| `POST` | `/admin/branches` | Create a branch `{name, code, college_id}` |
| `DELETE` | `/admin/branches/:id` | Delete a branch |
| `GET` | `/admin/dept-admins` | List department admins |
| `POST` | `/admin/dept-admins` | Create dept admin `{name, email, password, college_id, branch_id}` |
| `DELETE` | `/admin/dept-admins/:id` | Delete a dept admin |
| `GET` | `/admin/users?role=` | List all users (optional role filter) |

---

### Department Admin (`/api/department`) — Requires `dept_admin` role

All data is automatically scoped to the admin's **branch**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/department/stats` | Branch-level statistics |
| `GET` | `/department/sections` | List sections in branch |
| `POST` | `/department/sections` | Create section `{name, semester}` |
| `DELETE` | `/department/sections/:id` | Delete a section |
| `GET` | `/department/subjects` | List subjects in branch |
| `POST` | `/department/subjects` | Create subject `{name, code, semester, credits}` |
| `DELETE` | `/department/subjects/:id` | Delete a subject |
| `GET` | `/department/faculty` | List faculty in branch |
| `POST` | `/department/faculty` | Create faculty `{name, email, password, phone}` |
| `DELETE` | `/department/faculty/:id` | Delete faculty (removes allocations) |
| `GET` | `/department/students?section_id=` | List students (optional section filter) |
| `POST` | `/department/students` | Create student `{name, email, password, enrollment_no, section_id}` |
| `DELETE` | `/department/students/:id` | Delete a student |
| `GET` | `/department/allocations` | List faculty allocations |
| `POST` | `/department/allocations` | Create allocation `{faculty_id, section_id, subject_id}` |
| `DELETE` | `/department/allocations/:id` | Remove an allocation |

---

### Faculty (`/api/faculty`) — Requires `faculty` role

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/faculty/stats` | Teaching statistics |
| `GET` | `/faculty/allocations` | List my section/subject allocations |
| `GET` | `/faculty/students/:section_id` | List students in a section |
| `POST` | `/faculty/attendance` | Mark attendance (bulk) |
| `GET` | `/faculty/attendance?subject_id=&section_id=&date=` | Get attendance records |
| `GET` | `/faculty/attendance/report?subject_id=&section_id=` | Attendance report with percentages |
| `POST` | `/faculty/marks` | Enter marks (bulk) |
| `GET` | `/faculty/marks?subject_id=&exam_type=` | Get marks records |
| `GET` | `/faculty/marks/report?subject_id=&section_id=` | Marks report with totals |

**Mark Attendance Request:**
```json
POST /api/faculty/attendance
{
  "subject_id": 1,
  "section_id": 1,
  "date": "2026-03-18",
  "records": [
    { "student_id": 4, "status": "present" },
    { "student_id": 5, "status": "absent" },
    { "student_id": 6, "status": "late" }
  ]
}
```

**Enter Marks Request:**
```json
POST /api/faculty/marks
{
  "subject_id": 1,
  "exam_type": "mid1",
  "max_marks": 30,
  "records": [
    { "student_id": 4, "obtained_marks": 25.5, "remarks": "Good" },
    { "student_id": 5, "obtained_marks": 18.0, "remarks": "" }
  ]
}
```

---

### Student (`/api/student`) — Requires `student` role

All data is automatically scoped to the **logged-in student**.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/student/stats` | Academic overview (attendance %, avg marks) |
| `GET` | `/student/attendance?subject_id=` | Detailed attendance records |
| `GET` | `/student/attendance/summary` | Per-subject attendance percentages |
| `GET` | `/student/marks?subject_id=` | Detailed marks records |
| `GET` | `/student/marks/summary` | Per-subject marks with exam breakdowns |
| `GET` | `/student/subjects` | Current semester subjects |

---

## Frontend Pages & Workflows

### Authentication Flow

```
User opens app ──► /login page
     │
     ├── Enter email + password (or click Demo Account button)
     │
     ├── POST /api/auth/login
     │       │
     │       ├── Success ──► JWT token stored in localStorage
     │       │                Redirect to /dashboard
     │       │
     │       └── Failure ──► Error message displayed
     │
     └── On any 401 response ──► Auto-logout, redirect to /login
```

### Attendance Marking Workflow (Faculty)

```
Faculty Dashboard ──► Click "Mark Attendance"
     │
     ├── Select Section & Subject from dropdown
     ├── Select Date (defaults to today)
     │
     ├── Student list loads with toggle buttons:
     │     [✓ Present]  [⏱ Late]  [✗ Absent]
     │
     ├── Quick Actions: "All Present" / "All Absent"
     ├── Click individual student rows to cycle status
     │
     ├── Live counter shows: Present: X  Late: Y  Absent: Z
     │
     └── Click "Save Attendance" ──► POST /api/faculty/attendance
```

### Marks Entry Workflow (Faculty)

```
Faculty Dashboard ──► Click "Enter Marks"
     │
     ├── Select Section & Subject
     ├── Select Exam Type (Mid1, Mid2, Quiz, Assignment, Final)
     ├── Set Max Marks (auto-filled based on exam type)
     │
     ├── Inline marks input for each student:
     │     [Enrollment] [Name] [Marks Input ▓▓▓░░ bar] [Remarks]
     │
     └── Click "Save Marks" ──► POST /api/faculty/marks
```

### Student View Workflow

```
Student Dashboard ──► Shows overall stats
     │
     ├── Attendance % (pie chart) + Subject-wise progress bars
     ├── Avg Marks % across all subjects
     │
     ├── "My Attendance" ──► Subject summary table
     │     Click a subject ──► Detailed date-wise records
     │
     ├── "My Marks" ──► Per-subject scorecards
     │     Shows each exam type with obtained/max and % bar
     │     Consolidated table at the bottom
     │
     └── "My Subjects" ──► List of current semester subjects
```

### Department Admin Workflow

```
Dept Admin Dashboard ──► Stats + Quick Action cards
     │
     ├── "Manage Sections" ──► Create sections (name + semester)
     ├── "Manage Subjects" ──► Create subjects (name, code, semester, credits)
     ├── "Manage Faculty" ──► Add faculty (name, email, password)
     ├── "Manage Students" ──► Add students (name, email, enrollment, section)
     │     Filter by section
     │
     └── "Faculty Allocations" ──► Assign faculty → section → subject
           This determines which classes a faculty member can access
```

### Super Admin Workflow

```
Super Admin Dashboard ──► System-wide statistics
     │
     ├── "Colleges" ──► CRUD with code and address
     ├── "Branches" ──► Create branches under colleges
     ├── "Dept Admins" ──► Assign admins to college + branch
     └── "All Users" ──► View/filter all users by role
```

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@university.com` | `Admin@123` |
| Dept Admin (CSE) | `rajesh@university.com` | `Admin@123` |
| Dept Admin (ECE) | `priya@university.com` | `Admin@123` |
| Faculty | `anil@university.com` | `Faculty@123` |
| Faculty | `meena@university.com` | `Faculty@123` |
| Faculty | `suresh@university.com` | `Faculty@123` |
| Student | `aarav.patel0@student.university.com` | `Student@123` |

The login page includes **demo account buttons** that auto-fill credentials for quick testing.

---

## Configuration

### Backend (`server/config.py`)

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `super-secret-key-change-in-production` | JWT signing key |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///../attendance.db` | Database connection string |
| `JWT_EXPIRATION_HOURS` | `24` | Token expiry time |

Environment variables can be set via a `.env` file in the `server/` directory.

### Switching to MySQL/PostgreSQL

Update `SQLALCHEMY_DATABASE_URI` in `config.py`:

```python
# MySQL
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://user:pass@localhost/attendance_db'

# PostgreSQL
SQLALCHEMY_DATABASE_URI = 'postgresql://user:pass@localhost/attendance_db'
```

Install the corresponding driver (`pip install pymysql` or `pip install psycopg2-binary`) and re-run `python seed.py`.

---

## License

This project is for educational purposes.
