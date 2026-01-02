import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import AdminLayout from '../layouts/AdminLayout'
import { FaPlus, FaEdit, FaTrash, FaBook, FaImage, FaEye, FaEyeSlash } from 'react-icons/fa'
import { uploadImage, getMarkdownImage } from '../lib/storage'
import { format } from 'date-fns'

export default function AdminArticles() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const [articleForm, setArticleForm] = useState({
    id: null,
    title: '',
    slug: '',
    excerpt: '',
    content: '',
  })
  const [uploading, setUploading] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('aa_articles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setArticles(data || [])
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError(err.message || '加载文章失败')
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50)
  }

  const handleTitleChange = (e) => {
    const title = e.target.value
    setArticleForm({
      ...articleForm,
      title,
      slug: articleForm.id ? articleForm.slug : generateSlug(title),
    })
  }

  const handleCreateOrUpdateArticle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const articleData = {
        title: articleForm.title,
        slug: articleForm.slug,
        excerpt: articleForm.excerpt,
        content: articleForm.content,
      }

      if (articleForm.id) {
        const { error } = await supabase
          .from('aa_articles')
          .update(articleData)
          .eq('id', articleForm.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('aa_articles')
          .insert([articleData])
        if (error) throw error
      }
      setShowArticleModal(false)
      setArticleForm({ id: null, title: '', slug: '', excerpt: '', content: '' })
      fetchArticles()
    } catch (err) {
      console.error('Error saving article:', err)
      setError(err.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleEditArticle = (article) => {
    setArticleForm({
      id: article.id,
      title: article.title,
      slug: article.slug || '',
      excerpt: article.excerpt || '',
      content: article.content,
    })
    setShowArticleModal(true)
  }

  const handleDeleteArticle = async (id) => {
    if (!confirm('确定要删除这篇文章吗？')) return

    setLoading(true)
    try {
      const { error } = await supabase.from('aa_articles').delete().eq('id', id)
      if (error) throw error
      fetchArticles()
    } catch (err) {
      console.error('Error deleting article:', err)
      setError(err.message || '删除失败')
    } finally {
      setLoading(false)
    }
  }

  const handleTogglePublish = async (article) => {
    setLoading(true)
    try {
      const newPublishedAt = article.published_at ? null : new Date().toISOString()
      const { error } = await supabase
        .from('aa_articles')
        .update({ published_at: newPublishedAt })
        .eq('id', article.id)
      if (error) throw error
      fetchArticles()
    } catch (err) {
      console.error('Error toggling publish:', err)
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await uploadImage(file)
      const markdown = getMarkdownImage(url, file.name)

      // Insert at cursor position or append
      if (contentRef.current) {
        const textarea = contentRef.current
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = articleForm.content
        const newContent = text.substring(0, start) + markdown + text.substring(end)
        setArticleForm({ ...articleForm, content: newContent })
      } else {
        setArticleForm({ ...articleForm, content: articleForm.content + '\n' + markdown })
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      alert('图片上传失败')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <FaBook className="mr-3" /> 文章管理
        </h1>
        <p className="text-gray-600 mb-8">管理博客文章，支持 Markdown 格式。</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => {
              setArticleForm({ id: null, title: '', slug: '', excerpt: '', content: '' })
              setShowArticleModal(true)
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center"
          >
            <FaPlus className="mr-2" />
            新建文章
          </button>
        </div>

        {loading && articles.length === 0 ? (
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
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {article.title}
                      </h3>
                      {article.published_at ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          已发布
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          草稿
                        </span>
                      )}
                    </div>
                    {article.slug && (
                      <p className="text-sm text-gray-500 mb-1">/articles/{article.slug}</p>
                    )}
                    {article.excerpt && (
                      <p className="text-gray-600 line-clamp-2">{article.excerpt}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      创建于 {format(new Date(article.created_at), 'yyyy-MM-dd HH:mm')}
                      {article.published_at && ` · 发布于 ${format(new Date(article.published_at), 'yyyy-MM-dd')}`}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleTogglePublish(article)}
                      className={`p-2 ${article.published_at ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}
                      title={article.published_at ? '取消发布' : '发布'}
                    >
                      {article.published_at ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    <button
                      onClick={() => handleEditArticle(article)}
                      className="text-blue-600 hover:text-blue-700 p-2"
                      title="编辑"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(article.id)}
                      className="text-red-600 hover:text-red-700 p-2"
                      title="删除"
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

      {/* 文章编辑弹窗 */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              {articleForm.id ? '编辑文章' : '新建文章'}
            </h3>

            <form onSubmit={handleCreateOrUpdateArticle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={articleForm.title}
                    onChange={handleTitleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="文章标题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL 别名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={articleForm.slug}
                    onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="url-friendly-slug"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  摘要
                </label>
                <textarea
                  rows="2"
                  value={articleForm.excerpt}
                  onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="简短描述（可选，显示在列表中）"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    内容 (Markdown) <span className="text-red-500">*</span>
                  </label>
                  <label className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition text-sm">
                    <FaImage className="mr-2" />
                    {uploading ? '上传中...' : '插入图片'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  ref={contentRef}
                  required
                  rows="15"
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                  placeholder="使用 Markdown 格式编写文章内容..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {articleForm.id ? '保存更改' : '创建文章'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowArticleModal(false)
                    setArticleForm({ id: null, title: '', slug: '', excerpt: '', content: '' })
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
    </AdminLayout>
  )
}
