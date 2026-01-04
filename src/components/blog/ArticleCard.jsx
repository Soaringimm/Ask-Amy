import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { FaEye, FaClock, FaStar } from 'react-icons/fa'
import { TagList } from './Tag'

export function ArticleCard({ article, featured = false }) {
  const {
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

  return (
    <Link
      to={`/articles/${slug}`}
      className={`group block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 ${
        featured || is_featured ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      }`}
    >
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary-100 to-primary-50 overflow-hidden">
        {cover_image ? (
          <img
            src={cover_image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-primary-300 text-6xl font-bold">
              {title.charAt(0)}
            </div>
          </div>
        )}
        {/* Featured badge */}
        {(featured || is_featured) && (
          <div className="absolute top-3 right-3 bg-primary-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <FaStar className="w-3 h-3" />
            精选
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {title}
        </h3>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{excerpt}</p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {published_at && format(new Date(published_at), 'yyyy年MM月dd日')}
          </span>
          <div className="flex items-center gap-3">
            {reading_time && (
              <span className="flex items-center gap-1">
                <FaClock className="w-3 h-3" />
                {reading_time} 分钟
              </span>
            )}
            {view_count !== undefined && (
              <span className="flex items-center gap-1">
                <FaEye className="w-3 h-3" />
                {view_count}
              </span>
            )}
          </div>
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
      className="group block bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 md:flex"
    >
      {/* Cover Image */}
      <div className="relative md:w-2/5 h-56 md:h-auto bg-gradient-to-br from-primary-100 to-primary-50 overflow-hidden">
        {cover_image ? (
          <img
            src={cover_image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-primary-300 text-8xl font-bold">
              {title.charAt(0)}
            </div>
          </div>
        )}
        {/* Featured badge */}
        <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5">
          <FaStar className="w-4 h-4" />
          精选文章
        </div>
      </div>

      {/* Content */}
      <div className="md:w-3/5 p-6 md:p-8 flex flex-col justify-center">
        {/* Tags */}
        {tags && tags.length > 0 && (
          <TagList tags={tags} size="sm" clickable={false} className="mb-4" />
        )}

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors">
          {title}
        </h2>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-gray-600 mb-4 line-clamp-3">{excerpt}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>
            {published_at && format(new Date(published_at), 'yyyy年MM月dd日')}
          </span>
          {reading_time && (
            <span className="flex items-center gap-1">
              <FaClock className="w-4 h-4" />
              {reading_time} 分钟阅读
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
