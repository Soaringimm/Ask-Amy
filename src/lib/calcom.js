const CAL_API_URL = 'https://api.cal.com/v1'
const CAL_API_KEY = import.meta.env.VITE_CAL_API_KEY

/**
 * Get all bookings from Cal.com API
 * @returns {Promise<Array>} - List of bookings
 */
export async function getBookings() {
  if (!CAL_API_KEY) {
    console.warn('Cal.com API key not configured')
    return []
  }

  try {
    const response = await fetch(`${CAL_API_URL}/bookings?apiKey=${CAL_API_KEY}`)

    if (!response.ok) {
      throw new Error(`Cal.com API error: ${response.status}`)
    }

    const data = await response.json()
    return data.bookings || []
  } catch (error) {
    console.error('Error fetching Cal.com bookings:', error)
    throw error
  }
}

/**
 * Get Cal.com username for embedding
 * @returns {string} - Cal.com username
 */
export function getCalUsername() {
  return import.meta.env.VITE_CAL_USERNAME || ''
}
