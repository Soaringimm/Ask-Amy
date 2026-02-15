import { useState, useEffect } from 'react'
import {
  FaClock,
  FaCalendar,
  FaChevronDown,
  FaEdit,
  FaTrash,
  FaSave,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaExclamationCircle,
  FaMicrophone,
  FaFileAlt
} from 'react-icons/fa'
import { HiSparkles } from 'react-icons/hi2'
import { useAuth } from '../contexts/AuthContext'
import { getRecordings, updateRecording, deleteRecording } from '../lib/meetRecording'

export default function RecordingsPage() {
  const { user } = useAuth()
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  useEffect(() => {
    if (user) {
      loadRecordings()
    }
  }, [user])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const data = await getRecordings(user.id)
      setRecordings(data || [])
    } catch (err) {
      console.error('Failed to load recordings:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
    setEditingId(null)
  }

  const startEdit = (recording) => {
    setEditingId(recording.id)
    setEditForm({
      topic: recording.topic,
      transcript: recording.transcript || '',
      summary: recording.summary || {}
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleSaveEdit = async (id) => {
    try {
      setSavingId(id)
      const updated = await updateRecording(id, {
        topic: editForm.topic,
        transcript: editForm.transcript,
        summary: editForm.summary
      })
      setRecordings(recordings.map(r => r.id === id ? updated : r))
      setEditingId(null)
      setEditForm({})
    } catch (err) {
      console.error('Failed to save recording edit:', err)
      alert('保存失败，请重试')
    } finally {
      setSavingId(null)
    }
  }

  const confirmDelete = async () => {
    const id = deleteConfirmId
    if (!id) return
    setDeleteConfirmId(null)

    try {
      setDeletingId(id)
      await deleteRecording(id)
      setRecordings(recordings.filter(r => r.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (err) {
      console.error('Failed to delete recording:', err)
      alert('删除失败，请重试')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDelete = (id) => {
    setDeleteConfirmId(id)
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (summary) => {
    if (!summary) return null

    const status = summary.status || 'done'

    if (status === 'processing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <FaSpinner className="animate-spin" size={10} />
          处理中
        </span>
      )
    }

    if (status === 'error') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <FaExclamationCircle size={10} />
          处理失败
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <FaCheckCircle size={10} />
        已完成
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FaMicrophone className="text-2xl" />
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tight">
              会议记录
            </h1>
          </div>
          <p className="text-primary-100 text-lg max-w-2xl">
            查看、编辑和管理您的历史会议录音和摘要
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {recordings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 mx-auto mb-6 flex items-center justify-center">
              <FaMicrophone className="text-3xl text-primary-600" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-gray-900 mb-3">
              还没有会议记录
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              开始您的第一场会议，录音后会自动生成会议记录和摘要
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording, index) => {
              const isExpanded = expandedId === recording.id
              const isEditing = editingId === recording.id
              const isSaving = savingId === recording.id
              const isDeleting = deletingId === recording.id
              const summary = recording.summary || {}

              return (
                <div
                  key={recording.id}
                  className="card overflow-hidden transition-all duration-300 hover:shadow-soft-lg"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'slideInUp 0.5s ease-out forwards',
                    opacity: 0
                  }}
                >
                  {/* Header */}
                  <div
                    className="p-6 cursor-pointer select-none"
                    onClick={() => !isEditing && toggleExpand(recording.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editForm.topic}
                              onChange={(e) => setEditForm({ ...editForm, topic: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-xl font-display font-semibold text-gray-900 bg-transparent border-b-2 border-primary-300 focus:border-primary-600 outline-none transition-colors"
                              placeholder="会议主题"
                            />
                          ) : (
                            <h3 className="text-xl font-display font-semibold text-gray-900 truncate">
                              {recording.topic || '未命名会议'}
                            </h3>
                          )}
                          {getStatusBadge(summary)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <FaClock className="text-gray-400" size={12} />
                            {formatDuration(recording.duration_seconds || 0)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <FaCalendar className="text-gray-400" size={12} />
                            {formatDate(recording.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSaveEdit(recording.id)
                              }}
                              disabled={isSaving}
                              className="p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:bg-gray-400"
                              title="保存"
                            >
                              {isSaving ? <FaSpinner className="animate-spin" size={14} /> : <FaSave size={14} />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelEdit()
                              }}
                              className="p-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                              title="取消"
                            >
                              <FaTimes size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                startEdit(recording)
                              }}
                              className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                              title="编辑"
                            >
                              <FaEdit size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(recording.id)
                              }}
                              disabled={isDeleting}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:bg-gray-200"
                              title="删除"
                            >
                              {isDeleting ? <FaSpinner className="animate-spin" size={14} /> : <FaTrash size={14} />}
                            </button>
                          </>
                        )}

                        <button
                          className={`p-2 rounded-lg transition-all ${
                            isExpanded
                              ? 'bg-primary-100 text-primary-700 rotate-180'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <FaChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white">
                      <div className="p-6 space-y-6">
                        {/* Summary Section */}
                        {summary.status === 'done' && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-primary-700 mb-3">
                              <HiSparkles className="text-xl" />
                              <h4 className="text-lg font-display font-semibold">会议摘要</h4>
                            </div>

                            {isEditing ? (
                              <div className="space-y-4">
                                {/* Title */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">标题</label>
                                  <input
                                    type="text"
                                    value={editForm.summary?.title || ''}
                                    onChange={(e) => setEditForm({
                                      ...editForm,
                                      summary: { ...editForm.summary, title: e.target.value }
                                    })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  />
                                </div>

                                {/* Summary */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">概述</label>
                                  <textarea
                                    value={editForm.summary?.summary || ''}
                                    onChange={(e) => setEditForm({
                                      ...editForm,
                                      summary: { ...editForm.summary, summary: e.target.value }
                                    })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                  />
                                </div>

                                {/* Key Points */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">关键点</label>
                                  <textarea
                                    value={(editForm.summary?.keyPoints || []).join('\n')}
                                    onChange={(e) => setEditForm({
                                      ...editForm,
                                      summary: {
                                        ...editForm.summary,
                                        keyPoints: e.target.value.split('\n').filter(Boolean)
                                      }
                                    })}
                                    rows={4}
                                    placeholder="每行一个要点"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                                  />
                                </div>

                                {/* Action Items */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">行动项</label>
                                  <textarea
                                    value={(editForm.summary?.actionItems || []).join('\n')}
                                    onChange={(e) => setEditForm({
                                      ...editForm,
                                      summary: {
                                        ...editForm.summary,
                                        actionItems: e.target.value.split('\n').filter(Boolean)
                                      }
                                    })}
                                    rows={4}
                                    placeholder="每行一个行动项"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                                  />
                                </div>

                                {/* Decisions */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">决策</label>
                                  <textarea
                                    value={(editForm.summary?.decisions || []).join('\n')}
                                    onChange={(e) => setEditForm({
                                      ...editForm,
                                      summary: {
                                        ...editForm.summary,
                                        decisions: e.target.value.split('\n').filter(Boolean)
                                      }
                                    })}
                                    rows={4}
                                    placeholder="每行一个决策"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid md:grid-cols-2 gap-6">
                                {/* Left Column */}
                                <div className="space-y-4">
                                  {summary.title && (
                                    <div className="p-4 rounded-xl bg-primary-50 border border-primary-100">
                                      <h5 className="text-sm font-medium text-primary-700 mb-2">会议标题</h5>
                                      <p className="text-gray-900 font-medium">{summary.title}</p>
                                    </div>
                                  )}

                                  {summary.summary && (
                                    <div className="p-4 rounded-xl bg-white border border-gray-200">
                                      <h5 className="text-sm font-medium text-gray-700 mb-2">概述</h5>
                                      <p className="text-gray-600 text-sm leading-relaxed">{summary.summary}</p>
                                    </div>
                                  )}

                                  {summary.keyPoints && summary.keyPoints.length > 0 && (
                                    <div className="p-4 rounded-xl bg-white border border-gray-200">
                                      <h5 className="text-sm font-medium text-gray-700 mb-3">关键点</h5>
                                      <ul className="space-y-2">
                                        {summary.keyPoints.map((point, i) => (
                                          <li key={i} className="flex gap-2 text-sm text-gray-600">
                                            <span className="text-primary-500 mt-1">•</span>
                                            <span className="flex-1">{point}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                  {summary.actionItems && summary.actionItems.length > 0 && (
                                    <div className="p-4 rounded-xl bg-accent-50 border border-accent-100">
                                      <h5 className="text-sm font-medium text-accent-700 mb-3">行动项</h5>
                                      <ul className="space-y-2">
                                        {summary.actionItems.map((item, i) => (
                                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                                            <span className="text-accent-500 font-bold">→</span>
                                            <span className="flex-1">{item}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {summary.decisions && summary.decisions.length > 0 && (
                                    <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                                      <h5 className="text-sm font-medium text-green-700 mb-3">决策</h5>
                                      <ul className="space-y-2">
                                        {summary.decisions.map((decision, i) => (
                                          <li key={i} className="flex gap-2 text-sm text-gray-700">
                                            <span className="text-green-500">✓</span>
                                            <span className="flex-1">{decision}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Transcript Section */}
                        {recording.transcript && (
                          <div className="border-t border-gray-200 pt-6">
                            <div className="flex items-center gap-2 text-gray-700 mb-4">
                              <FaFileAlt className="text-lg" />
                              <h4 className="text-lg font-display font-semibold">对话记录</h4>
                            </div>

                            {isEditing ? (
                              <textarea
                                value={editForm.transcript}
                                onChange={(e) => setEditForm({ ...editForm, transcript: e.target.value })}
                                rows={12}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed"
                                placeholder="会议对话文本..."
                              />
                            ) : (
                              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 font-body max-h-96 overflow-y-auto">
                                  {recording.transcript}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Error State */}
                        {summary.status === 'error' && (
                          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                            <FaExclamationCircle className="text-3xl text-red-500 mx-auto mb-3" />
                            <h5 className="text-lg font-semibold text-red-900 mb-2">处理失败</h5>
                            <p className="text-sm text-red-700">
                              {summary.error || '录音处理时出现错误，请稍后重试'}
                            </p>
                          </div>
                        )}

                        {/* Processing State */}
                        {summary.status === 'processing' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                            <FaSpinner className="animate-spin text-3xl text-blue-500 mx-auto mb-3" />
                            <h5 className="text-lg font-semibold text-blue-900 mb-2">正在处理</h5>
                            <p className="text-sm text-blue-700">
                              正在转录和分析会议内容，请稍候...
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <FaTrash className="text-red-600 text-xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">删除会议记录</h3>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">确定要删除这条会议记录吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium">取消</button>
              <button onClick={confirmDelete} className="px-6 py-3 text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors font-medium shadow-lg shadow-red-500/30">确定删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Animations */}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
