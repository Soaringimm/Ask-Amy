import { Link } from 'react-router-dom'

// Single tag badge component
export function Tag({ tag, size = 'sm', clickable = true }) {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  }

  const baseClasses = `inline-flex items-center rounded-full font-medium transition-colors`
  const colorStyle = {
    backgroundColor: `${tag.color}15`,
    color: tag.color,
    borderColor: `${tag.color}30`,
  }

  if (clickable) {
    return (
      <Link
        to={`/articles?tag=${tag.slug}`}
        className={`${baseClasses} ${sizeClasses[size]} border hover:opacity-80`}
        style={colorStyle}
      >
        {tag.name}
      </Link>
    )
  }

  return (
    <span
      className={`${baseClasses} ${sizeClasses[size]} border`}
      style={colorStyle}
    >
      {tag.name}
    </span>
  )
}

// Tag list component
export function TagList({ tags, size = 'sm', clickable = true, className = '' }) {
  if (!tags || tags.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <Tag key={tag.id} tag={tag} size={size} clickable={clickable} />
      ))}
    </div>
  )
}

// Tag filter pills for article list
export function TagFilter({ tags, selectedTag, onTagSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onTagSelect(null)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !selectedTag
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        全部
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onTagSelect(tag.slug)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border`}
          style={
            selectedTag === tag.slug
              ? { backgroundColor: tag.color, color: 'white', borderColor: tag.color }
              : { backgroundColor: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }
          }
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
