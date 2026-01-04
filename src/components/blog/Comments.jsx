import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FaUser, FaReply, FaSpinner, FaCheck } from 'react-icons/fa'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// Comment form component
function CommentForm({ articleId, parentId = null, onSuccess, onCancel }) {
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Pre-fill for logged-in users
  useEffect(() => {
    if (user && profile) {
      setName(profile.display_name || profile.email?.split('@')[0] || '')
      setEmail(profile.email || user.email || '')
    }
  }, [user, profile])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const commentData = {
        article_id: articleId,
        parent_id: parentId,
        author_name: name,
        author_email: email,
        content: content,
      }

      // Add user_id for logged-in users
      if (user) {
        commentData.user_id = user.id
      }

      const { error: submitError } = await supabase.from('aa_comments').insert([commentData])

      if (submitError) throw submitError

      setSuccess(true)
      setContent('')
      // Only reset name/email for guests
      if (!user) {
        setName('')
        setEmail('')
      }

      setTimeout(() => {
        setSuccess(false)
        if (onSuccess) onSuccess()
      }, 2000)
    } catch (err) {
      console.error('Error submitting comment:', err)
      setError('评论提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
        <FaCheck className="w-4 h-4" />
        评论已提交，等待审核后显示
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Show user info or guest input fields */}
      {user ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <FaUser className="text-primary-600" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{profile?.display_name || profile?.email?.split('@')[0]}</p>
            <p className="text-sm text-gray-500">以登录身份评论</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              昵称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="您的昵称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱（不公开）
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          评论内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="写下您的评论..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {submitting ? (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              提交中...
            </>
          ) : (
            '发表评论'
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            取消
          </button>
        )}
        {!user && !onCancel && (
          <span className="text-sm text-gray-500">
            <Link to="/login" className="text-primary-600 hover:text-primary-700">登录</Link>
            {' '}后评论更方便
          </span>
        )}
      </div>
    </form>
  )
}

// Single comment component
function Comment({ comment, articleId, level = 0 }) {
  const [showReplyForm, setShowReplyForm] = useState(false)

  return (
    <div className={`${level > 0 ? 'ml-8 mt-4' : ''}`}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
          <FaUser className="w-5 h-5 text-gray-400" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{comment.author_name}</span>
            <span className="text-sm text-gray-400">
              {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm')}
            </span>
          </div>
          <p className="text-gray-700 mb-2">{comment.content}</p>

          {level < 2 && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <FaReply className="w-3 h-3" />
              回复
            </button>
          )}

          {showReplyForm && (
            <div className="mt-4">
              <CommentForm
                articleId={articleId}
                parentId={comment.id}
                onSuccess={() => setShowReplyForm(false)}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  articleId={articleId}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Comments section component
export function Comments({ articleId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComments()
  }, [articleId])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('aa_comments')
        .select('*')
        .eq('article_id', articleId)
        .eq('is_approved', true)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Build comment tree
      const commentMap = {}
      const rootComments = []

      data.forEach((comment) => {
        commentMap[comment.id] = { ...comment, replies: [] }
      })

      data.forEach((comment) => {
        if (comment.parent_id && commentMap[comment.parent_id]) {
          commentMap[comment.parent_id].replies.push(commentMap[comment.id])
        } else if (!comment.parent_id) {
          rootComments.push(commentMap[comment.id])
        }
      })

      setComments(rootComments)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-12 pt-8 border-t">
      <h3 className="text-xl font-bold text-gray-900 mb-6">
        评论 ({comments.length})
      </h3>

      {/* Comment form */}
      <div className="mb-8">
        <CommentForm articleId={articleId} onSuccess={fetchComments} />
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-8">
          <FaSpinner className="w-6 h-6 animate-spin text-primary-600 mx-auto" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无评论，来发表第一条评论吧！
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              articleId={articleId}
            />
          ))}
        </div>
      )}
    </section>
  )
}
