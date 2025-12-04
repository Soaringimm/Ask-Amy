import { Link } from 'react-router-dom'
import { FaBook, FaComments, FaCheckCircle } from 'react-icons/fa'

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            专业咨询服务平台
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            获取专业建议，解决您的问题。浏览知识库或预约个性化咨询。
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/knowledge-base"
              className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              浏览知识库
            </Link>
            <Link
              to="/consultation"
              className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold border-2 border-primary-600 hover:bg-primary-50 transition"
            >
              预约咨询
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* 知识库 */}
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
            <div className="flex items-center mb-4">
              <FaBook className="text-4xl text-primary-600 mr-4" />
              <h2 className="text-2xl font-bold text-gray-900">知识库</h2>
            </div>
            <p className="text-gray-600 mb-4">
              浏览我们精心整理的常见问题解答和专业建议文章。
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-gray-700">
                <FaCheckCircle className="text-green-500 mr-2" />
                免费访问所有文章
              </li>
              <li className="flex items-center text-gray-700">
                <FaCheckCircle className="text-green-500 mr-2" />
                快速搜索功能
              </li>
              <li className="flex items-center text-gray-700">
                <FaCheckCircle className="text-green-500 mr-2" />
                自愿打赏支持
              </li>
            </ul>
            <Link
              to="/knowledge-base"
              className="text-primary-600 font-semibold hover:underline"
            >
              立即查看 →
            </Link>
          </div>

          {/* 个性化咨询 */}
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition">
            <div className="flex items-center mb-4">
              <FaComments className="text-4xl text-primary-600 mr-4" />
              <h2 className="text-2xl font-bold text-gray-900">个性化咨询</h2>
            </div>
            <p className="text-gray-600 mb-4">
              提交您的具体问题，获得专业的个性化解答和建议。
            </p>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center text-gray-700">
                <FaCheckCircle className="text-green-500 mr-2" />
                针对性解决方案
              </li>
              <li className="flex items-center text-gray-700">
                <FaCheckCircle className="text-green-500 mr-2" />
                书面或电话咨询
              </li>
              <li className="flex items-center text-gray-700">
                <FaCheckCircle className="text-green-500 mr-2" />
                灵活的deadline
              </li>
            </ul>
            <Link
              to="/consultation"
              className="text-primary-600 font-semibold hover:underline"
            >
              提交咨询 →
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            如何使用
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">选择服务</h3>
              <p className="text-gray-600">
                浏览知识库或提交个性化咨询请求
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">获取报价</h3>
              <p className="text-gray-600">
                知识库可自愿打赏，咨询将收到定制报价
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">获得解答</h3>
              <p className="text-gray-600">
                付款后即可获得专业解答和建议
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
