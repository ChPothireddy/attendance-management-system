import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import DashboardLayout from './pages/DashboardLayout';
import Dashboard from './pages/Dashboard';

// Super Admin pages
import ManageBranches from './pages/ManageBranches';
import ManageDeptAdmins from './pages/ManageDeptAdmins';
import AllUsers from './pages/AllUsers';

// Dept Admin pages
import ManageSections from './pages/ManageSections';
import ManageSubjects from './pages/ManageSubjects';
import ManageFaculty from './pages/ManageFaculty';
import ManageStudents from './pages/ManageStudents';
import ManageAllocations from './pages/ManageAllocations';

// Faculty pages
import MarkAttendance from './pages/MarkAttendance';
import AttendanceReport from './pages/AttendanceReport';
import EnterMarks from './pages/EnterMarks';
import MarksReport from './pages/MarksReport';

// Student pages
import MyAttendance from './pages/MyAttendance';
import MyMarks from './pages/MyMarks';
import MySubjects from './pages/MySubjects';

import './index.css';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Super Admin */}
        <Route path="/colleges" element={<ProtectedRoute roles={['super_admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/branches" element={<ProtectedRoute roles={['super_admin']}><ManageBranches /></ProtectedRoute>} />
        <Route path="/dept-admins" element={<ProtectedRoute roles={['super_admin']}><ManageDeptAdmins /></ProtectedRoute>} />
        <Route path="/all-users" element={<ProtectedRoute roles={['super_admin']}><AllUsers /></ProtectedRoute>} />

        {/* Dept Admin */}
        <Route path="/sections" element={<ProtectedRoute roles={['dept_admin']}><ManageSections /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute roles={['dept_admin']}><ManageSubjects /></ProtectedRoute>} />
        <Route path="/manage-faculty" element={<ProtectedRoute roles={['dept_admin']}><ManageFaculty /></ProtectedRoute>} />
        <Route path="/manage-students" element={<ProtectedRoute roles={['dept_admin']}><ManageStudents /></ProtectedRoute>} />
        <Route path="/allocations" element={<ProtectedRoute roles={['dept_admin']}><ManageAllocations /></ProtectedRoute>} />

        {/* Faculty */}
        <Route path="/mark-attendance" element={<ProtectedRoute roles={['faculty']}><MarkAttendance /></ProtectedRoute>} />
        <Route path="/attendance-report" element={<ProtectedRoute roles={['faculty']}><AttendanceReport /></ProtectedRoute>} />
        <Route path="/enter-marks" element={<ProtectedRoute roles={['faculty']}><EnterMarks /></ProtectedRoute>} />
        <Route path="/marks-report" element={<ProtectedRoute roles={['faculty']}><MarksReport /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/my-attendance" element={<ProtectedRoute roles={['student']}><MyAttendance /></ProtectedRoute>} />
        <Route path="/my-marks" element={<ProtectedRoute roles={['student']}><MyMarks /></ProtectedRoute>} />
        <Route path="/my-subjects" element={<ProtectedRoute roles={['student']}><MySubjects /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '10px',
              padding: '12px 16px',
              fontSize: '0.875rem',
              fontWeight: 500,
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
