import { Link } from 'react-router-dom'
import { FaHome, FaBook, FaComments, FaNewspaper, FaSearch } from 'react-icons/fa'

export default function MainLayout({ children }) {
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
