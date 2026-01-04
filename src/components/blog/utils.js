// Utility functions for blog components

// Extract headings from markdown content
export function extractHeadings(content) {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm
  const headings = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].trim()
    const id = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')

    headings.push({ level, text, id })
  }

  return headings
}
