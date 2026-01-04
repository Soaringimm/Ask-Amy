import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaHeart, FaRegHeart, FaSpinner } from 'react-icons/fa'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

export default function FavoriteButton({ articleId, size = 'md', showCount = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    if (articleId) {
      checkFavoriteStatus()
      if (showCount) {
        fetchFavoriteCount()
      }
    }
  }, [articleId, user])

  const checkFavoriteStatus = async () => {
    if (!user) {
      setIsFavorited(false)
      setInitialLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('aa_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('article_id', articleId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking favorite status:', error)
      }

      setIsFavorited(!!data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setInitialLoading(false)
    }
  }

  const fetchFavoriteCount = async () => {
    try {
      const { count, error } = await supabase
        .from('aa_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId)

      if (error) throw error
      setFavoriteCount(count || 0)
    } catch (err) {
      console.error('Error fetching favorite count:', err)
    }
  }

  const handleToggleFavorite = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      navigate('/login', { state: { from: { pathname: window.location.pathname } } })
      return
    }

    setLoading(true)

    try {
      if (isFavorited) {
        // Remove favorite
        const { error } = await supabase
          .from('aa_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', articleId)

        if (error) throw error

        setIsFavorited(false)
        if (showCount) setFavoriteCount(prev => Math.max(0, prev - 1))
      } else {
        // Add favorite
        const { error } = await supabase
          .from('aa_favorites')
          .insert({
            user_id: user.id,
            article_id: articleId,
          })

        if (error) throw error

        setIsFavorited(true)
        if (showCount) setFavoriteCount(prev => prev + 1)
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  if (initialLoading) {
    return (
      <button
        disabled
        className={`flex items-center gap-1.5 text-gray-400 ${sizeClasses[size]}`}
      >
        <FaRegHeart />
        {showCount && <span>{favoriteCount}</span>}
      </button>
    )
  }

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`flex items-center gap-1.5 transition-colors ${sizeClasses[size]} ${
        isFavorited
          ? 'text-red-500 hover:text-red-600'
          : 'text-gray-500 hover:text-red-500'
      }`}
      title={isFavorited ? '取消收藏' : '收藏文章'}
    >
      {loading ? (
        <FaSpinner className="animate-spin" />
      ) : isFavorited ? (
        <FaHeart />
      ) : (
        <FaRegHeart />
      )}
      {showCount && <span>{favoriteCount}</span>}
    </button>
  )
}
