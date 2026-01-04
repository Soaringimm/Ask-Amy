const API_URL = import.meta.env.DEV ? '/api' : import.meta.env.VITE_IRCC_API_URL
const API_KEY = import.meta.env.VITE_IRCC_API_KEY

if (!API_URL || !API_KEY) {
  console.warn('IRCC API not configured: VITE_IRCC_API_URL and VITE_IRCC_API_KEY are required')
}

/**
 * Detect if text contains Chinese characters.
 * @param {string} text - The text to analyze.
 * @returns {string} - 'zh' for Chinese, 'en' for English.
 */
export function detectLanguage(text) {
  const hasChinese = /[\u4e00-\u9fff]/.test(text)
  return hasChinese ? 'zh' : 'en'
}

/**
 * Search for questions in the IRCC Help Centre.
 * Auto-detects language from query.
 * @param {string} query - The search keyword.
 * @param {number} limit - Max results (default 10).
 * @returns {Promise<{results: Array, lang: string}>} - List of questions and detected language.
 */
export async function searchQuestions(query, limit = 10) {
  if (!query) return { results: [], lang: 'zh' }

  const lang = detectLanguage(query)

  try {
    const url = new URL(`${API_URL}/search`, window.location.origin)
    url.searchParams.append('q', query)
    url.searchParams.append('limit', limit)
    url.searchParams.append('lang', lang)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid API Key. Please check VITE_IRCC_API_KEY.')
      }
      throw new Error(`Search failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return { results: data.results, lang: data.lang || lang }
  } catch (error) {
    console.error('IRCC Search Error:', error)
    throw error
  }
}

/**
 * Get details for a specific question.
 * @param {number|string} qnum - The question ID (e.g. 479).
 * @param {string} lang - Language code ('zh' or 'en').
 * @returns {Promise<Object>} - Question details with HTML content.
 */
export async function getQuestionDetail(qnum, lang = 'zh') {
  try {
    const url = new URL(`${API_URL}/question/${qnum}`, window.location.origin)
    url.searchParams.append('lang', lang)
    url.searchParams.append('format', 'html')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Question not found.')
      }
      throw new Error(`Get detail failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('IRCC Detail Error:', error)
    throw error
  }
}
