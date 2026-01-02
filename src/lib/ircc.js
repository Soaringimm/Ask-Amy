// Help Centre API Client
// Dev: http://localhost:3104/api/v1/help-centre
// Prod: https://es_search.jackyzhang.app/api/v1/help-centre

const API_BASE = import.meta.env.VITE_HELP_CENTRE_URL
const API_TOKEN = import.meta.env.VITE_HELP_CENTRE_TOKEN

if (!API_BASE || !API_TOKEN) {
  console.warn('Help Centre API not configured: VITE_HELP_CENTRE_URL and VITE_HELP_CENTRE_TOKEN are required')
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
    const response = await fetch(`${API_BASE}/help-centre/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        lang,
        top_k: limit,
      }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid token. Please check VITE_HELP_CENTRE_TOKEN.')
      }
      throw new Error(`Search failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return { results: data.results || [], lang: data.lang || lang }
  } catch (error) {
    console.error('Help Centre Search Error:', error)
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
    const params = new URLSearchParams({ lang, format: 'html' })
    const response = await fetch(`${API_BASE}/help-centre/detail/${qnum}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
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
    console.error('Help Centre Detail Error:', error)
    throw error
  }
}
