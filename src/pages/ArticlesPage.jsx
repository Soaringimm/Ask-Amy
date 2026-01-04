import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaBook, FaSearch, FaNewspaper } from 'react-icons/fa'
import {
  ArticleCard,
  FeaturedArticleCard,
  ArticleListSkeleton,
  TagFilter,
  Pagination,
} from '../components/blog'
import { useTags, useArticles } from '../hooks/useArticles'

const ARTICLES_PER_PAGE = 9

export default function ArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [localSearchValue, setLocalSearchValue] = useState('')
  const isComposingRef = useRef(false)

  // URL params
  const currentPage = parseInt(searchParams.get('page') || '1', 10)
  const selectedTag = searchParams.get('tag') || null
  const searchQuery = searchParams.get('q') || ''

  // Cached queries
  const { data: tags = [] } = useTags()
  const {
    data: articlesData,
    isLoading: loading,
    error
  } = useArticles({ page: currentPage, tag: selectedTag, search: searchQuery })

  const articles = articlesData?.articles || []
  const totalCount = articlesData?.totalCount || 0

  // Sync local search value with URL param on mount
  useEffect(() => {
    setLocalSearchValue(searchQuery)
  }, [searchQuery])

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

  const updateSearchParams = (value) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('q', value)
    } else {
      params.delete('q')
    }
    params.delete('page')
    setSearchParams(params)
  }

  const handleSearchChange = (e) => {
    const value = e.target.value
    setLocalSearchValue(value)
    // Only update URL if not composing (for IME support)
    if (!isComposingRef.current) {
      updateSearchParams(value)
    }
  }

  const handleCompositionStart = () => {
    isComposingRef.current = true
  }

  const handleCompositionEnd = (e) => {
    isComposingRef.current = false
    // Update URL with final composed value
    updateSearchParams(e.target.value)
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-accent-50/30 py-12 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-200/20 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-white"
              style={{ background: 'linear-gradient(to bottom right, #4150e6, #5a6ef2)' }}
            >
              <FaNewspaper className="text-xl" />
            </div>
            <h1 className="font-display text-4xl font-bold text-primary-950">
              文章
            </h1>
          </div>
          <p className="text-gray-600 text-lg mb-8">
            专业知识分享与移民资讯
          </p>

          {/* Search */}
          <div className="max-w-2xl">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="搜索文章标题或内容..."
                value={localSearchValue}
                onChange={handleSearchChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-soft focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 text-gray-900 placeholder-gray-400 transition-all duration-200"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="mb-8">
            <TagFilter
              tags={tags}
              selectedTag={selectedTag}
              onTagSelect={handleTagSelect}
            />
          </div>
        )}

        {/* Active filters info */}
        {(searchQuery || selectedTag) && (
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <FaSearch className="w-4 h-4" />
            <span>
              找到 <span className="font-semibold text-primary-600">{totalCount}</span> 篇文章
              {searchQuery && ` 包含 "${searchQuery}"`}
              {selectedTag && ` 标签: ${tags.find((t) => t.slug === selectedTag)?.name}`}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            无法加载文章列表
          </div>
        )}

        {/* Content */}
        {loading ? (
          <ArticleListSkeleton count={6} />
        ) : articles.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
              <FaBook className="text-gray-400 text-2xl" />
            </div>
            <p className="text-gray-500 text-lg">
              {searchQuery || selectedTag ? '没有找到匹配的文章' : '暂无文章'}
            </p>
            {(searchQuery || selectedTag) && (
              <button
                onClick={() => setSearchParams({})}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
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
      </section>
    </div>
  )
}
