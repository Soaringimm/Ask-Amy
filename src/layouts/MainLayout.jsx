import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FaHome, FaComments, FaNewspaper, FaSearch, FaUser, FaSignOutAlt, FaHeart, FaCog, FaVideo } from 'react-icons/fa'
import { HiSparkles } from 'react-icons/hi2'
import { useAuth } from '../contexts/AuthContext'

export default function MainLayout({ children }) {
  const { user, profile, signOut, isAdmin } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const menuRef = useRef(null)
  const location = useLocation()

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { to: '/', icon: FaHome, label: '首页' },
    { to: '/knowledge-base', icon: FaSearch, label: 'IRCC问答' },
    { to: '/articles', icon: FaNewspaper, label: '文章' },
    { to: '/consultation', icon: FaComments, label: '预约咨询' },
    { to: '/meet', icon: FaVideo, label: 'Meet' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/90 backdrop-blur-md shadow-soft border-b border-gray-100/50'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center shadow-glow group-hover:shadow-glow transition-shadow duration-300">
                <HiSparkles className="text-white text-lg" />
              </div>
              <span className="font-display text-xl font-bold gradient-text">
                Ask Amy
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(link.to)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50/50'
                  }`}
                >
                  <link.icon className="text-sm" />
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`p-2 rounded-lg transition-colors ${
                    isActive(link.to)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  <link.icon />
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all duration-200 ${
                      showUserMenu
                        ? 'bg-primary-100'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="avatar"
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center ring-2 ring-primary-200">
                        <FaUser className="text-white text-xs" />
                      </div>
                    )}
                    <span className="hidden lg:inline text-sm font-medium text-gray-700">
                      {profile?.display_name || profile?.email?.split('@')[0] || '用户'}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-soft-lg border border-gray-100 py-2 z-50 animate-scale-in">
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {profile?.display_name || '用户'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {profile?.email || user.email}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        >
                          <FaCog className="mr-3 text-gray-400" />
                          个人设置
                        </Link>
                        <Link
                          to="/favorites"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        >
                          <FaHeart className="mr-3 text-gray-400" />
                          我的收藏
                        </Link>
                        <Link
                          to="/recordings"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        >
                          <FaVideo className="mr-3 text-gray-400" />
                          会议记录
                        </Link>
                        {isAdmin && (
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                          >
                            <FaCog className="mr-3 text-gray-400" />
                            管理后台
                          </Link>
                        )}
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-gray-100 pt-1 mt-1">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <FaSignOutAlt className="mr-3" />
                          退出登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary text-sm py-2"
                  >
                    注册
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16" />

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <footer
        className="relative text-white mt-auto overflow-hidden"
        style={{ backgroundColor: '#1a1f52' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" style={{ backgroundColor: 'rgba(46, 54, 171, 0.3)' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full translate-x-1/3 translate-y-1/2 blur-3xl" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(to bottom right, #7c93f8, #5a6ef2)' }}
                >
                  <HiSparkles className="text-white" />
                </div>
                <span className="font-display text-lg font-bold text-white">Ask Amy</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#c7d4fe' }}>
                专业的移民咨询服务平台，为您提供最新的IRCC信息和专家咨询服务。
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-white mb-4">快速链接</h4>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm transition-colors hover:opacity-80"
                      style={{ color: '#c7d4fe' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">联系我们</h4>
              <p className="text-sm" style={{ color: '#c7d4fe' }}>
                如有任何问题，请通过预约咨询页面联系我们的专业顾问。
              </p>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8" style={{ borderTop: '1px solid rgba(46, 54, 171, 0.5)' }}>
            <p className="text-center text-sm" style={{ color: '#a4b8fc' }}>
              © {new Date().getFullYear()} Ask Amy. 保留所有权利。
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
