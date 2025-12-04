import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FaSignOutAlt, FaPlus, FaEdit, FaTrash } from 'react-icons/fa'
import { format } from 'date-fns'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('consultations')
  const [consultations, setConsultations] = useState([])
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedConsultation, setSelectedConsultation] = useState(null)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const [articleForm, setArticleForm] = useState({ title: '', content: '' })
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
    fetchData()
  }, [activeTab])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/admin/login')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'consultations') {
        const { data, error } = await supabase
          .from('consultations')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        setConsultations(data || [])
      } else if (activeTab === 'articles') {
        const { data, error } = await supabase
          .from('articles')
          .select('*')
          .order('created_at', { ascending: false })
        if (error) throw error
        setArticles(data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const handleUpdateConsultation = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('consultations')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      fetchData()
      setSelectedConsultation(null)
    } catch (error) {
      console.error('Error updating consultation:', error)
      alert('更新失败')
    }
  }

  const handleCreateArticle = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from('articles')
        .insert([articleForm])

      if (error) throw error
      setShowArticleModal(false)
      setArticleForm({ title: '', content: '' })
      fetchData()
    } catch (error) {
      console.error('Error creating article:', error)
      alert('创建失败')
    }
  }

  const handleDeleteArticle = async (id) => {
    if (!confirm('确定要删除这篇文章吗？')) return

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchData()
    } catch (error) {
      console.error('Error deleting article:', error)
      alert('删除失败')
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      quoted: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      pending: '待报价',
      quoted: '已报价',
      paid: '已支付',
      completed: '已完成',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-primary-600">管理后台</h1>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition"
            >
              <FaSignOutAlt />
              <span>退出</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页 */}
        <div className="flex space-x-4 mb-8 border-b">
          <button
            onClick={() => setActiveTab('consultations')}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === 'consultations'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            咨询管理
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2 font-semibold border-b-2 transition ${
              activeTab === 'articles'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            知识库管理
          </button>
        </div>

        {/* 咨询管理标签页 */}
        {activeTab === 'consultations' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : consultations.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-gray-500">暂无咨询记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <div key={consultation.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {consultation.name}
                        </h3>
                        <p className="text-gray-600">{consultation.email}</p>
                      </div>
                      {getStatusBadge(consultation.status)}
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">问题描述：</p>
                      <p className="text-gray-700">{consultation.question}</p>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                      <span>期望完成：{consultation.deadline}</span>
                      <span>提交时间：{format(new Date(consultation.created_at), 'yyyy-MM-dd HH:mm')}</span>
                    </div>

                    {consultation.quote && (
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="text-sm font-semibold text-blue-900 mb-1">报价信息：</p>
                        <p className="text-blue-800">{consultation.quote}</p>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedConsultation(consultation)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
                      >
                        {consultation.status === 'pending' ? '添加报价' : '更新状态'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 知识库管理标签页 */}
        {activeTab === 'articles' && (
          <div>
            <div className="mb-6">
              <button
                onClick={() => setShowArticleModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center"
              >
                <FaPlus className="mr-2" />
                添加新文章
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : articles.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <p className="text-gray-500">暂无文章</p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <div key={article.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {article.title}
                        </h3>
                        <p className="text-gray-600 line-clamp-2">
                          {article.content?.substring(0, 200)}...
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="text-red-600 hover:text-red-700 p-2"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 更新咨询弹窗 */}
      {selectedConsultation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedConsultation.status === 'pending' ? '添加报价' : '更新咨询状态'}
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.target)
                handleUpdateConsultation(selectedConsultation.id, {
                  quote: formData.get('quote'),
                  status: formData.get('status'),
                })
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  报价信息
                </label>
                <textarea
                  name="quote"
                  rows="3"
                  defaultValue={selectedConsultation.quote || ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="例如：书面回复 - $50 CAD / 电话咨询（约30分钟）- $150 CAD"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  状态
                </label>
                <select
                  name="status"
                  defaultValue={selectedConsultation.status}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="pending">待报价</option>
                  <option value="quoted">已报价</option>
                  <option value="paid">已支付</option>
                  <option value="completed">已完成</option>
                </select>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedConsultation(null)}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 添加文章弹窗 */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">添加新文章</h3>

            <form onSubmit={handleCreateArticle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标题
                </label>
                <input
                  type="text"
                  required
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="输入文章标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  内容
                </label>
                <textarea
                  required
                  rows="10"
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="输入文章内容"
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition"
                >
                  创建
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowArticleModal(false)
                    setArticleForm({ title: '', content: '' })
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
