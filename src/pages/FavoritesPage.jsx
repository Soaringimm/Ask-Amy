import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FaHeart, FaSpinner, FaBookmark } from 'react-icons/fa'
import { format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function FavoritesPage() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      fetchFavorites()
    }
  }, [user])

  const fetchFavorites = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('aa_favorites')
        .select(`
          id,
          created_at,
          article:aa_articles (
            id,
            title,
            slug,
            excerpt,
            cover_image,
            published_at,
            reading_time,
            aa_article_tags (
              tag:aa_tags (
                id,
                name,
                slug,
                color
              )
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      // Filter out favorites where article might be deleted or unpublished
      const validFavorites = data.filter(f => f.article && f.article.published_at)
      setFavorites(validFavorites)
    } catch (err) {
      console.error('Error fetching favorites:', err)
      setError('加载收藏列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from('aa_favorites')
        .delete()
        .eq('id', favoriteId)

      if (error) throw error

      setFavorites(favorites.filter(f => f.id !== favoriteId))
    } catch (err) {
      console.error('Error removing favorite:', err)
    }
  }

  return (
    <div className="bg-gray-100 min-h-full">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <FaBookmark className="text-2xl text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <FaSpinner className="animate-spin text-3xl text-primary-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">{error}</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <FaHeart className="text-5xl text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">还没有收藏任何文章</p>
            <Link
              to="/articles"
              className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
            >
              浏览文章
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-white rounded-xl shadow-sm border hover:shadow-md transition overflow-hidden"
              >
                <div className="flex">
                  {/* Cover Image */}
                  {favorite.article.cover_image && (
                    <Link
                      to={`/articles/${favorite.article.slug}`}
                      className="flex-shrink-0 w-32 md:w-48"
                    >
                      <img
                        src={favorite.article.cover_image}
                        alt={favorite.article.title}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                  )}

                  {/* Content */}
                  <div className="flex-1 p-4 md:p-6">
                    <Link to={`/articles/${favorite.article.slug}`}>
                      <h2 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition line-clamp-2">
                        {favorite.article.title}
                      </h2>
                    </Link>

                    {favorite.article.excerpt && (
                      <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                        {favorite.article.excerpt}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        {favorite.article.published_at && (
                          <span>
                            {format(new Date(favorite.article.published_at), 'yyyy-MM-dd')}
                          </span>
                        )}
                        {favorite.article.reading_time && (
                          <span>{favorite.article.reading_time} 分钟阅读</span>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveFavorite(favorite.id)}
                        className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600 transition"
                      >
                        <FaHeart />
                        <span className="hidden md:inline">取消收藏</span>
                      </button>
                    </div>

                    {/* Tags */}
                    {favorite.article.aa_article_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {favorite.article.aa_article_tags.slice(0, 3).map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="text-xs px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
