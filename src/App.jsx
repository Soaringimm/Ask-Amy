import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './components/ProtectedRoute'
import UserRoute from './components/UserRoute'
import MeetErrorBoundary from './components/MeetErrorBoundary'

const HomePage = lazy(() => import('./pages/HomePage'))
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'))
const ConsultationPage = lazy(() => import('./pages/ConsultationPage'))
const ArticlesPage = lazy(() => import('./pages/ArticlesPage'))
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const RecordingsPage = lazy(() => import('./pages/RecordingsPage'))
const MeetPage = lazy(() => import('./pages/MeetPage'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminArticles = lazy(() => import('./pages/AdminArticles'))
const AdminComments = lazy(() => import('./pages/AdminComments'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'))

function App() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>}>
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
    </Suspense>
  )
}

export default App
