import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AdminLayout from '../layouts/AdminLayout'
import { format } from 'date-fns'
import {
  FaComments, FaCheck, FaTimes, FaTrash, FaExternalLinkAlt,
  FaFilter, FaSpinner
} from 'react-icons/fa'

export default function AdminComments() {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('pending') // pending, approved, all
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 })

  useEffect(() => {
    fetchComments()
    fetchStats()
  }, [filter])

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase
        .from('aa_comments')
        .select('*', { count: 'exact', head: true })

      const { count: approved } = await supabase
        .from('aa_comments')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true)

      const { count: pending } = await supabase
        .from('aa_comments')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', false)

      setStats({
        total: total || 0,
        approved: approved || 0,
        pending: pending || 0,
      })
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchComments = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('aa_comments')
        .select(`
          *,
          aa_articles!inner(id, title, slug)
        `)
        .order('created_at', { ascending: false })

      if (filter === 'pending') {
        query = query.eq('is_approved', false)
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true)
      }

      const { data, error } = await query

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError(err.message || '加载评论失败')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      const { error } = await supabase
        .from('aa_comments')
        .update({ is_approved: true })
        .eq('id', id)

      if (error) throw error
      fetchComments()
      fetchStats()
    } catch (err) {
      console.error('Error approving comment:', err)
      alert('审核失败')
    }
  }

  const handleReject = async (id) => {
    try {
      const { error } = await supabase
        .from('aa_comments')
        .update({ is_approved: false })
        .eq('id', id)

      if (error) throw error
      fetchComments()
      fetchStats()
    } catch (err) {
      console.error('Error rejecting comment:', err)
      alert('操作失败')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这条评论吗？')) return

    try {
      const { error } = await supabase
        .from('aa_comments')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchComments()
      fetchStats()
    } catch (err) {
      console.error('Error deleting comment:', err)
      alert('删除失败')
    }
  }

  const handleBulkApprove = async () => {
    const pendingIds = comments.filter(c => !c.is_approved).map(c => c.id)
    if (pendingIds.length === 0) return

    if (!confirm(`确定要批准全部 ${pendingIds.length} 条待审核评论吗？`)) return

    try {
      const { error } = await supabase
        .from('aa_comments')
        .update({ is_approved: true })
        .in('id', pendingIds)

      if (error) throw error
      fetchComments()
      fetchStats()
    } catch (err) {
      console.error('Error bulk approving:', err)
      alert('批量审核失败')
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaComments className="mr-3" /> 评论管理
            </h1>
            <p className="text-gray-600 mt-2">审核和管理文章评论。</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">全部评论</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-500">待审核</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-500">已通过</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { value: 'pending', label: '待审核' },
                { value: 'approved', label: '已通过' },
                { value: 'all', label: '全部' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === option.value
                      ? 'bg-white shadow text-primary-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filter === 'pending' && stats.pending > 0 && (
            <button
              onClick={handleBulkApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <FaCheck className="w-4 h-4" />
              全部通过
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Comments list */}
        {loading ? (
          <div className="text-center py-12">
            <FaSpinner className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FaComments className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {filter === 'pending' ? '没有待审核的评论' : '暂无评论'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`bg-white rounded-xl shadow-sm p-6 ${
                  !comment.is_approved ? 'border-l-4 border-yellow-400' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    {/* Comment meta */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {comment.author_name}
                      </span>
                      {comment.author_email && (
                        <span className="text-sm text-gray-400">
                          {comment.author_email}
                        </span>
                      )}
                      <span className="text-sm text-gray-400">
                        {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm')}
                      </span>
                      {comment.is_approved ? (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          已通过
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                          待审核
                        </span>
                      )}
                    </div>

                    {/* Article reference */}
                    <div className="mb-3">
                      <Link
                        to={`/articles/${comment.aa_articles.slug}`}
                        target="_blank"
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <FaExternalLinkAlt className="w-3 h-3" />
                        {comment.aa_articles.title}
                      </Link>
                    </div>

                    {/* Comment content */}
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>

                    {/* Reply indicator */}
                    {comment.parent_id && (
                      <div className="mt-2 text-sm text-gray-400">
                        (这是一条回复)
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    {!comment.is_approved ? (
                      <button
                        onClick={() => handleApprove(comment.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="通过"
                      >
                        <FaCheck className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReject(comment.id)}
                        className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                        title="撤回审核"
                      >
                        <FaTimes className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="删除"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
