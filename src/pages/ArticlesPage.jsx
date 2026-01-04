import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FaBook, FaSearch } from 'react-icons/fa'
import {
  ArticleCard,
  FeaturedArticleCard,
  ArticleListSkeleton,
  SearchBar,
  TagFilter,
  Pagination,
} from '../components/blog'

const ARTICLES_PER_PAGE = 9

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [articles, setArticles] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  // URL params
  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const selectedTag = searchParams.get('tag') || null
  const searchQuery = searchParams.get('q') || ''

  useEffect(() => {
    fetchTags()
  }, [])

  useEffect(() => {
    fetchArticles()
  }, [currentPage, selectedTag, searchQuery])

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

  const fetchArticles = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('aa_articles')
        .select(`
          id, title, slug, excerpt, published_at, cover_image,
          reading_time, view_count, is_featured,
          aa_article_tags!left(tag_id, aa_tags!inner(id, name, slug, color))
        `, { count: 'exact' })
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })

      // Apply tag filter
      if (selectedTag) {
        const { data: tagData } = await supabase
          .from('aa_tags')
          .select('id')
          .eq('slug', selectedTag)
          .single()

        if (tagData) {
          const { data: articleIds } = await supabase
            .from('aa_article_tags')
            .select('article_id')
            .eq('tag_id', tagData.id)

          if (articleIds && articleIds.length > 0) {
            query = query.in('id', articleIds.map((a) => a.article_id))
          } else {
            setArticles([])
            setTotalCount(0)
            setLoading(false)
            return
          }
        }
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
      }

      // Get total count
      const { count } = await query

      // Apply pagination
      const from = (currentPage - 1) * ARTICLES_PER_PAGE
      const to = from + ARTICLES_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error } = await query

      if (error) throw error

      // Transform data to include tags array
      const transformedData = (data || []).map((article) => ({
        ...article,
        tags: article.aa_article_tags
          ?.map((at) => at.aa_tags)
          .filter(Boolean) || [],
      }))

      setArticles(transformedData)
      setTotalCount(count || 0)
    } catch (err) {
      console.error('Error fetching articles:', err)
      setError('无法加载文章列表')
    } finally {
      setLoading(false)
    }
  }

  // Separate featured article
  const featuredArticle = useMemo(() => {
    if (currentPage === 1 && !selectedTag && !searchQuery) {
      return articles.find((a) => a.is_featured) || articles[0]
    }
    return null
  }, [articles, currentPage, selectedTag, searchQuery])

  const regularArticles = useMemo(() => {
    if (featuredArticle) {
      return articles.filter((a) => a.id !== featuredArticle.id)
    }
    return articles
  }, [articles, featuredArticle])

  const totalPages = Math.ceil(totalCount / ARTICLES_PER_PAGE)

  const handleSearch = (value) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    params.delete('page')
    setSearchParams(params)
  }

  const handleTagSelect = (tag) => {
    const params = new URLSearchParams(searchParams)
    if (tag) {
      params.set('tag', tag)
    } else {
      params.delete('tag')
    }
    params.delete('page')
    setSearchParams(params)
  }

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams)
    if (page > 1) {
      params.set('page', page.toString())
    } else {
      params.delete('page')
    }
    setSearchParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center">
          <FaBook className="mr-3 text-primary-600" /> 文章
        </h1>
        <p className="text-gray-600 text-lg">
          专业知识分享与移民资讯
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 max-w-md">
            <SearchBar
              value={searchQuery}
              onChange={handleSearch}
              placeholder="搜索文章标题或内容..."
            />
          </div>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <TagFilter
            tags={tags}
            selectedTag={selectedTag}
            onTagSelect={handleTagSelect}
          />
        )}
      </div>

      {/* Active filters info */}
      {(searchQuery || selectedTag) && (
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
          <FaSearch className="w-4 h-4" />
          <span>
            找到 {totalCount} 篇文章
            {searchQuery && ` 包含 "${searchQuery}"`}
            {selectedTag && ` 标签: ${tags.find((t) => t.slug === selectedTag)?.name}`}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <ArticleListSkeleton count={6} />
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-gray-400 text-6xl mb-4">
            <FaBook />
          </div>
          <p className="text-gray-500 text-lg">
            {searchQuery || selectedTag ? '没有找到匹配的文章' : '暂无文章'}
          </p>
          {(searchQuery || selectedTag) && (
            <button
              onClick={() => setSearchParams({})}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              清除筛选
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Featured article */}
          {featuredArticle && (
            <div className="mb-8">
              <FeaturedArticleCard article={featuredArticle} />
            </div>
          )}

          {/* Article grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {regularArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
