import { NavLink, useNavigate, Link } from 'react-router-dom'
import { FaSignOutAlt, FaCalendarAlt, FaBook, FaComments, FaUsers, FaHome, FaLightbulb } from 'react-icons/fa'
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
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                <FaHome />
                <span>返回主页</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 transition"
              >
                <FaSignOutAlt />
                <span>退出</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Sidebar Navigation */}
        <aside className="w-48 flex-shrink-0 bg-white shadow-sm rounded-xl p-4 mr-6 h-fit">
          <nav className="flex flex-col space-y-1">
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <FaCalendarAlt className="mr-2.5 flex-shrink-0" /> 预约管理
            </NavLink>
            <NavLink
              to="/admin/articles"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <FaBook className="mr-2.5 flex-shrink-0" /> 文章管理
            </NavLink>
            <NavLink
              to="/admin/comments"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <FaComments className="mr-2.5 flex-shrink-0" /> 评论管理
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <FaUsers className="mr-2.5 flex-shrink-0" /> 用户管理
            </NavLink>
            <NavLink
              to="/admin/feedback"
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <FaLightbulb className="mr-2.5 flex-shrink-0" /> 意见反馈
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
