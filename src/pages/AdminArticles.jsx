import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import AdminLayout from '../layouts/AdminLayout'
import {
  FaPlus, FaEdit, FaTrash, FaBook, FaImage, FaEye, FaEyeSlash,
  FaTags, FaStar, FaRegStar, FaExternalLinkAlt, FaTimes
} from 'react-icons/fa'
import { uploadImage, getMarkdownImage } from '../lib/storage'
import { format } from 'date-fns'
import { MarkdownRenderer } from '../components/blog'

// Color options for tags
const TAG_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
]

export default function AdminArticles() {
  const [articles, setArticles] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showArticleModal, setShowArticleModal] = useState(false)
  const [showTagModal, setShowTagModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [articleForm, setArticleForm] = useState({
    id: null,
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    cover_image: '',
    is_featured: false,
    selectedTags: [],
  })
  const [tagForm, setTagForm] = useState({ id: null, name: '', slug: '', color: '#3b82f6' })
  const [uploading, setUploading] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    fetchArticles()
    fetchTags()
  }, [])

  const fetchArticles = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('aa_articles')
        .select(`
          *,
          aa_article_tags(tag_id, aa_tags(id, name, slug, color))
        `)
        .order('created_at', { ascending: false })
      if (error) throw error

      const articlesWithTags = (data || []).map(article => ({
        ...article,
        tags: article.aa_article_tags?.map(at => at.aa_tags).filter(Boolean) || []
      }))
      setArticles(articlesWithTags)
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError(err.message || '加载文章失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('aa_tags')
        .select('*')
        .order('name')
      if (error) throw error
      setTags(data || [])
    } catch (err) {
      console.error('Error fetching tags:', err)
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
        cover_image: articleForm.cover_image || null,
        is_featured: articleForm.is_featured,
      }

      let articleId = articleForm.id

      if (articleForm.id) {
        const { error } = await supabase
          .from('aa_articles')
          .update(articleData)
          .eq('id', articleForm.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('aa_articles')
          .insert([articleData])
          .select('id')
          .single()
        if (error) throw error
        articleId = data.id
      }

      // Update tags
      await supabase
        .from('aa_article_tags')
        .delete()
        .eq('article_id', articleId)

      if (articleForm.selectedTags.length > 0) {
        const tagInserts = articleForm.selectedTags.map(tagId => ({
          article_id: articleId,
          tag_id: tagId,
        }))
        await supabase.from('aa_article_tags').insert(tagInserts)
      }

      setShowArticleModal(false)
      resetArticleForm()
      fetchArticles()
    } catch (err) {
      console.error('Error saving article:', err)
      setError(err.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const resetArticleForm = () => {
    setArticleForm({
      id: null,
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      cover_image: '',
      is_featured: false,
      selectedTags: [],
    })
  }

  const handleEditArticle = (article) => {
    setArticleForm({
      id: article.id,
      title: article.title,
      slug: article.slug || '',
      excerpt: article.excerpt || '',
      content: article.content,
      cover_image: article.cover_image || '',
      is_featured: article.is_featured || false,
      selectedTags: article.tags?.map(t => t.id) || [],
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

  const handleToggleFeatured = async (article) => {
    try {
      const { error } = await supabase
        .from('aa_articles')
        .update({ is_featured: !article.is_featured })
        .eq('id', article.id)
      if (error) throw error
      fetchArticles()
    } catch (err) {
      console.error('Error toggling featured:', err)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await uploadImage(file)
      const markdown = getMarkdownImage(url, file.name)

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

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCover(true)
    try {
      const url = await uploadImage(file)
      setArticleForm({ ...articleForm, cover_image: url })
    } catch (err) {
      console.error('Error uploading cover:', err)
      alert('封面上传失败')
    } finally {
      setUploadingCover(false)
      e.target.value = ''
    }
  }

  // Tag management
  const handleCreateOrUpdateTag = async (e) => {
    e.preventDefault()
    try {
      const tagData = {
        name: tagForm.name,
        slug: tagForm.slug || generateSlug(tagForm.name),
        color: tagForm.color,
      }

      if (tagForm.id) {
        const { error } = await supabase
          .from('aa_tags')
          .update(tagData)
          .eq('id', tagForm.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('aa_tags')
          .insert([tagData])
        if (error) throw error
      }

      setShowTagModal(false)
      setTagForm({ id: null, name: '', slug: '', color: '#3b82f6' })
      fetchTags()
    } catch (err) {
      console.error('Error saving tag:', err)
      alert('保存标签失败')
    }
  }

  const handleDeleteTag = async (id) => {
    if (!confirm('确定要删除这个标签吗？')) return
    try {
      const { error } = await supabase.from('aa_tags').delete().eq('id', id)
      if (error) throw error
      fetchTags()
    } catch (err) {
      console.error('Error deleting tag:', err)
    }
  }

  const toggleTagSelection = (tagId) => {
    const selected = articleForm.selectedTags
    if (selected.includes(tagId)) {
      setArticleForm({
        ...articleForm,
        selectedTags: selected.filter(id => id !== tagId)
      })
    } else {
      setArticleForm({
        ...articleForm,
        selectedTags: [...selected, tagId]
      })
    }
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <FaBook className="mr-3" /> 文章管理
            </h1>
            <p className="text-gray-600 mt-2">管理博客文章和标签，支持 Markdown 格式。</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTagModal(true)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition flex items-center"
            >
              <FaTags className="mr-2" />
              管理标签
            </button>
            <button
              onClick={() => {
                resetArticleForm()
                setShowArticleModal(true)
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center"
            >
              <FaPlus className="mr-2" />
              新建文章
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tags overview */}
        {tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag.id}
                className="px-3 py-1 rounded-full text-sm font-medium"
                style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

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
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {article.title}
                      </h3>
                      {article.is_featured && (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1">
                          <FaStar className="w-3 h-3" /> 精选
                        </span>
                      )}
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
                    {/* Tags */}
                    {article.tags?.length > 0 && (
                      <div className="flex gap-1 mb-2 flex-wrap">
                        {article.tags.map(tag => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {article.slug && (
                      <p className="text-sm text-gray-500 mb-1">/articles/{article.slug}</p>
                    )}
                    {article.excerpt && (
                      <p className="text-gray-600 line-clamp-2">{article.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                      <span>创建于 {format(new Date(article.created_at), 'yyyy-MM-dd HH:mm')}</span>
                      {article.published_at && (
                        <span>发布于 {format(new Date(article.published_at), 'yyyy-MM-dd')}</span>
                      )}
                      {article.view_count > 0 && (
                        <span>{article.view_count} 次阅读</span>
                      )}
                      {article.reading_time && (
                        <span>{article.reading_time} 分钟</span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-4">
                    <button
                      onClick={() => handleToggleFeatured(article)}
                      className={`p-2 ${article.is_featured ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                      title={article.is_featured ? '取消精选' : '设为精选'}
                    >
                      {article.is_featured ? <FaStar /> : <FaRegStar />}
                    </button>
                    <button
                      onClick={() => handleTogglePublish(article)}
                      className={`p-2 ${article.published_at ? 'text-yellow-600 hover:text-yellow-700' : 'text-green-600 hover:text-green-700'}`}
                      title={article.published_at ? '取消发布' : '发布'}
                    >
                      {article.published_at ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    {article.published_at && (
                      <a
                        href={`/articles/${article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="查看文章"
                      >
                        <FaExternalLinkAlt />
                      </a>
                    )}
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

      {/* Article Modal */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-4 border-b">
              <h3 className="text-2xl font-bold text-gray-900">
                {articleForm.id ? '编辑文章' : '新建文章'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`px-4 py-2 rounded-lg transition ${
                    showPreview ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {showPreview ? '编辑' : '预览'}
                </button>
                <button
                  onClick={() => {
                    setShowArticleModal(false)
                    resetArticleForm()
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {showPreview ? (
                <div className="prose prose-lg max-w-none">
                  <h1>{articleForm.title || '无标题'}</h1>
                  <MarkdownRenderer content={articleForm.content || '无内容'} />
                </div>
              ) : (
                <form onSubmit={handleCreateOrUpdateArticle} className="space-y-6">
                  {/* Cover image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      封面图片
                    </label>
                    <div className="flex items-start gap-4">
                      {articleForm.cover_image ? (
                        <div className="relative w-48 h-32 rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={articleForm.cover_image}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setArticleForm({ ...articleForm, cover_image: '' })}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <FaTimes className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center w-48 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition">
                          <div className="text-center">
                            <FaImage className="mx-auto text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500">
                              {uploadingCover ? '上传中...' : '上传封面'}
                            </span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverUpload}
                            disabled={uploadingCover}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Title and slug */}
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

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      标签
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTagSelection(tag.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                            articleForm.selectedTags.includes(tag.id)
                              ? 'ring-2 ring-offset-1'
                              : 'opacity-60 hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            ringColor: tag.color,
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                      {tags.length === 0 && (
                        <span className="text-gray-400 text-sm">暂无标签，请先创建标签</span>
                      )}
                    </div>
                  </div>

                  {/* Featured toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_featured"
                      checked={articleForm.is_featured}
                      onChange={(e) => setArticleForm({ ...articleForm, is_featured: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <label htmlFor="is_featured" className="text-sm text-gray-700">
                      设为精选文章
                    </label>
                  </div>

                  {/* Excerpt */}
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

                  {/* Content */}
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
                      rows="20"
                      value={articleForm.content}
                      onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                      placeholder="使用 Markdown 格式编写文章内容..."
                    />
                  </div>

                  {/* Actions */}
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
                        resetArticleForm()
                      }}
                      className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
                    >
                      取消
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tag Management Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">管理标签</h3>
              <button
                onClick={() => setShowTagModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Tag form */}
            <form onSubmit={handleCreateOrUpdateTag} className="mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    标签名称
                  </label>
                  <input
                    type="text"
                    required
                    value={tagForm.name}
                    onChange={(e) => setTagForm({
                      ...tagForm,
                      name: e.target.value,
                      slug: tagForm.id ? tagForm.slug : generateSlug(e.target.value)
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="标签名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL 别名
                  </label>
                  <input
                    type="text"
                    value={tagForm.slug}
                    onChange={(e) => setTagForm({ ...tagForm, slug: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="tag-slug"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  颜色
                </label>
                <div className="flex gap-2">
                  {TAG_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTagForm({ ...tagForm, color })}
                      className={`w-8 h-8 rounded-full transition ${
                        tagForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition"
              >
                {tagForm.id ? '更新标签' : '添加标签'}
              </button>
            </form>

            {/* Existing tags */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">现有标签</h4>
              {tags.length === 0 ? (
                <p className="text-gray-400 text-sm">暂无标签</p>
              ) : (
                <div className="space-y-2">
                  {tags.map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="font-medium">{tag.name}</span>
                        <span className="text-sm text-gray-400">/{tag.slug}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTagForm(tag)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteTag(tag.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
