import { FaUser } from 'react-icons/fa'

export function AuthorInfo({ author, publishedAt, readingTime, className = '' }) {
  // Default author info if not provided
  const authorName = author?.display_name || 'Ask Amy 团队'
  const authorAvatar = author?.avatar_url

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-full h-full object-cover"
          />
        ) : (
          <FaUser className="w-5 h-5 text-primary-600" />
        )}
      </div>

      {/* Info */}
      <div>
        <p className="font-medium text-gray-900">{authorName}</p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {publishedAt && (
            <span>{new Date(publishedAt).toLocaleDateString('zh-CN')}</span>
          )}
          {readingTime && (
            <>
              <span>·</span>
              <span>{readingTime} 分钟阅读</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact author badge for cards
export function AuthorBadge({ author }) {
  const authorName = author?.display_name || 'Ask Amy'
  const authorAvatar = author?.avatar_url

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-full h-full object-cover"
          />
        ) : (
          <FaUser className="w-3 h-3 text-primary-600" />
        )}
      </div>
      <span className="text-sm text-gray-600">{authorName}</span>
    </div>
  )
}
