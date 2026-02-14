/**
 * YouTube IFrame API helper for dual-end synchronized playback.
 * Both peers load their own YouTube player and sync via socket events.
 */

let apiReady = false
let apiLoading = false
const apiCallbacks = []

/**
 * Load the YouTube IFrame API script (once).
 * Resolves when YT.Player is available.
 */
export function loadYouTubeAPI() {
  if (apiReady && window.YT?.Player) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (apiReady && window.YT?.Player) { resolve(); return }
    apiCallbacks.push(resolve)
    if (apiLoading) return
    apiLoading = true
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.onerror = () => { apiLoading = false; reject(new Error('Failed to load YouTube API')) }
    document.head.appendChild(tag)
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true
      apiLoading = false
      apiCallbacks.forEach(cb => cb())
      apiCallbacks.length = 0
    }
  })
}

/**
 * Parse a YouTube URL and extract video ID or playlist ID.
 * Supports:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/playlist?list=PLAYLIST_ID
 *   - https://www.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 *   - https://music.youtube.com/watch?v=VIDEO_ID&list=PLAYLIST_ID
 *
 * Returns { videoId, listId } or null if invalid.
 */
export function parseYouTubeURL(url) {
  if (!url || typeof url !== 'string') return null
  try {
    // Normalise: add protocol if missing
    let u = url.trim()
    if (!u.startsWith('http')) u = 'https://' + u

    const parsed = new URL(u)
    const host = parsed.hostname.replace('www.', '').replace('music.', '')

    if (host === 'youtube.com') {
      const videoId = parsed.searchParams.get('v') || null
      const listId = parsed.searchParams.get('list') || null
      if (videoId || listId) return { videoId, listId }
      // /playlist?list=
      if (parsed.pathname === '/playlist' && listId) return { videoId: null, listId }
      return null
    }

    if (host === 'youtu.be') {
      const videoId = parsed.pathname.slice(1) || null
      const listId = parsed.searchParams.get('list') || null
      return videoId ? { videoId, listId } : null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Create a YouTube player in the given DOM element.
 *
 * @param {string|HTMLElement} elementId - DOM element or its ID
 * @param {object} opts
 * @param {string}  opts.videoId  - single video ID (optional if listId given)
 * @param {string}  opts.listId   - playlist ID (optional)
 * @param {function} opts.onReady
 * @param {function} opts.onStateChange - receives YT.PlayerState value
 * @param {function} opts.onError
 * @returns {YT.Player}
 */
export function createYTPlayer(elementId, { videoId, listId, onReady, onStateChange, onError } = {}) {
  const playerVars = {
    autoplay: 0,
    controls: 0,       // We provide our own UI
    modestbranding: 1,
    rel: 0,
    playsinline: 1,
    enablejsapi: 1,
    origin: window.location.origin,
  }
  if (listId) {
    playerVars.listType = 'playlist'
    playerVars.list = listId
  }

  const opts = {
    height: '1',
    width: '1',
    playerVars,
    events: {
      onReady: onReady || (() => {}),
      onStateChange: (e) => onStateChange?.(e.data),
      onError: (e) => onError?.(e.data),
    },
  }
  // Only set videoId when we actually have one — passing undefined still triggers validation
  if (videoId) {
    opts.videoId = videoId
  }

  return new window.YT.Player(elementId, opts)
}

/**
 * YT.PlayerState constants (for reference without importing YT)
 */
export const YTState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
}
