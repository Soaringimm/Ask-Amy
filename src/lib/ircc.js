const API_URL = import.meta.env.DEV ? '/api' : (import.meta.env.VITE_IRCC_API_URL || '/api');
const API_KEY = import.meta.env.VITE_IRCC_API_KEY || '4DG1YsU_KoVNk_kfUXR92XOC9eXglZFHXWhSHucUkss';

/**
 * Search for questions in the IRCC Help Centre.
 * @param {string} query - The search keyword.
 * @param {number} limit - Max results (default 10).
 * @returns {Promise<Array>} - List of questions.
 */
export async function searchQuestions(query, limit = 10) {
  if (!query) return [];

  try {
    const url = new URL(`${API_URL}/search`, window.location.origin);
    url.searchParams.append('q', query);
    url.searchParams.append('limit', limit);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized: Invalid API Key. Please check VITE_IRCC_API_KEY.');
      }
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('IRCC Search Error:', error);
    throw error;
  }
}

/**
 * Get details for a specific question.
 * @param {number|string} qnum - The question ID (e.g. 479).
 * @param {string} lang - Language code (default 'zh').
 * @returns {Promise<Object>} - Question details with Markdown content.
 */
export async function getQuestionDetail(qnum, lang = 'zh') {
  try {
    const url = new URL(`${API_URL}/question/${qnum}`, window.location.origin);
    url.searchParams.append('lang', lang);
    url.searchParams.append('format', 'html');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Question not found.');
      }
      throw new Error(`Get detail failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('IRCC Detail Error:', error);
    throw error;
  }
}
