import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { FaBook, FaSpinner } from 'react-icons/fa'

export default function ArticlesPage() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('aa_articles')
        .select('id, title, slug, excerpt, published_at')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })

      if (error) throw error
      setArticles(data || [])
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError('无法加载文章列表')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center">
          <FaBook className="mr-3" /> 文章
        </h1>
        <p className="text-gray-600">
          专业知识分享与移民资讯
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {loading ? (
        <div className="text-center py-12">
          <FaSpinner className="animate-spin h-10 w-10 text-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500">暂无文章</p>
        </div>
      ) : (
        <div className="space-y-6">
          {articles.map((article) => (
            <Link
              key={article.id}
              to={`/articles/${article.slug}`}
              className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border-l-4 border-primary-500"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-primary-600">
                {article.title}
              </h2>
              {article.excerpt && (
                <p className="text-gray-600 mb-3 line-clamp-2">
                  {article.excerpt}
                </p>
              )}
              <p className="text-sm text-gray-400">
                {article.published_at && format(new Date(article.published_at), 'yyyy年MM月dd日')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
