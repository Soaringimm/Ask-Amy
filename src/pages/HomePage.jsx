import { Link } from 'react-router-dom'
import { FaBook, FaComments, FaCheckCircle, FaArrowRight, FaStar } from 'react-icons/fa'
import { HiSparkles } from 'react-icons/hi2'

export default function HomePage() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section with mesh gradient */}
      <section className="relative hero-gradient mesh-gradient min-h-[85vh] flex items-center">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-primary-100 shadow-soft mb-8 animate-fade-in-down">
              <HiSparkles className="text-accent-500" />
              <span className="text-sm font-medium text-primary-700">专业移民咨询服务</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-primary-950 mb-6 animate-fade-in-up text-balance">
              您的<span className="gradient-text">移民之路</span>
              <br />
              从这里启航
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto animate-fade-in-up stagger-2 leading-relaxed">
              获取专业建议，解决您的移民问题。
              <br className="hidden md:block" />
              浏览 IRCC 官方问答库或预约个性化咨询服务。
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up stagger-3">
              <Link to="/knowledge-base" className="btn-primary group">
                <FaBook className="mr-2" />
                IRCC 问答搜索
                <FaArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/consultation" className="btn-secondary group">
                <FaComments className="mr-2" />
                预约咨询
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap justify-center items-center gap-8 text-gray-500 animate-fade-in stagger-4">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-white flex items-center justify-center text-white text-xs font-semibold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-sm">1000+ 用户信赖</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <FaStar key={i} className="text-accent-400 w-4 h-4" />
                ))}
                <span className="text-sm ml-2">4.9 评分</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-950 mb-4">
              我们的服务
            </h2>
            <div className="section-divider mb-6" />
            <p className="text-gray-600 max-w-2xl mx-auto">
              为您提供全方位的移民咨询支持
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 知识库 Card */}
            <div className="group card card-hover p-8 relative overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />

              <div className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-glow mb-6">
                  <FaBook className="text-2xl" />
                </div>

                <h3 className="font-display text-2xl font-bold text-primary-950 mb-3">
                  IRCC 问答库
                </h3>

                <p className="text-gray-600 mb-6 leading-relaxed">
                  浏览加拿大移民局官方问答，支持中英文搜索，自动检测语言。
                </p>

                <ul className="space-y-3 mb-8">
                  {['免费访问官方问答', '智能中英文搜索', '实时更新数据'].map((item, i) => (
                    <li key={i} className="flex items-center text-gray-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-3">
                        <FaCheckCircle className="text-green-500 text-xs" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/knowledge-base"
                  className="inline-flex items-center text-primary-600 font-semibold link-underline group/link"
                >
                  开始搜索
                  <FaArrowRight className="ml-2 transform group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* 个性化咨询 Card */}
            <div className="group card card-hover p-8 relative overflow-hidden">
              {/* Decorative gradient */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-accent-100 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />

              <div className="relative">
                <div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-white mb-6"
                  style={{ background: 'linear-gradient(to bottom right, #f59e0b, #fbbf24)', boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)' }}
                >
                  <FaComments className="text-2xl" />
                </div>

                <h3 className="font-display text-2xl font-bold text-primary-950 mb-3">
                  个性化咨询
                </h3>

                <p className="text-gray-600 mb-6 leading-relaxed">
                  提交您的具体问题，获得专业持牌顾问的个性化解答和建议。
                </p>

                <ul className="space-y-3 mb-8">
                  {['一对一专业解答', '持牌顾问服务', '灵活预约时间'].map((item, i) => (
                    <li key={i} className="flex items-center text-gray-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mr-3">
                        <FaCheckCircle className="text-green-500 text-xs" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/consultation"
                  className="inline-flex items-center text-primary-600 font-semibold link-underline group/link"
                >
                  预约咨询
                  <FaArrowRight className="ml-2 transform group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-surface-50 to-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 mesh-gradient opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-950 mb-4">
              如何使用
            </h2>
            <div className="section-divider mb-6" />
            <p className="text-gray-600 max-w-2xl mx-auto">
              简单三步，开启您的移民咨询之旅
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: '选择服务', desc: '浏览 IRCC 问答库或提交个性化咨询请求' },
              { step: '02', title: '获取方案', desc: '免费搜索官方问答，咨询服务将收到定制方案' },
              { step: '03', title: '获得解答', desc: '获取专业解答和建议，助力您的移民之路' },
            ].map((item, i) => (
              <div key={i} className="group text-center">
                <div className="relative inline-block mb-6">
                  {/* Step number background */}
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center mx-auto transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <span className="font-display text-3xl font-bold gradient-text">{item.step}</span>
                  </div>
                  {/* Connector line */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gradient-to-r from-primary-200 to-transparent -translate-y-1/2 ml-4" />
                  )}
                </div>
                <h3 className="font-display text-xl font-bold text-primary-950 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-accent-400/10 rounded-full translate-x-1/3 translate-y-1/3" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6">
            准备好开始您的移民咨询了吗？
          </h2>
          <p className="text-primary-100 text-lg mb-10 max-w-2xl mx-auto">
            无论是简单的问题查询还是复杂的移民规划，我们都能为您提供专业支持。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/knowledge-base"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-primary-600 font-semibold rounded-xl shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5 transition-all duration-300"
            >
              免费搜索问答
            </Link>
            <Link
              to="/consultation"
              className="inline-flex items-center justify-center px-8 py-4 bg-accent-400 text-white font-semibold rounded-xl shadow-soft hover:shadow-glow-accent transform hover:-translate-y-0.5 transition-all duration-300"
            >
              预约专业咨询
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
