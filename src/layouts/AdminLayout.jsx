import { NavLink, useNavigate } from 'react-router-dom'
import { FaSignOutAlt, FaCalendarAlt, FaBook, FaComments, FaUsers } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'

export default function AdminLayout({ children }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">管理后台</h1>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition"
            >
              <FaSignOutAlt />
              <span>退出</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Sidebar Navigation */}
        <aside className="w-60 bg-white shadow-md rounded-lg p-4 mr-8">
          <nav className="flex flex-col space-y-4">
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg text-lg font-medium transition ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <FaCalendarAlt className="mr-3" /> 预约管理
            </NavLink>
            <NavLink
              to="/admin/articles"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg text-lg font-medium transition ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <FaBook className="mr-3" /> 文章管理
            </NavLink>
            <NavLink
              to="/admin/comments"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg text-lg font-medium transition ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <FaComments className="mr-3" /> 评论管理
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center p-3 rounded-lg text-lg font-medium transition ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <FaUsers className="mr-3" /> 用户管理
            </NavLink>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
