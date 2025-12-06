import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import ConsultationPage from './pages/ConsultationPage';
import AdminLogin from './pages/AdminLogin'; // Existing Admin Login
import AdminDashboard from './pages/AdminDashboard';
import SignUp from './pages/SignUp'; // New client sign up
import Login from './pages/Login';     // New client login
import ProfilePage from './pages/ProfilePage'; // New profile page
import ProtectedRoute from './components/ProtectedRoute'; // Protected Route component
import AdminUsers from './pages/AdminUsers'; // New admin users page
import AdminArticles from './pages/AdminArticles'; // New admin articles page

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
      <Route path="/knowledge-base" element={<MainLayout><KnowledgeBasePage /></MainLayout>} />
      <Route path="/consultation" element={<MainLayout><ConsultationPage /></MainLayout>} />
      <Route path="/signup" element={<SignUp />} /> {/* Client Sign Up */}
      <Route path="/login" element={<Login />} />   {/* Client Login */}

      {/* Protected Client Routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute roles={['client', 'admin']}> {/* Both clients and admins can view their profile */}
            <MainLayout><ProfilePage /></MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Specific Routes */}
      <Route path="/admin/login" element={<AdminLogin />} /> {/* Existing Admin Login */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/articles"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminArticles />
          </ProtectedRoute>
        }
      />

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
