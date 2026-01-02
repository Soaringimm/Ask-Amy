import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import HomePage from './pages/HomePage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import ConsultationPage from './pages/ConsultationPage'
import ArticlesPage from './pages/ArticlesPage'
import ArticleDetailPage from './pages/ArticleDetailPage'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import AdminArticles from './pages/AdminArticles'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
      <Route path="/knowledge-base" element={<MainLayout><KnowledgeBasePage /></MainLayout>} />
      <Route path="/consultation" element={<MainLayout><ConsultationPage /></MainLayout>} />
      <Route path="/articles" element={<MainLayout><ArticlesPage /></MainLayout>} />
      <Route path="/articles/:slug" element={<MainLayout><ArticleDetailPage /></MainLayout>} />

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

      {/* Default Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
