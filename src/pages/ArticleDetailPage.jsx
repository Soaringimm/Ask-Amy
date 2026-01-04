import { useState, useEffect, useCallback } from 'react'
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

export default function ArticleDetailPage() {
  const { slug } = useParams()
  const [article, setArticle] = useState(null)
  const [tags, setTags] = useState([])
  const [author, setAuthor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Track view count
  const incrementViewCount = useCallback(async () => {
    try {
      await supabase.rpc('increment_article_view', { article_slug: slug })
    } catch (err) {
      console.error('Error incrementing view count:', err)
    }
  }, [slug])

  useEffect(() => {
    fetchArticle()
  }, [slug])

  useEffect(() => {
    if (article) {
      incrementViewCount()
    }
  }, [article, incrementViewCount])

  const fetchArticle = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch article with tags
      const { data, error: articleError } = await supabase
        .from('aa_articles')
        .select(`
          *,
          aa_article_tags!left(
            aa_tags(id, name, slug, color)
          )
        `)
        .eq('slug', slug)
        .not('published_at', 'is', null)
        .single()

      if (articleError) {
        if (articleError.code === 'PGRST116') {
          setError('文章不存在')
        } else {
          throw articleError
        }
        return
      }

      setArticle(data)

      // Extract tags
      const articleTags = data.aa_article_tags
        ?.map((at) => at.aa_tags)
        .filter(Boolean) || []
      setTags(articleTags)

      // Fetch author info if available
      if (data.author_id) {
        const { data: authorData } = await supabase
          .from('aa_profiles')
          .select('display_name, avatar_url')
          .eq('id', data.author_id)
          .single()

        if (authorData) {
          setAuthor(authorData)
        }
      }
    } catch (err) {
      console.error('Error fetching article:', err)
      setError('无法加载文章')
    } finally {
      setLoading(false)
    }
  }

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

  if (error) {
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
          {error}
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
        <div className="flex gap-8">
          {/* Main content */}
          <div className="flex-1 max-w-4xl">
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

              <article className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Article header */}
                <header className="p-6 md:p-8 pb-0">
                  {/* Tags */}
                  {tags.length > 0 && (
                    <TagList tags={tags} size="sm" className="mb-4" />
                  )}

                  {/* Title */}
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                    {article.title}
                  </h1>

                  {/* Author and meta */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b">
                    <AuthorInfo
                      author={author}
                      publishedAt={article.published_at}
                      readingTime={article.reading_time}
                    />

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <FavoriteButton articleId={article.id} size="md" showCount />
                      {article.view_count !== undefined && (
                        <span className="flex items-center gap-1">
                          <FaEye className="w-4 h-4" />
                          {article.view_count} 次阅读
                        </span>
                      )}
                      {article.reading_time && (
                        <span className="flex items-center gap-1">
                          <FaClock className="w-4 h-4" />
                          {article.reading_time} 分钟
                        </span>
                      )}
                    </div>
                  </div>
                </header>

                {/* Mobile TOC */}
                <div className="px-6 md:px-8 pt-6 xl:hidden">
                  <TableOfContents content={article.content} />
                </div>

                {/* Article content */}
                <div className="p-6 md:p-8">
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
