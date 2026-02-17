import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required')
}

// Pre-check and clear expired session data BEFORE creating Supabase client
// This prevents the client from attempting to refresh expired tokens which can hang
const clearExpiredSession = () => {
  try {
    // Find all Supabase auth tokens (works for both hosted and self-hosted)
    const authKeys = Object.keys(localStorage).filter(
      k => k.startsWith('sb-') && k.endsWith('-auth-token')
    )

    for (const key of authKeys) {
      const stored = localStorage.getItem(key)
      if (!stored) continue

      try {
        const session = JSON.parse(stored)
        const expiresAt = session?.expires_at

        if (expiresAt) {
          // Add 60 second buffer - if token expires within 60 seconds, clear it
          const isExpired = Date.now() / 1000 > expiresAt - 60
          if (isExpired) {
            if (import.meta.env.DEV) console.log('Clearing expired session:', key)
            localStorage.removeItem(key)
          }
        }
      } catch {
        // Corrupted data, remove it
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Fallback: clear all Supabase auth data
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
      .forEach(k => localStorage.removeItem(k))
  }
}

clearExpiredSession()

// Custom fetch with timeout to prevent hanging requests
// Reduced to 4 seconds for auth-related requests to fail fast
const fetchWithTimeout = (url, options = {}) => {
  const controller = new AbortController()
  // Use shorter timeout for auth endpoints, longer for data
  const isAuthRequest = url.includes('/auth/')
  const timeoutMs = isAuthRequest ? 4000 : 8000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithTimeout,
  },
})
