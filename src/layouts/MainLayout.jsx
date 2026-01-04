import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaHome, FaComments, FaNewspaper, FaSearch, FaUser, FaSignOutAlt, FaHeart, FaCog } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'

export default function MainLayout({ children }) {
  const { user, profile, signOut, isAdmin } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      setShowUserMenu(false)
    } catch (err) {
      console.error('Sign out error:', err)
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
            <div className="flex items-center space-x-4 md:space-x-6">
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
                <FaSearch />
                <span className="hidden md:inline">IRCC问答</span>
              </Link>
              <Link
                to="/articles"
                className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
              >
                <FaNewspaper />
                <span className="hidden md:inline">文章</span>
              </Link>
              <Link
                to="/consultation"
                className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition"
              >
                <FaComments />
                <span className="hidden md:inline">预约咨询</span>
              </Link>

              {/* User Menu */}
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600 transition"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <FaUser className="text-primary-600 text-sm" />
                      </div>
                    )}
                    <span className="hidden md:inline text-sm font-medium">
                      {profile?.display_name || profile?.email?.split('@')[0] || '用户'}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {profile?.display_name || '用户'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {profile?.email || user.email}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FaCog className="mr-2" />
                        个人设置
                      </Link>
                      <Link
                        to="/favorites"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FaHeart className="mr-2" />
                        我的收藏
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <FaCog className="mr-2" />
                          管理后台
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <FaSignOutAlt className="mr-2" />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 transition text-sm font-medium"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition"
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
            <p className="text-gray-400">© {new Date().getFullYear()} Ask Amy. 保留所有权利。</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
