import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { FaCopy, FaCheck, FaLink } from 'react-icons/fa'
import { useState } from 'react'

// Code block with copy button
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="relative group my-6">
      {/* Language label */}
      {language && (
        <div className="absolute top-0 left-4 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-b font-mono">
          {language}
        </div>
      )}
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors opacity-0 group-hover:opacity-100"
        title="复制代码"
      >
        {copied ? (
          <FaCheck className="w-4 h-4 text-green-400" />
        ) : (
          <FaCopy className="w-4 h-4" />
        )}
      </button>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          paddingTop: language ? '2.5rem' : '1.5rem',
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

// Custom components for markdown rendering
const components = {
  // Code blocks
  code({ inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : null
    const codeString = String(children).replace(/\n$/, '')

    if (!inline && (language || codeString.includes('\n'))) {
      return <CodeBlock language={language}>{codeString}</CodeBlock>
    }

    // Inline code
    return (
      <code
        className="px-1.5 py-0.5 bg-gray-100 text-primary-700 rounded text-sm font-mono"
        {...props}
      >
        {children}
      </code>
    )
  },

  // Headings with anchor links
  h1: ({ children, ...props }) => (
    <h1
      className="text-3xl font-bold text-gray-900 mt-10 mb-4 pb-2 border-b group"
      {...props}
    >
      {children}
      <a href={`#${props.id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-primary-500">
        <FaLink className="inline w-4 h-4" />
      </a>
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="text-2xl font-bold text-gray-900 mt-8 mb-4 group"
      {...props}
    >
      {children}
      <a href={`#${props.id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-primary-500">
        <FaLink className="inline w-4 h-4" />
      </a>
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="text-xl font-semibold text-gray-900 mt-6 mb-3 group"
      {...props}
    >
      {children}
      <a href={`#${props.id}`} className="ml-2 opacity-0 group-hover:opacity-100 text-primary-500">
        <FaLink className="inline w-3 h-3" />
      </a>
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="text-lg font-semibold text-gray-900 mt-5 mb-2" {...props}>
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children, ...props }) => (
    <p className="text-gray-700 leading-relaxed mb-4" {...props}>
      {children}
    </p>
  ),

  // Links
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  ),

  // Images
  img: ({ alt, src, ...props }) => (
    <figure className="my-6">
      <img
        src={src}
        alt={alt}
        className="rounded-xl max-w-full h-auto mx-auto shadow-sm"
        loading="lazy"
        {...props}
      />
      {alt && (
        <figcaption className="text-center text-sm text-gray-500 mt-2">
          {alt}
        </figcaption>
      )}
    </figure>
  ),

  // Lists
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-outside pl-6 mb-4 space-y-1 text-gray-700" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-outside pl-6 mb-4 space-y-1 text-gray-700" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="leading-relaxed" {...props}>
      {children}
    </li>
  ),

  // Blockquote
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-primary-500 pl-4 my-6 italic text-gray-600 bg-gray-50 py-3 pr-4 rounded-r-lg"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Tables
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full divide-y divide-gray-200 border rounded-lg" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-50" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-3 text-sm text-gray-700 border-t" {...props}>
      {children}
    </td>
  ),

  // Horizontal rule
  hr: (props) => (
    <hr className="my-8 border-t border-gray-200" {...props} />
  ),

  // Strong and emphasis
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-gray-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),
}

export function MarkdownRenderer({ content, className = '' }) {
  return (
    <div className={`prose prose-lg max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
