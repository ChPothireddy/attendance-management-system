import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  HiOutlineAcademicCap,
  HiOutlineOfficeBuilding,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineSearch,
  HiOutlineClipboardList,
} from 'react-icons/hi';
import API from '../api/axios';

const initialDepartmentForm = {
  department_name: '',
  admin_name: '',
  admin_email: '',
  admin_password: '',
};

function percentTone(value) {
  if (value >= 75) return 'high';
  if (value >= 50) return 'mid';
  return 'low';
}

function PercentCell({ value }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontWeight: 600 }}>{value}%</span>
      <div className="percent-bar">
        <div className={`percent-bar-fill ${percentTone(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({});
  const [college, setCollege] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [studentsExplorer, setStudentsExplorer] = useState({ departments: [], batches: [], sections: [], students: [] });
  const [facultyExplorer, setFacultyExplorer] = useState({ departments: [], faculty: [] });
  const [departmentForm, setDepartmentForm] = useState(initialDepartmentForm);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [studentFilters, setStudentFilters] = useState({ department_id: '', batch_id: '', section_id: '', search: '' });
  const [facultyFilters, setFacultyFilters] = useState({ department_id: '', search: '' });

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    loadStudentsExplorer();
  }, [studentFilters.department_id, studentFilters.batch_id, studentFilters.section_id, studentFilters.search]);

  useEffect(() => {
    loadFacultyExplorer();
  }, [facultyFilters.department_id, facultyFilters.search]);

  const loadOverview = async () => {
    try {
      const [statsRes, collegeRes, departmentsRes] = await Promise.all([
        API.get('/admin/stats'),
        API.get('/admin/college'),
        API.get('/admin/departments'),
      ]);
      setStats(statsRes.data);
      setCollege(collegeRes.data);
      setDepartments(departmentsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load super admin dashboard');
    }
  };

  const loadStudentsExplorer = async () => {
    try {
      const params = {};
      if (studentFilters.department_id) params.department_id = studentFilters.department_id;
      if (studentFilters.batch_id) params.batch_id = studentFilters.batch_id;
      if (studentFilters.section_id) params.section_id = studentFilters.section_id;
      if (studentFilters.search.trim()) params.search = studentFilters.search.trim();
      const res = await API.get('/admin/students/explorer', { params });
      setStudentsExplorer(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load students explorer');
    }
  };

  const loadFacultyExplorer = async () => {
    try {
      const params = {};
      if (facultyFilters.department_id) params.department_id = facultyFilters.department_id;
      if (facultyFilters.search.trim()) params.search = facultyFilters.search.trim();
      const res = await API.get('/admin/faculty', { params });
      setFacultyExplorer(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load faculty explorer');
    }
  };

  const handleDepartmentCreate = async (e) => {
    e.preventDefault();
    setSavingDepartment(true);
    try {
      const payload = {
        ...departmentForm,
        admin_password: departmentForm.admin_password.trim() || undefined,
      };
      const res = await API.post('/admin/departments', payload);
      setGeneratedCredentials(res.data.dept_admin);
      setDepartmentForm(initialDepartmentForm);
      toast.success('Department created successfully');
      await loadOverview();
      await loadStudentsExplorer();
      await loadFacultyExplorer();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create department');
    } finally {
      setSavingDepartment(false);
    }
  };

  const availableBatches = useMemo(() => {
    if (!studentFilters.department_id) return studentsExplorer.batches;
    return studentsExplorer.batches.filter((batch) => String(batch.dept_id) === String(studentFilters.department_id));
  }, [studentsExplorer.batches, studentFilters.department_id]);

  const availableSections = useMemo(() => {
    return studentsExplorer.sections.filter((section) => {
      const matchesDepartment = !studentFilters.department_id || String(section.dept_id) === String(studentFilters.department_id);
      const matchesBatch = !studentFilters.batch_id || String(section.batch_id) === String(studentFilters.batch_id);
      return matchesDepartment && matchesBatch;
    });
  }, [studentsExplorer.sections, studentFilters.department_id, studentFilters.batch_id]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Super Admin Dashboard</h1>
        <p>{college?.name ? `${college.name} workspace overview` : 'Manage college-wide departments, students, and faculty.'}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple"><HiOutlineOfficeBuilding /></div>
          <div className="stat-info"><h3>{stats.departments || 0}</h3><p>Departments</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineUserGroup /></div>
          <div className="stat-info"><h3>{stats.dept_admins || 0}</h3><p>Dept Admins</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineAcademicCap /></div>
          <div className="stat-info"><h3>{stats.faculty || 0}</h3><p>Faculty</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink"><HiOutlineUsers /></div>
          <div className="stat-info"><h3>{stats.students || 0}</h3><p>Students</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineClipboardList /></div>
          <div className="stat-info"><h3>{stats.batches || 0}</h3><p>Batches</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><HiOutlineOfficeBuilding /></div>
          <div className="stat-info"><h3>{stats.sections || 0}</h3><p>Sections</p></div>
        </div>
      </div>

      <div className="form-row" style={{ alignItems: 'start', marginBottom: 24 }}>
        <div className="card">
          <div className="section-header">
            <h2>Create Department</h2>
          </div>
          <form onSubmit={handleDepartmentCreate}>
            <div className="form-group">
              <label>Department Name</label>
              <input
                className="form-control"
                value={departmentForm.department_name}
                onChange={(e) => setDepartmentForm((current) => ({ ...current, department_name: e.target.value }))}
                placeholder="Computer Science and Engineering"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Department Admin Name</label>
                <input
                  className="form-control"
                  value={departmentForm.admin_name}
                  onChange={(e) => setDepartmentForm((current) => ({ ...current, admin_name: e.target.value }))}
                  placeholder="Admin name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Department Admin Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={departmentForm.admin_email}
                  onChange={(e) => setDepartmentForm((current) => ({ ...current, admin_email: e.target.value }))}
                  placeholder="deptadmin@college.edu"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Department Admin Password</label>
              <input
                className="form-control"
                value={departmentForm.admin_password}
                onChange={(e) => setDepartmentForm((current) => ({ ...current, admin_password: e.target.value }))}
                placeholder="Leave blank to auto-generate"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingDepartment}>
              {savingDepartment ? 'Creating...' : 'Create Department'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="section-header">
            <h2>Department Admin Credentials</h2>
          </div>
          {generatedCredentials ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div><strong>Name:</strong> {generatedCredentials.name}</div>
              <div><strong>Email:</strong> {generatedCredentials.email}</div>
              <div><strong>Password:</strong> {generatedCredentials.password}</div>
              <p style={{ color: 'var(--gray-500)', marginTop: 8 }}>
                Share these credentials with the department admin after department creation.
              </p>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <div className="icon"><HiOutlineUserGroup /></div>
              <p>New department admin credentials will appear here after creation.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2>Departments</h2>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Dept Admin</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan="3" style={{ textAlign: 'center', padding: 32 }}>No departments created yet.</td></tr>
              ) : departments.map((department) => (
                <tr key={department.id}>
                  <td style={{ fontWeight: 600 }}>{department.name}</td>
                  <td>{department.dept_admin_name || '-'}</td>
                  <td>{department.dept_admin_email || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2>Students Explorer</h2>
        </div>
        <div className="toolbar">
          <div className="toolbar-left" style={{ width: '100%' }}>
            <select
              className="form-control"
              style={{ maxWidth: 240 }}
              value={studentFilters.department_id}
              onChange={(e) => setStudentFilters({ department_id: e.target.value, batch_id: '', section_id: '', search: studentFilters.search })}
            >
              <option value="">All Departments</option>
              {studentsExplorer.departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <select
              className="form-control"
              style={{ maxWidth: 220 }}
              value={studentFilters.batch_id}
              onChange={(e) => setStudentFilters((current) => ({ ...current, batch_id: e.target.value, section_id: '' }))}
            >
              <option value="">All Batches</option>
              {availableBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>
            <select
              className="form-control"
              style={{ maxWidth: 220 }}
              value={studentFilters.section_id}
              onChange={(e) => setStudentFilters((current) => ({ ...current, section_id: e.target.value }))}
            >
              <option value="">All Sections</option>
              {availableSections.map((section) => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
            <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
              <HiOutlineSearch style={{ position: 'absolute', left: 12, top: 12, color: 'var(--gray-400)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 36 }}
                placeholder="Search roll no, batch, section, or name"
                value={studentFilters.search}
                onChange={(e) => setStudentFilters((current) => ({ ...current, search: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Department</th>
                <th>Batch</th>
                <th>Section</th>
                <th>Attendance %</th>
                <th>Marks %</th>
              </tr>
            </thead>
            <tbody>
              {studentsExplorer.students.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 32 }}>No students found for the selected filters.</td></tr>
              ) : studentsExplorer.students.map((student) => (
                <tr key={student.student_id}>
                  <td style={{ fontWeight: 700 }}>{student.roll_no}</td>
                  <td>{student.name}</td>
                  <td>{student.department_name}</td>
                  <td>{student.batch_name}</td>
                  <td>{student.section_name}</td>
                  <td><PercentCell value={student.attendance_pct} /></td>
                  <td><PercentCell value={student.marks_pct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Faculty Directory</h2>
        </div>
        <div className="toolbar">
          <div className="toolbar-left" style={{ width: '100%' }}>
            <select
              className="form-control"
              style={{ maxWidth: 240 }}
              value={facultyFilters.department_id}
              onChange={(e) => setFacultyFilters((current) => ({ ...current, department_id: e.target.value }))}
            >
              <option value="">All Departments</option>
              {facultyExplorer.departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </select>
            <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
              <HiOutlineSearch style={{ position: 'absolute', left: 12, top: 12, color: 'var(--gray-400)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 36 }}
                placeholder="Search by department, faculty id, or faculty name"
                value={facultyFilters.search}
                onChange={(e) => setFacultyFilters((current) => ({ ...current, search: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
              </tr>
            </thead>
            <tbody>
              {facultyExplorer.faculty.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 32 }}>No faculty found for the selected filters.</td></tr>
              ) : facultyExplorer.faculty.map((faculty) => (
                <tr key={faculty.faculty_id}>
                  <td style={{ fontWeight: 700 }}>{faculty.faculty_id}</td>
                  <td>{faculty.name}</td>
                  <td>{faculty.email}</td>
                  <td>{faculty.department_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
