import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { FaArrowLeft, FaSpinner } from 'react-icons/fa'
import ReactMarkdown from 'react-markdown'

export default function ArticleDetailPage() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchArticle()
  }, [slug])

  const fetchArticle = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('aa_articles')
        .select('*')
        .eq('slug', slug)
        .not('published_at', 'is', null)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('文章不存在')
        } else {
          throw error
        }
      } else {
        setArticle(data)
      }
    } catch (err) {
      console.error('Error fetching article:', err)
      setError('无法加载文章')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <FaSpinner className="animate-spin h-10 w-10 text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/articles"
          className="flex items-center text-primary-600 hover:underline mb-6"
        >
          <FaArrowLeft className="mr-2" />
          返回文章列表
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/articles"
        className="flex items-center text-primary-600 hover:underline mb-6"
      >
        <FaArrowLeft className="mr-2" />
        返回文章列表
      </Link>

      <article className="bg-white rounded-xl shadow-sm p-8">
        {/* 文章标题 */}
        <header className="mb-8 pb-6 border-b">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            {article.title}
          </h1>
          <p className="text-gray-500">
            发布于 {article.published_at && format(new Date(article.published_at), 'yyyy年MM月dd日')}
          </p>
        </header>

        {/* 文章内容 */}
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            components={{
              img: ({ node, ...props }) => (
                <img {...props} className="rounded-lg max-w-full h-auto" />
              ),
              a: ({ node, ...props }) => (
                <a {...props} className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      </article>
    </div>
  )
}
