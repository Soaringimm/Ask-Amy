import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return children ? children : <Outlet />
}

export default ProtectedRoute
