import { Link, useNavigate } from 'react-router-dom'
import { FaHome, FaBook, FaComments, FaUser, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'

export default function MainLayout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              Ask Amy
            </Link>
            <div className="flex items-center space-x-6">
              <Link
                to="/"
                className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
              >
                <FaHome />
                <span className="hidden md:inline">首页</span>
              </Link>
              <Link
                to="/knowledge-base"
                className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
              >
                <FaBook />
                <span className="hidden md:inline">知识库</span>
              </Link>
              <Link
                to="/consultation"
                className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
              >
                <FaComments />
                <span className="hidden md:inline">个性化咨询</span>
              </Link>
              
              <div className="h-6 w-px bg-gray-300 mx-2"></div>

              {user ? (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
                  >
                    <FaUser />
                    <span>我的账户</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition"
                  >
                    <FaSignOutAlt />
                    <span>退出</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
                  >
                    <FaSignInAlt />
                    <span>登录</span>
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="flex-grow">
        {children}
      </main>

      {/* 页脚 */}
      <footer className="bg-gray-800 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">© 2024 Ask Amy. 保留所有权利。</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
