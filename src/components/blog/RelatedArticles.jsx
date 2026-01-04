import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FaSpinner } from 'react-icons/fa'
import { supabase } from '../../lib/supabase'

export function RelatedArticles({ currentArticleId, tags = [], limit = 3 }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRelatedArticles()
  }, [currentArticleId, tags])

  const fetchRelatedArticles = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('aa_articles')
        .select('id, title, slug, excerpt, published_at, cover_image')
        .not('published_at', 'is', null)
        .neq('id', currentArticleId)
        .order('published_at', { ascending: false })
        .limit(limit)

      // If we have tags, try to find articles with matching tags
      if (tags.length > 0) {
        const tagIds = tags.map((t) => t.id)
        const { data: relatedByTags } = await supabase
          .from('aa_article_tags')
          .select('article_id')
          .in('tag_id', tagIds)
          .neq('article_id', currentArticleId)

        if (relatedByTags && relatedByTags.length > 0) {
          const articleIds = [...new Set(relatedByTags.map((r) => r.article_id))]
          query = supabase
            .from('aa_articles')
            .select('id, title, slug, excerpt, published_at, cover_image')
            .in('id', articleIds)
            .not('published_at', 'is', null)
            .order('published_at', { ascending: false })
            .limit(limit)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setArticles(data || [])
    } catch (err) {
      console.error('Error fetching related articles:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <FaSpinner className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
      </div>
    )
  }

  if (articles.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t">
      <h3 className="text-xl font-bold text-gray-900 mb-6">相关文章</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            to={`/articles/${article.slug}`}
            className="group block bg-gray-50 rounded-xl overflow-hidden hover:bg-gray-100 transition-colors"
          >
            {/* Cover */}
            <div className="h-32 bg-gradient-to-br from-primary-100 to-primary-50 overflow-hidden">
              {article.cover_image ? (
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-primary-300 text-4xl font-bold">
                    {article.title.charAt(0)}
                  </div>
                </div>
              )}
            </div>
            {/* Content */}
            <div className="p-4">
              <h4 className="font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
                {article.title}
              </h4>
              <p className="text-sm text-gray-400 mt-2">
                {article.published_at &&
                  format(new Date(article.published_at), 'yyyy年MM月dd日')}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
