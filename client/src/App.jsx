import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import RegisterCollege from './pages/RegisterCollege';
import Login from './pages/Login';
import DashboardLayout from './pages/DashboardLayout';
import Dashboard from './pages/Dashboard';

// Dept Admin pages
import ManageSections from './pages/ManageSections';
import ManageSubjects from './pages/ManageSubjects';
import ManageFaculty from './pages/ManageFaculty';
import ManageStudents from './pages/ManageStudents';
import ManageAllocations from './pages/ManageAllocations';
import ClassReports from './pages/ClassReports';

// Faculty pages
import MarkAttendance from './pages/MarkAttendance';
import AttendanceReport from './pages/AttendanceReport';
import EnterMarks from './pages/EnterMarks';
import MarksReport from './pages/MarksReport';
import FacultyAssignments from './pages/FacultyAssignments';
import FacultyTimetable from './pages/FacultyTimetable';

// Student pages
import MyAttendance from './pages/MyAttendance';
import MyMarks from './pages/MyMarks';
import MySubjects from './pages/MySubjects';
import StudentAssignments from './pages/StudentAssignments';

import './index.css';

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Home />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <RegisterCollege />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Dept Admin */}
        <Route path="/sections" element={<ProtectedRoute roles={['DEPT_ADMIN']}><ManageSections /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute roles={['DEPT_ADMIN']}><ManageSubjects /></ProtectedRoute>} />
        <Route path="/manage-faculty" element={<ProtectedRoute roles={['DEPT_ADMIN']}><ManageFaculty /></ProtectedRoute>} />
        <Route path="/manage-students" element={<ProtectedRoute roles={['DEPT_ADMIN']}><ManageStudents /></ProtectedRoute>} />
        <Route path="/allocations" element={<ProtectedRoute roles={['DEPT_ADMIN']}><ManageAllocations /></ProtectedRoute>} />
        <Route path="/class-reports" element={<ProtectedRoute roles={['DEPT_ADMIN']}><ClassReports /></ProtectedRoute>} />

        {/* Faculty */}
        <Route path="/mark-attendance" element={<ProtectedRoute roles={['FACULTY']}><MarkAttendance /></ProtectedRoute>} />
        <Route path="/attendance-report" element={<ProtectedRoute roles={['FACULTY']}><AttendanceReport /></ProtectedRoute>} />
        <Route path="/enter-marks" element={<ProtectedRoute roles={['FACULTY']}><EnterMarks /></ProtectedRoute>} />
        <Route path="/marks-report" element={<ProtectedRoute roles={['FACULTY']}><MarksReport /></ProtectedRoute>} />
        <Route path="/faculty-assignments" element={<ProtectedRoute roles={['FACULTY']}><FacultyAssignments /></ProtectedRoute>} />
        <Route path="/faculty-timetable" element={<ProtectedRoute roles={['FACULTY']}><FacultyTimetable /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/my-attendance" element={<ProtectedRoute roles={['STUDENT']}><MyAttendance /></ProtectedRoute>} />
        <Route path="/my-marks" element={<ProtectedRoute roles={['STUDENT']}><MyMarks /></ProtectedRoute>} />
        <Route path="/my-subjects" element={<ProtectedRoute roles={['STUDENT']}><MySubjects /></ProtectedRoute>} />
        <Route path="/my-assignments" element={<ProtectedRoute roles={['STUDENT']}><StudentAssignments /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
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
