import { useState, useRef } from 'react'
import { FaSearch, FaHeart, FaArrowLeft, FaSpinner, FaGlobeAmericas, FaQuestionCircle } from 'react-icons/fa'
import { HiSparkles } from 'react-icons/hi2'
import { useIRCCSearch, useIRCCDetail } from '../hooks/useIRCC'

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const isComposingRef = useRef(false)

  // Cached queries
  const {
    data: searchData,
    isLoading: loading,
    error: searchError,
    isFetched: hasSearched
  } = useIRCCSearch(searchTerm)

  const results = searchData?.results || []
  const currentLang = searchData?.lang || 'zh'

  const {
    data: questionDetail,
    isLoading: detailLoading,
    error: detailError
  } = useIRCCDetail(selectedQuestionId, currentLang)

  const error = searchError || detailError

  const handleSearch = (e) => {
    e?.preventDefault()
    if (!query.trim()) return
    setSearchTerm(query.trim())
  }

  const handleInputChange = (e) => {
    setQuery(e.target.value)
  }

  const handleCompositionStart = () => {
    isComposingRef.current = true
  }

  const handleCompositionEnd = () => {
    isComposingRef.current = false
  }

  const handleDonate = () => {
    setShowPaymentModal(true)
  }

  const handleBack = () => {
    setSelectedQuestionId(null)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-accent-50/30 py-16 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-primary-100 shadow-soft mb-6">
            <FaGlobeAmericas className="text-primary-500" />
            <span className="text-sm font-medium text-primary-700">IRCC 官方问答库</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-950 mb-4">
            <span className="gradient-text">智能搜索</span> 移民问答
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-10">
            搜索加拿大移民局官方问答，支持中英文自动检测
          </p>

          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="输入中文或英文关键词..."
                value={query}
                onChange={handleInputChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                className="w-full pl-12 pr-32 py-4 bg-white border border-gray-200 rounded-2xl shadow-soft focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 text-gray-900 placeholder-gray-400 transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:shadow-glow transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                >
                  {loading ? '搜索中...' : '搜索'}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              例如：学签、work permit、express entry
            </p>
          </form>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Detail View */}
        {selectedQuestionId ? (
          <div className="animate-fade-in">
            <button
              onClick={handleBack}
              className="flex items-center text-primary-600 hover:text-primary-700 font-medium mb-6 group"
            >
              <FaArrowLeft className="mr-2 transform group-hover:-translate-x-1 transition-transform" />
              返回搜索结果
            </button>

            {detailLoading ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
                  <FaSpinner className="animate-spin h-8 w-8 text-primary-600" />
                </div>
                <p className="text-gray-600">加载中...</p>
              </div>
            ) : questionDetail ? (
              <div className="card p-8">
                {/* Title */}
                <div className="mb-8 pb-6 border-b border-gray-100">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-primary-950 mb-4">
                    {questionDetail.title}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    <span className="badge badge-primary">
                      ID: {questionDetail.qnum}
                    </span>
                    <span className="badge bg-gray-100 text-gray-700">
                      {currentLang === 'zh' ? '中文' : 'English'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div
                  className="prose prose-lg max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: questionDetail.content }}
                />

                {/* Donate Section */}
                <div className="border-t border-gray-100 mt-12 pt-8">
                  <div className="bg-gradient-to-r from-accent-50 to-accent-100/50 rounded-2xl p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-soft mb-4">
                      <FaHeart className="text-accent-500 text-xl" />
                    </div>
                    <p className="text-gray-700 mb-4">
                      如果这个回答对您有帮助，欢迎自愿打赏支持
                    </p>
                    <button
                      onClick={handleDonate}
                      className="btn-accent"
                    >
                      <FaHeart className="mr-2" />
                      打赏支持
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-red-500">
                加载详情失败。
              </div>
            )}
          </div>
        ) : (
          /* Search Results View */
          <div>
            {/* Loading State */}
            {loading && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4 animate-pulse">
                  <FaSearch className="h-8 w-8 text-primary-400" />
                </div>
                <p className="text-gray-500">搜索中...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-700">搜索失败，请重试。</p>
              </div>
            )}

            {/* Results List */}
            {!loading && results.length > 0 && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-gray-500">
                    找到 <span className="font-semibold text-primary-600">{results.length}</span> 个结果
                  </p>
                  <span className="badge bg-primary-100 text-primary-700">
                    {currentLang === 'zh' ? '中文' : 'English'}
                  </span>
                </div>
                <div className="space-y-4">
                  {results.map((item, index) => (
                    <div
                      key={item.qnum}
                      onClick={() => setSelectedQuestionId(item.qnum)}
                      className="card card-hover p-6 cursor-pointer group animate-fade-in-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center group-hover:from-primary-200 group-hover:to-primary-100 transition-colors">
                          <FaQuestionCircle className="text-primary-500" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {item.snippet.replace(/<[^>]*>|\[.*?\]/g, '')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && results.length === 0 && hasSearched && searchTerm && (
              <div className="text-center py-16 card">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
                  <FaSearch className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-lg">没有找到相关结果</p>
                <p className="text-gray-400 text-sm mt-2">请尝试使用不同的关键词</p>
              </div>
            )}

            {/* Initial State */}
            {!loading && !error && !searchTerm && (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 mb-6">
                  <HiSparkles className="h-10 w-10 text-primary-500" />
                </div>
                <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                  开始搜索
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  输入中文返回中文结果，输入英文返回英文结果。
                  <br />
                  我们会自动检测您的搜索语言。
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-soft-lg p-8 max-w-md w-full mx-4 animate-scale-in">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-400 shadow-glow-accent mb-4">
                <FaHeart className="text-white text-2xl" />
              </div>
              <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
                扫码打赏
              </h3>
              <p className="text-gray-600">
                请使用微信或支付宝扫描下方二维码
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 h-64 flex items-center justify-center rounded-xl mb-6">
              <img
                src="/payment-qr.png"
                alt="收款码"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <p className="text-gray-400 hidden text-center p-4">
                收款码图片未找到
                <br />
                <span className="text-sm">请将收款码保存为 public/payment-qr.png</span>
              </p>
            </div>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full btn-secondary"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
