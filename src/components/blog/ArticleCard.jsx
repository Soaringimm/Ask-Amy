import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FaEye, FaClock, FaStar, FaArrowRight } from 'react-icons/fa'
import { TagList } from './Tag'
import FavoriteButton from './FavoriteButton'

export function ArticleCard({ article, featured = false }) {
  const {
    id,
    title,
    slug,
    excerpt,
    cover_image,
    published_at,
    reading_time,
    view_count,
    tags,
    is_featured,
  } = article

  const isFeatured = featured || is_featured

  return (
    <Link
      to={`/articles/${slug}`}
      className="group block card card-hover overflow-hidden"
    >
      {/* Cover Image */}
      <div className="relative h-52 overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #e0e8ff, #f0f4ff)' }}>
        {cover_image ? (
          <img loading="lazy"
            src={cover_image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-6xl font-bold font-display" style={{ color: '#a4b8fc' }}>
              {title.charAt(0)}
            </div>
          </div>
        )}
        {/* Overlay gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Featured badge */}
        {isFeatured && (
          <div
            className="absolute top-3 left-3 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg"
            style={{ background: 'linear-gradient(to right, #f59e0b, #fbbf24)' }}
          >
            <FaStar className="w-3 h-3" />
            精选文章
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Tags */}
        {tags && tags.length > 0 && (
          <TagList tags={tags} size="xs" clickable={false} className="mb-3" />
        )}

        {/* Title */}
        <h3 className="font-display text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
          {title}
        </h3>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">{excerpt}</p>
        )}

        {/* Meta & Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>
              {published_at && format(new Date(published_at), 'yyyy年MM月dd日')}
            </span>
            {reading_time && (
              <span className="flex items-center gap-1">
                <FaClock className="w-3 h-3" />
                {reading_time}分钟
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {id && <FavoriteButton articleId={id} size="sm" />}
            {view_count !== undefined && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <FaEye className="w-3 h-3" />
                {view_count}
              </span>
            )}
          </div>
        </div>

        {/* Read more indicator */}
        <div className="mt-4 flex items-center text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1" style={{ color: '#4150e6' }}>
          阅读全文
          <FaArrowRight className="ml-2 w-3 h-3" />
        </div>
      </div>
    </Link>
  )
}

// Featured article card (larger, horizontal layout)
export function FeaturedArticleCard({ article }) {
  const { title, slug, excerpt, cover_image, published_at, reading_time, tags } = article

  return (
    <Link
      to={`/articles/${slug}`}
      className="group relative block card overflow-hidden md:flex"
      style={{ boxShadow: '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.04)' }}
    >
      {/* Cover Image */}
      <div className="relative md:w-2/5 h-64 md:h-auto md:min-h-[320px] overflow-hidden" style={{ background: 'linear-gradient(to bottom right, #c7d4fe, #e0e8ff)' }}>
        {cover_image ? (
          <img loading="lazy"
            src={cover_image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-8xl font-bold font-display" style={{ color: '#7c93f8' }}>
              {title.charAt(0)}
            </div>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent md:bg-gradient-to-t" />

        {/* Featured badge */}
        <div
          className="absolute top-4 left-4 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 backdrop-blur-sm"
          style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(251, 191, 36, 0.95))', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)' }}
        >
          <FaStar className="w-4 h-4" />
          精选文章
        </div>
      </div>

      {/* Content */}
      <div className="md:w-3/5 p-6 md:p-10 flex flex-col justify-center relative">
        {/* Decorative accent */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" style={{ background: 'radial-gradient(circle, rgba(90, 110, 242, 0.1) 0%, transparent 70%)' }} />

        {/* Tags */}
        {tags && tags.length > 0 && (
          <TagList tags={tags} size="sm" clickable={false} className="mb-4" />
        )}

        {/* Title */}
        <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4 group-hover:text-primary-600 transition-colors duration-300 leading-tight">
          {title}
        </h2>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-gray-500 mb-6 line-clamp-3 leading-relaxed text-base">{excerpt}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
          <span>
            {published_at && format(new Date(published_at), 'yyyy年MM月dd日')}
          </span>
          {reading_time && (
            <span className="flex items-center gap-1.5">
              <FaClock className="w-4 h-4" />
              {reading_time} 分钟阅读
            </span>
          )}
        </div>

        {/* CTA Button */}
        <div
          className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl self-start transition-all duration-300 group-hover:shadow-lg transform group-hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(to right, #4150e6, #5a6ef2)', boxShadow: '0 2px 10px rgba(65, 80, 230, 0.3)' }}
        >
          阅读全文
          <FaArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
        </div>
      </div>
    </Link>
  )
}
