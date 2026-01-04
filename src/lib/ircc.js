// DEV: vite proxy adds token; PROD: nginx proxy adds token
const API_URL = '/api/help-centre'
const API_TOKEN = import.meta.env.VITE_SEARCH_SERVICE_TOKEN

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
 * @param {number} topK - Max results (default 10).
 * @returns {Promise<{results: Array, lang: string}>} - List of questions and detected language.
 */
export async function searchQuestions(query, topK = 10) {
  if (!query) return { results: [], lang: 'zh' }

  const lang = detectLanguage(query)

  try {
    const url = new URL(`${API_URL}/search`, window.location.origin)
    url.searchParams.append('q', query)
    url.searchParams.append('top_k', topK)
    url.searchParams.append('lang', lang)

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    })

    if (!response.ok) {
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
    const url = new URL(`${API_URL}/detail/${qnum}`, window.location.origin)
    url.searchParams.append('lang', lang)
    url.searchParams.append('format', 'html')

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
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
