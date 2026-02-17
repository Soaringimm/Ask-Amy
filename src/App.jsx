import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import ConsultationPage from './pages/ConsultationPage'
import ArticlesPage from './pages/ArticlesPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import FavoritesPage from './pages/FavoritesPage'
import RecordingsPage from './pages/RecordingsPage'
import MeetPage from './pages/MeetPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminArticles from './pages/AdminArticles'
import AdminComments from './pages/AdminComments'
import AdminUsers from './pages/AdminUsers'
import AdminFeedback from './pages/AdminFeedback'
import ProtectedRoute from './components/ProtectedRoute'
import UserRoute from './components/UserRoute'
import MeetErrorBoundary from './components/MeetErrorBoundary'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
      <Route path="/knowledge-base" element={<MainLayout><KnowledgeBasePage /></MainLayout>} />
      <Route path="/consultation" element={<MainLayout><ConsultationPage /></MainLayout>} />
      <Route path="/articles" element={<MainLayout><ArticlesPage /></MainLayout>} />
      <Route path="/articles/:slug" element={<MainLayout><ArticleDetailPage /></MainLayout>} />

      {/* Meet Routes — wrapped in ErrorBoundary so hook errors show friendly UI */}
      <Route path="/meet" element={<MainLayout><MeetErrorBoundary><MeetPage /></MeetErrorBoundary></MainLayout>} />
      <Route path="/meet/:id" element={<MainLayout><MeetErrorBoundary><MeetPage /></MeetErrorBoundary></MainLayout>} />

      {/* Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* User Protected Routes */}
      <Route
        path="/profile"
        element={
          <UserRoute>
            <MainLayout><ProfilePage /></MainLayout>
          </UserRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <UserRoute>
            <MainLayout><FavoritesPage /></MainLayout>
          </UserRoute>
        }
      />
      <Route
        path="/recordings"
        element={
          <UserRoute>
            <MainLayout><RecordingsPage /></MainLayout>
          </UserRoute>
        }
      />

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/articles"
        element={
          <ProtectedRoute>
            <AdminArticles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/comments"
        element={
          <ProtectedRoute>
            <AdminComments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/feedback"
        element={
          <ProtectedRoute>
            <AdminFeedback />
          </ProtectedRoute>
        }
      />

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
