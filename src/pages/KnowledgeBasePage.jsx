import { useState, useEffect } from 'react'
import { FaSearch, FaHeart, FaArrowLeft, FaSpinner } from 'react-icons/fa'
import { searchQuestions, getQuestionDetail } from '../lib/ircc'

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  
  const [selectedQuestionId, setSelectedQuestionId] = useState(null)
  const [questionDetail, setQuestionDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const handleSearch = async (e) => {
    e?.preventDefault()
    
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setHasSearched(true)
    
    try {
      const data = await searchQuestions(query)
      setResults(data)
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch detail when a question is selected
  useEffect(() => {
    async function loadDetail() {
      if (!selectedQuestionId) {
        setQuestionDetail(null)
        return
      }

      setDetailLoading(true)
      try {
        // Default to Chinese (zh) as per project context
        const data = await getQuestionDetail(selectedQuestionId, 'zh')
        setQuestionDetail(data)
      } catch {
        setError('Failed to load question details.')
      } finally {
        setDetailLoading(false)
      }
    }

    loadDetail()
  }, [selectedQuestionId])

  const handleDonate = () => {
    setShowPaymentModal(true)
  }

  const handleBack = () => {
    setSelectedQuestionId(null)
    setQuestionDetail(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          知识库 Knowledge Base
        </h1>
        <p className="text-gray-600">
          Search official IRCC answers (Powered by IRCC Help Centre API)
        </p>
      </div>

      {/* Detail View */}
      {selectedQuestionId ? (
        <div>
          <button
            onClick={handleBack}
            className="flex items-center text-primary-600 hover:underline mb-6"
          >
            <FaArrowLeft className="mr-2" />
            返回搜索 Results
          </button>

          {detailLoading ? (
             <div className="text-center py-20">
              <FaSpinner className="animate-spin h-10 w-10 text-primary-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading details...</p>
            </div>
          ) : questionDetail ? (
            <div className="bg-white rounded-xl shadow-sm p-8">
              {/* Title */}
              <div className="mb-8 pb-6 border-b">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  {questionDetail.title}
                </h2>
                <div className="text-sm text-gray-500">
                  Question ID: {questionDetail.qnum} | Last Updated: {questionDetail.last_modified || 'N/A'}
                </div>
              </div>

              {/* Content */}
              <div 
                className="prose max-w-none text-gray-700"
                dangerouslySetInnerHTML={{ __html: questionDetail.content }}
              />

              {/* Donate Section */}
              <div className="border-t mt-12 pt-6">
                <p className="text-gray-600 mb-4">
                  如果这个回答对您有帮助，欢迎自愿打赏支持
                </p>
                <button
                  onClick={handleDonate}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition flex items-center"
                >
                  <FaHeart className="mr-2" />
                  打赏支持 Donate
                </button>
              </div>
            </div>
          ) : (
            <div className="text-red-500">Error loading details.</div>
          )}
        </div>
      ) : (
        /* Search View */
        <div>
          {/* Search Input Form */}
          <form onSubmit={handleSearch} className="mb-8 relative flex gap-2">
            <div className="relative flex-grow">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="输入关键词搜索 (e.g. 学签, work permit)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <FaSpinner className="animate-spin h-8 w-8 text-gray-400 mx-auto" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Results List */}
          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((item) => (
                <div
                  key={item.qnum}
                  onClick={() => setSelectedQuestionId(item.qnum)}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border-l-4 border-primary-500 hover:bg-gray-50"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-2">
                    {item.snippet.replace(/<[^>]*>|\[.*?\]/g, '')}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && results.length === 0 && hasSearched && (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500">没有找到相关结果</p>
            </div>
          )}

          {/* Initial State */}
          {!loading && !error && !hasSearched && (
            <div className="text-center py-20 text-gray-500">
              <p>请输入关键词并点击搜索</p>
              <p className="text-sm mt-2">支持中文和英文搜索</p>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              扫码打赏 Donate
            </h3>
            <p className="text-gray-600 mb-6">
              请使用微信或支付宝扫描下方二维码进行打赏
            </p>
            <div className="bg-gray-100 h-64 flex items-center justify-center rounded-lg mb-6">
              <img
                src="/payment-qr.png"
                alt="收款码"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'block'
                }}
              />
              <p className="text-gray-400 hidden">
                收款码图片未找到，请将收款码保存为 public/payment-qr.png
              </p>
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
            >
              关闭 Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}