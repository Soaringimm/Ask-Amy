import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import { FaCopy, FaCheck, FaLink } from 'react-icons/fa'
import { useState } from 'react'

SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('ts', typescript)
SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('shell', bash)
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('markdown', markdown)
SyntaxHighlighter.registerLanguage('md', markdown)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('py', python)
SyntaxHighlighter.registerLanguage('yaml', yaml)
yaml && SyntaxHighlighter.registerLanguage('yml', yaml)

const LANGUAGE_ALIAS_MAP = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  md: 'markdown',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash',
}

// Refined code block with elegant styling
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)
  const normalizedLanguage = LANGUAGE_ALIAS_MAP[language] || language || 'text'

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
    <div className="relative group my-8">
      {/* Elegant container with subtle border */}
      <div className="rounded-2xl overflow-hidden bg-slate-900 shadow-lg">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/50">
          {/* Window dots */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            {language && (
              <span className="ml-3 text-xs font-medium tracking-wide uppercase text-slate-400">
                {language}
              </span>
            )}
          </div>
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
              copied ? 'text-green-400 bg-green-400/10' : 'text-slate-400 hover:text-slate-300'
            }`}
            title="复制代码"
          >
            {copied ? (
              <>
                <FaCheck className="w-3 h-3" />
                已复制
              </>
            ) : (
              <>
                <FaCopy className="w-3 h-3" />
                复制
              </>
            )}
          </button>
        </div>
        {/* Code content */}
        <SyntaxHighlighter
          language={normalizedLanguage}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '1.25rem 1.5rem',
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.7',
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
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

    // Inline code with refined styling
    return (
      <code
        className="px-2 py-1 rounded-lg text-sm font-mono bg-primary-50 text-primary-600"
        {...props}
      >
        {children}
      </code>
    )
  },

  // Headings with design system colors
  // Note: [&_a] selector ensures heading links inherit heading color instead of link color
  h1: ({ children, ...props }) => (
    <h1
      className="font-display text-3xl md:text-4xl font-bold text-gray-900 mt-12 mb-6 pb-4 border-b border-gray-200 [&_a]:text-inherit [&_a]:no-underline [&_a:hover]:text-gray-700"
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2
      className="font-display text-2xl md:text-[1.75rem] font-bold text-gray-800 mt-12 mb-6 [&_a]:text-inherit [&_a]:no-underline [&_a:hover]:text-gray-600"
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3
      className="font-display text-xl md:text-[1.375rem] font-semibold text-gray-700 mt-8 mb-4 [&_a]:text-inherit [&_a]:no-underline [&_a:hover]:text-gray-500"
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 className="font-display text-lg font-semibold text-gray-600 mt-6 mb-3 [&_a]:text-inherit [&_a]:no-underline [&_a:hover]:text-gray-500" {...props}>
      {children}
    </h4>
  ),

  // Paragraphs with better typography
  p: ({ children, ...props }) => (
    <p className="text-gray-600 leading-[1.85] mb-5 text-[17px]" {...props}>
      {children}
    </p>
  ),

  // Links with design system styling
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200 no-underline"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  ),

  // Images with design system styling
  img: ({ alt, src, ...props }) => {
    // Don't show alt text as caption if it looks like a filename
    const isFilename = alt && /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i.test(alt.trim())
    const showCaption = alt && !isFilename && alt.trim().length > 0

    return (
      <figure className="my-10">
        <div className="relative rounded-2xl overflow-hidden shadow-soft-lg">
          <img
            src={src}
            alt={alt || ''}
            className="w-full h-auto"
            loading="lazy"
            {...props}
          />
        </div>
        {showCaption && (
          <figcaption className="text-center text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
            <span className="w-8 h-px bg-primary-200" />
            {alt}
            <span className="w-8 h-px bg-primary-200" />
          </figcaption>
        )}
      </figure>
    )
  },

  // Lists with refined styling
  ul: ({ children, ...props }) => (
    <ul className="my-6 space-y-3" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-6 space-y-3 list-none counter-reset-item" style={{ counterReset: 'item' }} {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li
      className="flex items-start gap-3 text-gray-600 text-[17px] leading-relaxed"
      {...props}
    >
      <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5 bg-primary-100 text-primary-600">
        •
      </span>
      <span className="flex-1">{children}</span>
    </li>
  ),

  // Elegant blockquote
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="relative my-8 py-6 px-8 rounded-2xl bg-primary-50 border-l-4 border-primary-400"
      {...props}
    >
      <div className="absolute -top-3 left-6 text-5xl font-display text-primary-200">"</div>
      <div className="relative text-gray-600 italic text-lg leading-relaxed">
        {children}
      </div>
    </blockquote>
  ),

  // Modern tables
  table: ({ children, ...props }) => (
    <div className="my-8 overflow-x-auto rounded-2xl shadow-soft">
      <table className="min-w-full" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-primary-50" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-6 py-4 text-left text-sm font-semibold tracking-wide text-gray-900" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-6 py-4 text-sm text-gray-600 bg-white border-t border-gray-100" {...props}>
      {children}
    </td>
  ),

  // Elegant horizontal rule
  hr: (props) => (
    <div className="my-12 flex items-center justify-center gap-3" {...props}>
      <div className="h-px flex-1 max-w-24 bg-gradient-to-r from-transparent to-primary-200" />
      <div className="w-2 h-2 rounded-full bg-primary-500" />
      <div className="h-px flex-1 max-w-24 bg-gradient-to-l from-transparent to-primary-200" />
    </div>
  ),

  // Strong and emphasis
  strong: ({ children, ...props }) => (
    <strong className="font-bold text-gray-900" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-gray-600" {...props}>
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
