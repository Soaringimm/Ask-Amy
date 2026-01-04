import { FaWeixin, FaWeibo, FaTwitter, FaLink, FaCheck } from 'react-icons/fa'
import { useState } from 'react'

export function ShareButtons({ title, url, className = '' }) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareLinks = [
    {
      name: 'WeChat',
      icon: FaWeixin,
      color: '#07C160',
      // WeChat doesn't have direct share URL, show QR code or copy link
      onClick: handleCopyLink,
      tooltip: '复制链接分享到微信',
    },
    {
      name: 'Weibo',
      icon: FaWeibo,
      color: '#E6162D',
      href: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`,
    },
    {
      name: 'Twitter',
      icon: FaTwitter,
      color: '#1DA1F2',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
  ]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm text-gray-500">分享：</span>
      <div className="flex items-center gap-2">
        {shareLinks.map((link) => (
          link.href ? (
            <a
              key={link.name}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={`分享到 ${link.name}`}
              style={{ color: link.color }}
            >
              <link.icon className="w-5 h-5" />
            </a>
          ) : (
            <button
              key={link.name}
              onClick={link.onClick}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={link.tooltip}
              style={{ color: link.color }}
            >
              <link.icon className="w-5 h-5" />
            </button>
          )
        ))}
        <button
          onClick={handleCopyLink}
          className={`p-2 rounded-full transition-colors ${
            copied ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-500'
          }`}
          title="复制链接"
        >
          {copied ? <FaCheck className="w-5 h-5" /> : <FaLink className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}

// Floating share bar for mobile
export function FloatingShareBar({ title, url }) {
  const [copied, setCopied] = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg border px-4 py-2 flex items-center gap-3 z-40 md:hidden">
      <button
        onClick={handleCopyLink}
        className={`p-2 rounded-full transition-colors ${
          copied ? 'bg-green-100 text-green-600' : 'text-gray-500'
        }`}
      >
        {copied ? <FaCheck className="w-5 h-5" /> : <FaLink className="w-5 h-5" />}
      </button>
      <a
        href={`https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full text-[#E6162D]"
      >
        <FaWeibo className="w-5 h-5" />
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full text-[#1DA1F2]"
      >
        <FaTwitter className="w-5 h-5" />
      </a>
    </div>
  )
}
