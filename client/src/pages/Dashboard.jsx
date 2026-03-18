import { useAuth } from '../context/AuthContext';
import SuperAdminDashboard from './SuperAdminDashboard';
import DeptAdminDashboard from './DeptAdminDashboard';
import FacultyDashboard from './FacultyDashboard';
import StudentDashboard from './StudentDashboard';

const dashboards = {
  super_admin: SuperAdminDashboard,
  dept_admin: DeptAdminDashboard,
  faculty: FacultyDashboard,
  student: StudentDashboard,
};

export default function Dashboard() {
  const { user } = useAuth();
  const DashboardComponent = dashboards[user?.role];

  if (!DashboardComponent) return <div className="page-container"><p>Unknown role</p></div>;
  return <DashboardComponent />;
}
