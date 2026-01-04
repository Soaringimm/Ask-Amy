import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const ARTICLES_PER_PAGE = 9

// Fetch all tags
async function fetchTags() {
  const { data, error } = await supabase
    .from('aa_tags')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

// Fetch articles with pagination, search, and tag filter
async function fetchArticles({ page, tag, search }) {
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
  if (tag) {
    const { data: tagData } = await supabase
      .from('aa_tags')
      .select('id')
      .eq('slug', tag)
      .single()

    if (tagData) {
      const { data: articleIds } = await supabase
        .from('aa_article_tags')
        .select('article_id')
        .eq('tag_id', tagData.id)

      if (articleIds && articleIds.length > 0) {
        query = query.in('id', articleIds.map((a) => a.article_id))
      } else {
        return { articles: [], totalCount: 0 }
      }
    }
  }

  // Apply search filter
  if (search) {
    query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`)
  }

  // Get total count
  const { count } = await query

  // Apply pagination
  const from = (page - 1) * ARTICLES_PER_PAGE
  const to = from + ARTICLES_PER_PAGE - 1
  query = query.range(from, to)

  const { data, error } = await query

  if (error) throw error

  // Transform data to include tags array
  const articles = (data || []).map((article) => ({
    ...article,
    tags: article.aa_article_tags
      ?.map((at) => at.aa_tags)
      .filter(Boolean) || [],
  }))

  return { articles, totalCount: count || 0 }
}

// Fetch single article by slug
async function fetchArticleBySlug(slug) {
  const { data, error } = await supabase
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

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('文章不存在')
    }
    throw error
  }

  // Extract tags
  const tags = data.aa_article_tags
    ?.map((at) => at.aa_tags)
    .filter(Boolean) || []

  // Fetch author info if available
  let author = null
  if (data.author_id) {
    const { data: authorData } = await supabase
      .from('aa_profiles')
      .select('display_name, avatar_url')
      .eq('id', data.author_id)
      .single()

    if (authorData) {
      author = authorData
    }
  }

  return { article: data, tags, author }
}

// Hooks
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: fetchTags,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useArticles({ page = 1, tag = null, search = '' }) {
  return useQuery({
    queryKey: ['articles', { page, tag, search }],
    queryFn: () => fetchArticles({ page, tag, search }),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useArticle(slug) {
  return useQuery({
    queryKey: ['article', slug],
    queryFn: () => fetchArticleBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
