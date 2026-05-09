import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineHome, HiOutlineAcademicCap, HiOutlineUserGroup,
  HiOutlineClipboardList, HiOutlineChartBar, HiOutlineCog,
  HiOutlineLogout, HiOutlineBookOpen, HiOutlineDocumentText, HiOutlineUsers,
  HiOutlineCalendar, HiOutlinePencilAlt, HiOutlineDocumentAdd, HiOutlineOfficeBuilding, HiOutlineTable
} from 'react-icons/hi';
import './Sidebar.css';

const navConfig = {
  super_admin: [
    { section: 'Overview' },
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  ],
  dept_admin: [
    { section: 'Overview' },
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { section: 'Department' },
    { to: '/sections', label: 'Sections', icon: HiOutlineOfficeBuilding },
    { to: '/subjects', label: 'Subjects', icon: HiOutlineBookOpen },
    { section: 'People' },
    { to: '/manage-faculty', label: 'Faculty', icon: HiOutlineAcademicCap },
    { to: '/manage-students', label: 'Students', icon: HiOutlineUserGroup },
    { to: '/allocations', label: 'Timetable', icon: HiOutlineCog },
    { to: '/class-reports', label: 'Class Reports', icon: HiOutlineDocumentText },
  ],
  faculty: [
    { section: 'Overview' },
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/faculty-timetable', label: 'My Timetable', icon: HiOutlineTable },
    { section: 'Attendance' },
    { to: '/mark-attendance', label: 'Mark Attendance', icon: HiOutlineClipboardList },
    { to: '/attendance-report', label: 'Attendance Report', icon: HiOutlineChartBar },
    { section: 'Marks' },
    { to: '/enter-marks', label: 'Enter Marks', icon: HiOutlinePencilAlt },
    { to: '/marks-report', label: 'Marks Report', icon: HiOutlineDocumentText },
    { section: 'Assignments' },
    { to: '/faculty-assignments', label: 'Assignments', icon: HiOutlineDocumentAdd },
  ],
  student: [
    { section: 'Overview' },
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { section: 'Academics' },
    { to: '/my-attendance', label: 'My Attendance', icon: HiOutlineCalendar },
    { to: '/my-marks', label: 'My Marks', icon: HiOutlineDocumentText },
    { to: '/my-subjects', label: 'My Subjects', icon: HiOutlineBookOpen },
    { to: '/my-assignments', label: 'Assignments', icon: HiOutlineDocumentAdd },
  ],
};

const roleLabels = {
  super_admin: 'Super Admin',
  dept_admin: 'Dept Admin',
  faculty: 'Faculty',
  student: 'Student',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = navConfig[user?.role?.toLowerCase()] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon"><HiOutlineAcademicCap /></div>
        <div className="sidebar-brand-text">
          AttendanceMS
          <span>Management System</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item, i) =>
          item.section ? (
            <div key={i} className="sidebar-section">{item.section}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="icon"><item.icon /></span>
              {item.label}
            </NavLink>
          )
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{roleLabels[user?.role?.toLowerCase()]}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>
          <HiOutlineLogout />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
