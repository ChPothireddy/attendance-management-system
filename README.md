# Attendance & Marks Management System

A full-stack, role-based university management system for tracking student attendance and academic marks.
Backend is built with Flask (Python), and frontend is built with React + Vite.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)
- [API Endpoints](#api-endpoints)
- [Frontend Workflows](#frontend-workflows)
- [Demo Credentials](#demo-credentials)
- [Configuration](#configuration)
- [License](#license)

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React 19 + Vite 8 | Single-page application |
| Styling | Vanilla CSS | Responsive UI and custom styling |
| Charts | Recharts | Attendance/marks analytics |
| Icons | react-icons | UI iconography |
| Notifications | react-hot-toast | Toast notifications |
| Routing | react-router-dom v7 | Client-side routing + protected routes |
| Backend | Flask 3.1 | REST API server |
| ORM | Flask-SQLAlchemy | Database models and queries |
| Database | SQLite | Lightweight relational database |
| Auth | PyJWT + bcrypt | Token auth and password hashing |
| CORS | Flask-CORS | Cross-origin support |

## Project Structure

```text
attendance-management-system/
|-- server/
|   |-- app.py
|   |-- auth.py
|   |-- config.py
|   |-- models.py
|   |-- seed.py
|   |-- requirements.txt
|   |-- routes/
|   |   |-- __init__.py
|   |   |-- admin.py
|   |   |-- department.py
|   |   |-- faculty.py
|   |   `-- student.py
|   |-- uploads/
|   `-- instance/
|-- client/
|   |-- src/
|   |-- public/
|   |-- index.html
|   |-- package.json
|   `-- vite.config.js
|-- attendance.db
`-- README.md
```

## Getting Started

### Prerequisites

- Python 3.9+ and `pip`
- Node.js 18+ and `npm`

### 1. Install backend dependencies

```bash
cd server
pip install -r requirements.txt
```

### 2. Seed the database

```bash
cd server
python seed.py
```

This creates/populates `attendance.db` with demo colleges, branches, sections, subjects, faculty, students, attendance records, and marks.

### 3. Start backend

```bash
cd server
python app.py
```

Backend runs on `http://localhost:5000`.

### 4. Install frontend dependencies

```bash
cd client
npm install
```

### 5. Start frontend

```bash
cd client
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Database Schema

Main entities:

- `colleges`
- `branches`
- `sections`
- `subjects`
- `users`
- `faculty_allocations`
- `attendance`
- `marks`

Important constraints:

- Attendance unique key: `(student_id, subject_id, date)`
- Marks unique key: `(student_id, subject_id, exam_type)`

### User roles (`users.role`)

- `super_admin`
- `dept_admin`
- `faculty`
- `student`

### Attendance status (`attendance.status`)

- `present`
- `absent`
- `late`

### Exam types (`marks.exam_type`)

- `mid1`, `mid2`
- `quiz1`, `quiz2`
- `assignment1`, `assignment2`
- `final`

## User Roles & Permissions

### Super Admin

- Manage colleges and branches
- Manage department admins
- View all users and global stats

### Department Admin

- Manage sections and subjects in assigned branch
- Manage faculty and students
- Manage faculty allocations

### Faculty

- Mark attendance for allocated section/subject
- Enter marks for multiple exam types
- View attendance and marks reports

### Student

- View personal attendance summary/details
- View personal marks summary/details
- View assigned subjects

## API Endpoints

All endpoints are prefixed with `/api`.
Protected routes require `Authorization: Bearer <token>`.

### Authentication (`/api/auth`)

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/change-password`

### Super Admin (`/api/admin`)

- `GET /admin/stats`
- `GET /admin/colleges`
- `POST /admin/colleges`
- `PUT /admin/colleges/:id`
- `DELETE /admin/colleges/:id`
- `GET /admin/branches`
- `POST /admin/branches`
- `DELETE /admin/branches/:id`
- `GET /admin/dept-admins`
- `POST /admin/dept-admins`
- `DELETE /admin/dept-admins/:id`
- `GET /admin/users?role=`

### Department Admin (`/api/department`)

- `GET /department/stats`
- `GET /department/sections`
- `POST /department/sections`
- `DELETE /department/sections/:id`
- `GET /department/subjects`
- `POST /department/subjects`
- `DELETE /department/subjects/:id`
- `GET /department/faculty`
- `POST /department/faculty`
- `DELETE /department/faculty/:id`
- `GET /department/students?section_id=`
- `POST /department/students`
- `DELETE /department/students/:id`
- `GET /department/allocations`
- `POST /department/allocations`
- `DELETE /department/allocations/:id`

### Faculty (`/api/faculty`)

- `GET /faculty/stats`
- `GET /faculty/allocations`
- `GET /faculty/students/:section_id`
- `POST /faculty/attendance`
- `GET /faculty/attendance?subject_id=&section_id=&date=`
- `GET /faculty/attendance/report?subject_id=&section_id=`
- `POST /faculty/marks`
- `GET /faculty/marks?subject_id=&exam_type=`
- `GET /faculty/marks/report?subject_id=&section_id=`

### Student (`/api/student`)

- `GET /student/stats`
- `GET /student/attendance?subject_id=`
- `GET /student/attendance/summary`
- `GET /student/marks?subject_id=`
- `GET /student/marks/summary`
- `GET /student/subjects`

## Frontend Workflows

### Authentication flow

1. User opens `/login`.
2. User submits credentials.
3. Client calls `POST /api/auth/login`.
4. On success, token is stored and user is redirected to `/dashboard`.
5. On any `401`, user is auto-logged out and redirected to `/login`.

### Faculty flow

1. Faculty selects section/subject.
2. Marks attendance and saves via `POST /api/faculty/attendance`.
3. Enters marks and saves via `POST /api/faculty/marks`.
4. Views analytics in report pages.

### Student flow

1. Student views dashboard summary.
2. Opens attendance detail/summary pages.
3. Opens marks detail/summary pages.
4. Reviews current semester subjects.

## Demo Credentials

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@university.com` | `Admin@123` |
| Dept Admin (CSE) | `rajesh@university.com` | `Admin@123` |
| Dept Admin (ECE) | `priya@university.com` | `Admin@123` |
| Faculty | `anil@university.com` | `Faculty@123` |
| Faculty | `meena@university.com` | `Faculty@123` |
| Faculty | `suresh@university.com` | `Faculty@123` |
| Student | `aarav.patel0@student.university.com` | `Student@123` |

## Configuration

Backend config file: `server/config.py`

| Variable | Default | Description |
| --- | --- | --- |
| `SECRET_KEY` | `super-secret-key-change-in-production` | JWT signing key |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///../attendance.db` | DB connection string |
| `JWT_EXPIRATION_HOURS` | `24` | Token expiry |

You can set environment variables using a `.env` file inside `server/`.

## License

This project is for educational purposes.
