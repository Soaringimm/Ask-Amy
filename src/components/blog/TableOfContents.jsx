import { useState, useEffect } from 'react'
import { FaList } from 'react-icons/fa'
import { extractHeadings } from './utils'

export function TableOfContents({ content, className = '' }) {
  const [activeId, setActiveId] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const headings = extractHeadings(content)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )

    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 2) return null

  const handleClick = (id) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = element.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <nav className={`bg-gray-50 rounded-xl p-5 ${className}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <FaList className="w-4 h-4" />
          目录
        </span>
        <span className="text-gray-400 text-xs">
          {isCollapsed ? '展开' : '收起'}
        </span>
      </button>

      {!isCollapsed && (
        <ul className="mt-4 space-y-2">
          {headings.map(({ level, text, id }) => (
            <li
              key={id}
              style={{ paddingLeft: `${(level - 1) * 12}px` }}
            >
              <button
                onClick={() => handleClick(id)}
                className={`text-left text-sm transition-colors hover:text-primary-600 ${
                  activeId === id
                    ? 'text-primary-600 font-medium'
                    : 'text-gray-600'
                }`}
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}

// Floating TOC for desktop
export function FloatingTableOfContents({ content }) {
  const [activeId, setActiveId] = useState('')
  const headings = extractHeadings(content)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-100px 0px -70% 0px' }
    )

    headings.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length < 1) return null

  const handleClick = (id) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = element.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <nav className="hidden xl:block sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="rounded-xl p-5 bg-primary-50 border border-primary-100">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-primary-500 to-primary-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            目录
          </h4>
        </div>
        <ul className="space-y-2.5">
          {headings.map(({ level, text, id }) => (
            <li
              key={id}
              style={{ paddingLeft: `${(level - 1) * 10}px` }}
            >
              <button
                onClick={() => handleClick(id)}
                className={`text-left text-sm leading-relaxed transition-all duration-200 w-full truncate pl-2 -ml-2 border-l-2 ${
                  activeId === id
                    ? 'text-primary-600 font-medium border-primary-500'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
