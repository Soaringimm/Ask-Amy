import { useState, useCallback } from 'react'
import { FaSearch, FaTimes } from 'react-icons/fa'

export function SearchBar({ value, onChange, placeholder = '搜索文章...' }) {
  const [isFocused, setIsFocused] = useState(false)

  const handleClear = useCallback(() => {
    onChange('')
  }, [onChange])

  return (
    <div
      className={`relative flex items-center transition-all duration-200 ${
        isFocused ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      }`}
    >
      <div className="absolute left-4 text-gray-400">
        <FaSearch className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
