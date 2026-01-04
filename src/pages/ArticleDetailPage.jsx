import { useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FaArrowLeft, FaEye, FaClock } from 'react-icons/fa'
import {
  ArticleDetailSkeleton,
  TagList,
  TableOfContents,
  FloatingTableOfContents,
  ShareButtons,
  FloatingShareBar,
  Comments,
  RelatedArticles,
  MarkdownRenderer,
  AuthorInfo,
} from '../components/blog'
import FavoriteButton from '../components/blog/FavoriteButton'
import { useArticle } from '../hooks/useArticles'

export default function ArticleDetailPage() {
  const { slug } = useParams()
  const { data, isLoading: loading, error } = useArticle(slug)

  const article = data?.article
  const tags = data?.tags || []
  const author = data?.author

  // Track view count
  const incrementViewCount = useCallback(async () => {
    try {
      await supabase.rpc('increment_article_view', { article_slug: slug })
    } catch (err) {
      console.error('Error incrementing view count:', err)
    }
  }, [slug])

  useEffect(() => {
    if (article) {
      incrementViewCount()
    }
  }, [article, incrementViewCount])

  // Get current URL for sharing
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/articles"
          className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
        >
          <FaArrowLeft className="mr-2" />
          返回文章列表
        </Link>
        <div className="bg-white rounded-xl shadow-sm p-8">
          <ArticleDetailSkeleton />
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/articles"
          className="flex items-center text-primary-600 hover:text-primary-700 mb-6"
        >
          <FaArrowLeft className="mr-2" />
          返回文章列表
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          {error?.message || '文章不存在'}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover image header */}
      {article.cover_image && (
        <div className="relative h-64 md:h-96 bg-gray-900">
          <img
            src={article.cover_image}
            alt={article.title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 justify-center xl:justify-start">
          {/* Main content */}
          <div className="flex-1 max-w-4xl w-full">
            <div className={`${article.cover_image ? '-mt-32 relative z-10' : 'pt-8'}`}>
              {/* Back link */}
              <Link
                to="/articles"
                className={`inline-flex items-center mb-6 ${
                  article.cover_image
                    ? 'text-white hover:text-gray-200'
                    : 'text-primary-600 hover:text-primary-700'
                }`}
              >
                <FaArrowLeft className="mr-2" />
                返回文章列表
              </Link>

              <article className="bg-white rounded-2xl overflow-hidden shadow-soft-lg">
                {/* Article header */}
                <header className="p-6 md:p-10 pb-0">
                  {/* Tags */}
                  {tags.length > 0 && (
                    <TagList tags={tags} size="sm" className="mb-5" />
                  )}

                  {/* Title */}
                  <h1 className="font-display text-3xl md:text-4xl font-bold mb-5 leading-tight text-gray-900">
                    {article.title}
                  </h1>

                  {/* Author and meta */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-primary-100">
                    <AuthorInfo
                      author={author}
                      publishedAt={article.published_at}
                      readingTime={article.reading_time}
                    />

                    <div className="flex items-center gap-5 text-sm text-gray-500">
                      <FavoriteButton articleId={article.id} size="md" showCount />
                      {article.view_count !== undefined && (
                        <span className="flex items-center gap-1.5">
                          <FaEye className="w-4 h-4 text-primary-300" />
                          {article.view_count} 次阅读
                        </span>
                      )}
                      {article.reading_time && (
                        <span className="flex items-center gap-1.5">
                          <FaClock className="w-4 h-4 text-primary-300" />
                          {article.reading_time} 分钟
                        </span>
                      )}
                    </div>
                  </div>
                </header>

                {/* Mobile TOC */}
                <div className="px-6 md:px-10 pt-6 xl:hidden">
                  <TableOfContents content={article.content} />
                </div>

                {/* Article content */}
                <div className="p-6 md:p-10 pt-8">
                  <MarkdownRenderer content={article.content} />
                </div>

                {/* Share buttons */}
                <div className="px-6 md:px-8 pb-6 border-t pt-6">
                  <ShareButtons title={article.title} url={currentUrl} />
                </div>

                {/* Related articles */}
                <div className="px-6 md:px-8 pb-8">
                  <RelatedArticles
                    currentArticleId={article.id}
                    tags={tags}
                    limit={3}
                  />
                </div>

                {/* Comments */}
                <div className="px-6 md:px-8 pb-8">
                  <Comments articleId={article.id} />
                </div>
              </article>
            </div>
          </div>

          {/* Desktop sidebar with TOC */}
          <aside className="hidden xl:block w-64 flex-shrink-0">
            <div className="sticky top-24 pt-8">
              <FloatingTableOfContents content={article.content} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile floating share bar */}
      <FloatingShareBar title={article.title} url={currentUrl} />
    </div>
  )
}
