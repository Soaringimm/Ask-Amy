import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AdminLayout from '../layouts/AdminLayout'
import { format } from 'date-fns'
import {
  FaLightbulb, FaBug, FaInfoCircle, FaSearch,
  FaSpinner, FaTrash, FaEye, FaTimes, FaChevronLeft,
  FaChevronRight, FaPlus, FaImage, FaExternalLinkAlt
} from 'react-icons/fa'
import {
  uploadFeedbackImage,
  getFeedbackImageUrl,
  deleteFeedbackImages,
  validateImageFile,
  MAX_IMAGES_PER_FEEDBACK,
  MAX_IMAGE_SIZE_MB,
  ALLOWED_EXTENSIONS
} from '../lib/feedbackStorage'

const ITEMS_PER_PAGE = 10

// Type config
const TYPE_CONFIG = {
  feature_request: { label: '功能建议', icon: FaLightbulb, color: 'text-blue-600', bg: 'bg-blue-100' },
  bug_report: { label: 'Bug 报告', icon: FaBug, color: 'text-red-600', bg: 'bg-red-100' },
  knowledge_tip: { label: '知识分享', icon: FaInfoCircle, color: 'text-green-600', bg: 'bg-green-100' },
}

// Status config
const STATUS_CONFIG = {
  submitted: { label: '已提交', color: 'text-gray-600', bg: 'bg-gray-100' },
  reviewed: { label: '已审核', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  resolved: { label: '已解决', color: 'text-green-600', bg: 'bg-green-100' },
  closed: { label: '已关闭', color: 'text-gray-500', bg: 'bg-gray-200' },
}

// Priority config
const PRIORITY_CONFIG = {
  low: { label: '低', color: 'text-gray-500', bg: 'bg-gray-100' },
  medium: { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  high: { label: '高', color: 'text-red-600', bg: 'bg-red-100' },
}

export default function AdminFeedback() {
  const { user, profile } = useAuth()
  const [feedbackList, setFeedbackList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [stats, setStats] = useState({ total: 0, submitted: 0, reviewed: 0, resolved: 0 })

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    type: 'feature_request',
    title: '',
    description: '',
    priority: 'medium',
    submitter_name: '',
    submitter_email: '',
  })
  const [createImages, setCreateImages] = useState([])

  // Detail edit state
  const [editStatus, setEditStatus] = useState('')
  const [editPriority, setEditPriority] = useState('')
  const [editComment, setEditComment] = useState('')
  const [editResolution, setEditResolution] = useState('')
  const [imageUrls, setImageUrls] = useState({})
  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    fetchFeedback()
    fetchStats()
  }, [currentPage, searchQuery, filterType, filterStatus, filterPriority])

  const fetchStats = async () => {
    try {
      const { count: total } = await supabase
        .from('aa_feedback').select('*', { count: 'exact', head: true })
      const { count: submitted } = await supabase
        .from('aa_feedback').select('*', { count: 'exact', head: true }).eq('status', 'submitted')
      const { count: reviewed } = await supabase
        .from('aa_feedback').select('*', { count: 'exact', head: true }).eq('status', 'reviewed')
      const { count: resolved } = await supabase
        .from('aa_feedback').select('*', { count: 'exact', head: true }).eq('status', 'resolved')
      setStats({ total: total || 0, submitted: submitted || 0, reviewed: reviewed || 0, resolved: resolved || 0 })
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchFeedback = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('aa_feedback')
        .select('*, aa_feedback_images(*)', { count: 'exact' })

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,submitter_email.ilike.%${searchQuery}%`)
      }
      if (filterType !== 'all') query = query.eq('type', filterType)
      if (filterStatus !== 'all') query = query.eq('status', filterStatus)
      if (filterPriority !== 'all') query = query.eq('priority', filterPriority)

      query = query.order('created_at', { ascending: false })
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      query = query.range(from, from + ITEMS_PER_PAGE - 1)

      const { data, error: fetchError, count } = await query
      if (fetchError) throw fetchError
      setFeedbackList(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching feedback:', err)
      setError('加载反馈列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.description.trim()) {
      alert('请填写标题和描述')
      return
    }
    setActionLoading(true)
    try {
      const { data: feedback, error: createError } = await supabase
        .from('aa_feedback')
        .insert([createForm])
        .select()
        .single()
      if (createError) throw createError

      // Upload images
      for (const file of createImages) {
        const result = await uploadFeedbackImage(file, feedback.id)
        await supabase.from('aa_feedback_images').insert([{
          feedback_id: feedback.id,
          storage_path: result.path,
          filename: result.filename,
          file_size: result.fileSize,
          mime_type: result.mimeType,
        }])
      }

      setShowCreateModal(false)
      setCreateForm({ type: 'feature_request', title: '', description: '', priority: 'medium', submitter_name: '', submitter_email: '' })
      setCreateImages([])
      fetchFeedback()
      fetchStats()
    } catch (err) {
      console.error('Error creating feedback:', err)
      alert('创建失败: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleViewDetail = async (feedback) => {
    setSelectedFeedback(feedback)
    setEditStatus(feedback.status)
    setEditPriority(feedback.priority)
    setEditComment(feedback.admin_comment || '')
    setEditResolution(feedback.resolution_summary || '')
    setImageUrls({})
    setShowDetailModal(true)

    // Load image URLs
    if (feedback.aa_feedback_images?.length > 0) {
      const urls = {}
      for (const img of feedback.aa_feedback_images) {
        const url = await getFeedbackImageUrl(img.storage_path)
        if (url) urls[img.id] = url
      }
      setImageUrls(urls)
    }
  }

  const handleSaveChanges = async () => {
    if (!selectedFeedback) return
    setActionLoading(true)
    try {
      const updates = {}
      if (editStatus !== selectedFeedback.status) updates.status = editStatus
      if (editPriority !== selectedFeedback.priority) updates.priority = editPriority
      if (editComment !== (selectedFeedback.admin_comment || '')) {
        updates.admin_comment = editComment
        updates.admin_comment_at = new Date().toISOString()
      }
      if (editResolution !== (selectedFeedback.resolution_summary || '')) {
        updates.resolution_summary = editResolution
      }

      if (Object.keys(updates).length === 0) {
        setShowDetailModal(false)
        return
      }

      const { error } = await supabase
        .from('aa_feedback')
        .update(updates)
        .eq('id', selectedFeedback.id)
      if (error) throw error

      setShowDetailModal(false)
      fetchFeedback()
      fetchStats()
    } catch (err) {
      console.error('Error updating feedback:', err)
      alert('更新失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedFeedback) return
    setActionLoading(true)
    try {
      // Delete images from storage first
      if (selectedFeedback.aa_feedback_images?.length > 0) {
        await deleteFeedbackImages(selectedFeedback.aa_feedback_images)
      }
      const { error } = await supabase.from('aa_feedback').delete().eq('id', selectedFeedback.id)
      if (error) throw error
      setShowDeleteConfirm(false)
      setShowDetailModal(false)
      setSelectedFeedback(null)
      fetchFeedback()
      fetchStats()
    } catch (err) {
      console.error('Error deleting feedback:', err)
      alert('删除失败')
    } finally {
      setActionLoading(false)
    }
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const validFiles = []
    for (const file of files) {
      if (createImages.length + validFiles.length >= MAX_IMAGES_PER_FEEDBACK) {
        alert(`最多上传 ${MAX_IMAGES_PER_FEEDBACK} 张图片`)
        break
      }
      const validation = validateImageFile(file)
      if (validation.valid) validFiles.push(file)
      else alert(validation.error)
    }
    setCreateImages([...createImages, ...validFiles])
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  const renderTypeBadge = (type) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.feature_request
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" /> {config.label}
      </span>
    )
  }

  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.submitted
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>{config.label}</span>
  }

  const renderPriorityBadge = (priority) => {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>{config.label}</span>
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaLightbulb className="mr-3" /> 意见反馈
            </h1>
            <p className="text-gray-600 mt-2">管理用户提交的功能建议、Bug报告和知识分享。</p>
          </div>
          <button
            onClick={() => {
              setCreateForm({
                type: 'feature_request',
                title: '',
                description: '',
                priority: 'medium',
                submitter_name: profile?.display_name || '',
                submitter_email: user?.email || '',
              })
              setCreateImages([])
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            <FaPlus /> 新建反馈
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">全部</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.submitted}</div>
            <div className="text-sm text-gray-500">已提交</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.reviewed}</div>
            <div className="text-sm text-gray-500">已审核</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-500">已解决</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索标题、描述、邮箱..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1) }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="all">所有类型</option>
              <option value="feature_request">功能建议</option>
              <option value="bug_report">Bug 报告</option>
              <option value="knowledge_tip">知识分享</option>
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1) }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="all">所有状态</option>
              <option value="submitted">已提交</option>
              <option value="reviewed">已审核</option>
              <option value="resolved">已解决</option>
              <option value="closed">已关闭</option>
            </select>
            <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1) }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="all">所有优先级</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>}

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-12"><FaSpinner className="w-8 h-8 animate-spin text-primary-600 mx-auto" /></div>
        ) : feedbackList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <FaLightbulb className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">暂无反馈</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">提交者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">优先级</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {feedbackList.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">{renderTypeBadge(item.type)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate max-w-xs">{item.title}</span>
                        {item.aa_feedback_images?.length > 0 && (
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <FaImage className="w-3 h-3" /> {item.aa_feedback_images.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.submitter_name || item.submitter_email || '-'}
                    </td>
                    <td className="px-6 py-4">{renderStatusBadge(item.status)}</td>
                    <td className="px-6 py-4">{renderPriorityBadge(item.priority)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {format(new Date(item.created_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleViewDetail(item)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition" title="查看详情">
                        <FaEye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  显示 {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} 共 {totalCount} 条
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                    <FaChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 text-sm">{currentPage} / {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50">
                    <FaChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold">新建反馈</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                    <select value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="feature_request">功能建议</option>
                      <option value="bug_report">Bug 报告</option>
                      <option value="knowledge_tip">知识分享</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                    <select value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                  <input type="text" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="简要描述问题或建议" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">描述 *</label>
                  <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={4} placeholder="详细描述..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">提交者</label>
                    <input type="text" value={createForm.submitter_name || '(未设置昵称)'} readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                    <input type="email" value={createForm.submitter_email} readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">附件图片 (最多{MAX_IMAGES_PER_FEEDBACK}张, 每张{MAX_IMAGE_SIZE_MB}MB以内)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {createImages.map((file, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setCreateImages(createImages.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full text-xs">
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {createImages.length < MAX_IMAGES_PER_FEEDBACK && (
                      <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-500">
                        <FaPlus className="text-gray-400" />
                        <input type="file" accept={ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',')} multiple onChange={handleImageSelect} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
                <button onClick={handleCreate} disabled={actionLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                  {actionLoading && <FaSpinner className="animate-spin" />} 创建
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                  {renderTypeBadge(selectedFeedback.type)}
                  <h2 className="text-xl font-bold">{selectedFeedback.title}</h2>
                </div>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <p className="text-sm text-gray-500 mb-2">
                    提交者: {selectedFeedback.submitter_name || '-'} ({selectedFeedback.submitter_email || '-'}) · {format(new Date(selectedFeedback.created_at), 'yyyy-MM-dd HH:mm')}
                  </p>
                  <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-wrap">{selectedFeedback.description}</div>
                </div>

                {/* Images */}
                {selectedFeedback.aa_feedback_images?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">附件 ({selectedFeedback.aa_feedback_images.length})</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.aa_feedback_images.map((img) => (
                        <button key={img.id} onClick={() => imageUrls[img.id] && setPreviewImage(imageUrls[img.id])}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border hover:border-primary-500">
                          {imageUrls[img.id] ? (
                            <img src={imageUrls[img.id]} alt={img.filename} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                              <FaImage className="text-gray-400" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="submitted">已提交</option>
                      <option value="reviewed">已审核</option>
                      <option value="resolved">已解决</option>
                      <option value="closed">已关闭</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">优先级</label>
                    <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="low">低</option>
                      <option value="medium">中</option>
                      <option value="high">高</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">管理员回复</label>
                  <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="给用户的回复..." />
                  {selectedFeedback.admin_comment_at && (
                    <p className="text-xs text-gray-400 mt-1">上次回复: {format(new Date(selectedFeedback.admin_comment_at), 'yyyy-MM-dd HH:mm')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">解决摘要 (内部)</label>
                  <textarea value={editResolution} onChange={(e) => setEditResolution(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="技术解决方案记录..." />
                </div>
              </div>
              <div className="p-6 border-t flex justify-between">
                <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                  <FaTrash /> 删除
                </button>
                <div className="flex gap-3">
                  <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
                  <button onClick={handleSaveChanges} disabled={actionLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2">
                    {actionLoading && <FaSpinner className="animate-spin" />} 保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {previewImage && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setPreviewImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh]">
              <img src={previewImage} alt="Preview" className="max-h-[90vh] object-contain rounded-lg" />
              <button onClick={() => window.open(previewImage, '_blank')}
                className="absolute top-4 right-4 px-3 py-2 bg-white/90 rounded-lg flex items-center gap-2 hover:bg-white">
                <FaExternalLinkAlt /> 新窗口打开
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold mb-2">确认删除</h3>
              <p className="text-gray-600 mb-4">确定要删除这条反馈吗？此操作无法撤销。</p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
                <button onClick={handleDelete} disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                  {actionLoading && <FaSpinner className="animate-spin" />} 删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
