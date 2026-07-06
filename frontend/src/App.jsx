import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import './index.css';




// Auth pages
import LoginPage      from './pages/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';

// ── LAYOUTS ──────────────────────────────────────────────────────────────────
import { InstructorLayout, StudentLayout } from './components/shared/InstructorLayout';


// Instructor pages
import InstructorDashboard from './pages/instructor/Dashboard';
import LearningLessons     from './pages/instructor/LearningLessons';
import CreateAssessment    from './pages/instructor/CreateAssessment';
import StudentList         from './pages/instructor/StudentList';
import AccountManagement   from './pages/instructor/AccountManagement';
import PeerEvalSetup       from './pages/instructor/PeerEvalSetup';
import InstructorProfile   from './pages/instructor/InstructorProfile';

// Student pages
import StudentDashboard  from './pages/student/Dashboard';
import StudyLessons      from './pages/student/StudyLessons';
import StudentProfile    from './pages/student/StudentProfile';
import TakeAssessment    from './pages/student/TakeAssessment';
import AIAssistant       from './pages/student/AIAssistant';
import PeerEvaluation    from './pages/student/PeerEvaluation';
import UploadActivities  from './pages/student/UploadActivities';

// ── GUARDS ────────────────────────────────────────────────────────────────────
const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#5f3333'}}>Loading...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'instructor' ? '/instructor' : '/student'} replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user)    return <Navigate to={user.role === 'instructor' ? '/instructor' : '/student'} replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"                element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/forgot-password"      element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password/:token" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      {/* Instructor */}
      <Route path="/instructor" element={<PrivateRoute role="instructor"><InstructorLayout /></PrivateRoute>}>
        <Route index                  element={<InstructorDashboard />} />
        <Route path="lessons"         element={<LearningLessons />} />
        <Route path="assessment"      element={<CreateAssessment />} />
        <Route path="students"        element={<StudentList />} />
        <Route path="accounts"        element={<AccountManagement />} />
        <Route path="peer-evaluation" element={<PeerEvalSetup />} />
        <Route path="profile"         element={<InstructorProfile />} />
      </Route>

      {/* Student */}
      <Route path="/student" element={<PrivateRoute role="student"><StudentLayout /></PrivateRoute>}>
        <Route index                  element={<StudentDashboard />} />
        <Route path="lessons"         element={<StudyLessons />} />
        <Route path="profile"         element={<StudentProfile />} />
        <Route path="assessment"      element={<TakeAssessment />} />
        <Route path="ai"              element={<AIAssistant />} />
        <Route path="peer-evaluation" element={<PeerEvaluation />} />
        <Route path="upload"          element={<UploadActivities />} />
      </Route>

      {/* Default redirect */}
      <Route path="/"  element={<Navigate to="/login" replace />} />
      <Route path="*"  element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter 
        future={{ 
          v7_relativeSplatPath: true, 
          v7_startTransition: true 
        }}
      >
        <Toaster 
          position="top-right" 
          toastOptions={{ 
            style: { background:'#5f3333', color:'#f5f2ed', fontSize:'13px' }, 
            duration: 3000 
          }} 
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

