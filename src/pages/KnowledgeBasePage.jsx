import { useState, useEffect } from 'react'
import { FaSearch, FaHeart, FaChevronRight, FaArrowLeft } from 'react-icons/fa'

export default function KnowledgeBasePage() {
  const [knowledgeBase, setKnowledgeBase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    loadKnowledgeBase()
  }, [])

  const loadKnowledgeBase = async () => {
    try {
      const response = await fetch('/data/knowledge-base.json')
      const data = await response.json()
      setKnowledgeBase(data)
      console.log('✅ 已加载知识库')
    } catch (error) {
      console.error('无法加载知识库:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
    setSelectedQuestion(null)
  }

  const handleQuestionClick = (question) => {
    setSelectedQuestion(question)
  }

  const handleBack = () => {
    if (selectedQuestion) {
      setSelectedQuestion(null)
    } else if (selectedCategory) {
      setSelectedCategory(null)
    }
  }

  const handleDonate = () => {
    setShowPaymentModal(true)
  }

  // 搜索过滤
  const getFilteredCategories = () => {
    if (!knowledgeBase || !searchQuery) return knowledgeBase?.categories || []

    return knowledgeBase.categories.map(category => ({
      ...category,
      questions: category.questions.filter(q =>
        q.question_cn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.question_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer_cn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer_en.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(category => category.questions.length > 0)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  const filteredCategories = getFilteredCategories()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          知识库 Knowledge Base
        </h1>
        <p className="text-gray-600">
          浏览加拿大移民相关的常见问题和专业解答
        </p>
      </div>

      {/* 搜索框 */}
      <div className="mb-8">
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索问题或关键词... Search questions or keywords..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedCategory(null)
              setSelectedQuestion(null)
            }}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 面包屑导航 */}
      {(selectedCategory || selectedQuestion) && (
        <div className="mb-6 flex items-center space-x-2 text-sm">
          <button
            onClick={() => {
              setSelectedCategory(null)
              setSelectedQuestion(null)
            }}
            className="text-primary-600 hover:underline"
          >
            所有分类
          </button>
          {selectedCategory && (
            <>
              <FaChevronRight className="text-gray-400" />
              <button
                onClick={() => setSelectedQuestion(null)}
                className={`${
                  selectedQuestion ? 'text-primary-600 hover:underline' : 'text-gray-600'
                }`}
              >
                {selectedCategory.title_cn}
              </button>
            </>
          )}
          {selectedQuestion && (
            <>
              <FaChevronRight className="text-gray-400" />
              <span className="text-gray-600">{selectedQuestion.question_cn}</span>
            </>
          )}
        </div>
      )}

      {/* 第一层：分类列表 */}
      {!selectedCategory && !selectedQuestion && (
        <div>
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <p className="text-gray-500">
                {searchQuery ? '没有找到相关内容，请尝试其他关键词' : '暂无内容'}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border-2 border-transparent hover:border-primary-500"
                >
                  <div className="text-5xl mb-4">{category.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {category.title_cn}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">{category.title_en}</p>
                  <p className="text-gray-500 text-sm mb-4">{category.description}</p>
                  <div className="flex items-center text-primary-600 font-semibold">
                    <span>{category.questions.length} 个问题</span>
                    <FaChevronRight className="ml-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 第二层：问题列表 */}
      {selectedCategory && !selectedQuestion && (
        <div>
          <button
            onClick={handleBack}
            className="flex items-center text-primary-600 hover:underline mb-6"
          >
            <FaArrowLeft className="mr-2" />
            返回分类列表
          </button>

          <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-6 rounded-xl mb-6">
            <div className="text-4xl mb-3">{selectedCategory.icon}</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {selectedCategory.title_cn}
            </h2>
            <p className="text-gray-700">{selectedCategory.title_en}</p>
          </div>

          <div className="space-y-4">
            {selectedCategory.questions.map((question, index) => (
              <div
                key={question.id}
                onClick={() => handleQuestionClick(question)}
                className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer border-l-4 border-primary-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="bg-primary-100 text-primary-700 text-sm font-bold px-3 py-1 rounded-full mr-3">
                        Q{index + 1}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {question.question_cn}
                      </h3>
                    </div>
                    <p className="text-gray-600 ml-12">{question.question_en}</p>
                  </div>
                  <FaChevronRight className="text-gray-400 mt-2 ml-4 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 第三层：问题详情 */}
      {selectedQuestion && (
        <div>
          <button
            onClick={handleBack}
            className="flex items-center text-primary-600 hover:underline mb-6"
          >
            <FaArrowLeft className="mr-2" />
            返回问题列表
          </button>

          <div className="bg-white rounded-xl shadow-sm p-8">
            {/* 问题标题 */}
            <div className="mb-8 pb-6 border-b">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                {selectedQuestion.question_cn}
              </h2>
              <p className="text-xl text-gray-600">{selectedQuestion.question_en}</p>
            </div>

            {/* 中文答案 */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1 rounded">
                  中文
                </span>
              </div>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {selectedQuestion.answer_cn}
              </div>
            </div>

            {/* 分隔线 */}
            <div className="border-t my-8"></div>

            {/* 英文答案 */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <span className="bg-blue-100 text-blue-700 text-sm font-bold px-3 py-1 rounded">
                  English
                </span>
              </div>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                {selectedQuestion.answer_en}
              </div>
            </div>

            {/* 打赏按钮 */}
            <div className="border-t pt-6">
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
        </div>
      )}

      {/* 打赏弹窗 */}
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
