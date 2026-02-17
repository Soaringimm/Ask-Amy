import { useState, useRef, useEffect } from 'react'
import { loadYouTubeAPI, parseYouTubeURL, createYTPlayer, YTState } from '../../lib/youtubePlayer'
import { savePlaylist, getPlaylists, deletePlaylist as deletePlaylistApi } from '../../lib/playlistStorage'
import { YT_IGNORE_STATE_DELAY, YT_TIME_UPDATE_INTERVAL, YT_PLAYBACK_RATES, MUSIC_RESTART_THRESHOLD } from './constants'

/**
 * Manages YouTube player integration and sync.
 */
export default function useYouTubePlayer({ socketRef, user, pauseMusic, setActiveTab: setTab }) {
  const [ytMode, setYtMode] = useState(false)
  const [ytUrl, setYtUrl] = useState('')
  const [ytVideoTitle, setYtVideoTitle] = useState('')
  const [ytPlaying, setYtPlaying] = useState(false)
  const [ytTime, setYtTime] = useState(0)
  const [ytDuration, setYtDuration] = useState(0)
  const [ytPlaylistItems, setYtPlaylistItems] = useState([])
  const [ytCurrentIndex, setYtCurrentIndex] = useState(-1)
  const [ytLoading, setYtLoading] = useState(false)
  const [isYtHost, setIsYtHost] = useState(false)
  const [ytPlaybackRate, setYtPlaybackRate] = useState(1)
  const [ytManagedItems, setYtManagedItems] = useState([])
  const [savedYtPlaylists, setSavedYtPlaylists] = useState([])
  const [ytPlaylistName, setYtPlaylistName] = useState('')
  const [savingYtPlaylist, setSavingYtPlaylist] = useState(false)

  const ytPlayerRef = useRef(null)
  const ytContainerRef = useRef(null)
  const ytTimerRef = useRef(null)
  const ytIgnoreStateRef = useRef(false)
  const ytManagedPlayingIdxRef = useRef(-1)
  const ytManagedItemsRef = useRef([])
  const ytTitlesFetchingRef = useRef(new Set())

  useEffect(() => { ytManagedItemsRef.current = ytManagedItems }, [ytManagedItems])

  // Fetch saved playlists
  useEffect(() => {
    if (user) fetchSavedYtPlaylists(user.id)
    else setSavedYtPlaylists([])
  }, [user])

  async function fetchSavedYtPlaylists(userId) {
    try {
      const data = await getPlaylists(userId, 'youtube')
      setSavedYtPlaylists(data)
    } catch (err) {
      console.error('Failed to fetch YouTube playlists:', err)
    }
  }

  // ResizeObserver for YT container
  useEffect(() => {
    const container = ytContainerRef.current
    if (!container) return
    const ro = new ResizeObserver((entries) => {
      const p = ytPlayerRef.current
      if (!p || typeof p.setSize !== 'function') return
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) p.setSize(width, height)
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Fetch YouTube playlist track titles via noembed
  useEffect(() => {
    const toFetch = ytPlaylistItems.filter(
      item => /^Track \d+$/.test(item.title) && !ytTitlesFetchingRef.current.has(item.videoId)
    )
    if (toFetch.length === 0) return
    toFetch.forEach(item => ytTitlesFetchingRef.current.add(item.videoId))
    toFetch.forEach(async (item) => {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${item.videoId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.title) {
            setYtPlaylistItems(prev => prev.map(p => p.videoId === item.videoId ? { ...p, title: data.title } : p))
          }
        }
      } catch (err) {
        console.debug('Failed to fetch YouTube title:', err.message)
      }
    })
  }, [ytPlaylistItems])

  // Resume YouTube playback on new default output device when audio device changes (e.g. BT headset removed)
  useEffect(() => {
    function handleDeviceChange() {
      const p = ytPlayerRef.current
      if (!p) return
      try {
        if (p.getPlayerState() === YTState.PLAYING) {
          // Brief pause-resume forces the browser to re-route audio to the new default output
          ytIgnoreStateRef.current = true
          p.pauseVideo()
          setTimeout(() => {
            try { p.playVideo() } catch (e) { console.debug('[YT devicechange] playVideo failed:', e.message) }
            setTimeout(() => { ytIgnoreStateRef.current = false }, YT_IGNORE_STATE_DELAY)
          }, 300)
        }
      } catch (e) {
        console.debug('[YT devicechange] state check failed:', e.message)
      }
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(ytTimerRef.current)
      if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy() } catch (e) { console.debug('YT player already destroyed:', e.message) } }
      ytPlayerRef.current = null
    }
  }, [])

  function startYtTimeUpdater() {
    clearInterval(ytTimerRef.current)
    ytTimerRef.current = setInterval(() => {
      const p = ytPlayerRef.current
      if (p && typeof p.getCurrentTime === 'function') setYtTime(p.getCurrentTime())
    }, YT_TIME_UPDATE_INTERVAL)
  }

  function stopYtTimeUpdater() {
    clearInterval(ytTimerRef.current)
    ytTimerRef.current = null
  }

  function handleYtStateChange(state) {
    if (ytIgnoreStateRef.current) return
    const p = ytPlayerRef.current
    if (!p) return

    if (state === YTState.PLAYING) {
      setYtPlaying(true)
      setYtDuration(p.getDuration?.() || 0)
      const data = p.getVideoData?.()
      if (data?.title) setYtVideoTitle(data.title)
      const plItems = p.getPlaylist?.()
      const plIdx = p.getPlaylistIndex?.() ?? 0
      if (plItems && plItems.length > 0) {
        setYtPlaylistItems(prev => {
          const updated = plItems.map((vid, i) => {
            const existing = prev.find(item => item.videoId === vid)
            return { videoId: vid, title: existing?.title || `Track ${i + 1}` }
          })
          if (data?.title && plIdx >= 0 && plIdx < updated.length) {
            updated[plIdx] = { ...updated[plIdx], title: data.title }
          }
          return updated
        })
        setYtCurrentIndex(plIdx)
      }
      if (data?.title && ytManagedPlayingIdxRef.current >= 0) {
        const mIdx = ytManagedPlayingIdxRef.current
        setYtManagedItems(prev => prev.map((item, i) => i === mIdx ? { ...item, title: data.title } : item))
      }
      startYtTimeUpdater()
      if (socketRef.current) {
        socketRef.current.emit('music-sync', {
          type: 'yt-state', state: 'playing', time: p.getCurrentTime(),
          title: data?.title || '', duration: p.getDuration?.() || 0, index: p.getPlaylistIndex?.() ?? -1,
        })
      }
    } else if (state === YTState.PAUSED) {
      setYtPlaying(false); stopYtTimeUpdater()
      if (socketRef.current) socketRef.current.emit('music-sync', { type: 'yt-state', state: 'paused', time: p.getCurrentTime() })
    } else if (state === YTState.ENDED) {
      setYtPlaying(false); stopYtTimeUpdater()
    }
  }

  async function loadYouTube(url) {
    const parsed = parseYouTubeURL(url)
    if (!parsed) return 'Invalid YouTube URL'

    setYtLoading(true); setIsYtHost(true); setYtMode(true); setTab('youtube')
    pauseMusic()

    try {
      await loadYouTubeAPI()
      if (ytPlayerRef.current) { ytPlayerRef.current.destroy(); ytPlayerRef.current = null }
      if (ytContainerRef.current) ytContainerRef.current.innerHTML = '<div id="yt-player-embed"></div>'

      const player = createYTPlayer('yt-player-embed', {
        videoId: parsed.videoId, listId: parsed.listId, visible: true,
        onReady: () => {
          setYtLoading(false)
          const pl = player.getPlaylist?.()
          if (pl && pl.length > 0) {
            setYtPlaylistItems(pl.map((vid, i) => ({ videoId: vid, title: `Track ${i + 1}` })))
            setYtCurrentIndex(player.getPlaylistIndex?.() ?? 0)
          }
          const dur = player.getDuration?.()
          if (dur > 0) setYtDuration(dur)
          const data = player.getVideoData?.()
          if (data?.title) setYtVideoTitle(data.title)
          player.playVideo()
          if (socketRef.current) {
            socketRef.current.emit('music-sync', { type: 'youtube-load', url, videoId: parsed.videoId, listId: parsed.listId })
          }
        },
        onStateChange: (state) => handleYtStateChange(state),
        onError: (code) => {
          console.error('[YT] player error:', code)
          setYtLoading(false); setYtMode(false); setYtVideoTitle(''); setIsYtHost(false)
        },
      })
      ytPlayerRef.current = player
      return null // no error
    } catch (err) {
      console.error('[YT] load error:', err)
      setYtLoading(false); setYtMode(false); setIsYtHost(false)
      return 'Failed to load YouTube player'
    }
  }

  function toggleYtPlayback() {
    const p = ytPlayerRef.current
    if (!p) return
    if (ytPlaying) p.pauseVideo()
    else p.playVideo()
  }

  function ytPlayAt(index) {
    const p = ytPlayerRef.current
    if (p) p.playVideoAt(index)
  }

  function seekYt(e) {
    const p = ytPlayerRef.current
    if (!p) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const seekTo = pct * ytDuration
    ytIgnoreStateRef.current = true
    p.seekTo(seekTo, true)
    setYtTime(seekTo)
    setTimeout(() => { ytIgnoreStateRef.current = false }, YT_IGNORE_STATE_DELAY)
    if (socketRef.current) socketRef.current.emit('music-sync', { type: 'yt-state', state: 'seek', time: seekTo })
  }

  function ytNextTrack() { ytPlayerRef.current?.nextVideo() }
  function ytPrevTrack() {
    const p = ytPlayerRef.current
    if (!p) return
    if (ytTime > MUSIC_RESTART_THRESHOLD) { p.seekTo(0, true); setYtTime(0) }
    else p.previousVideo()
  }

  function cycleYtSpeed() {
    const p = ytPlayerRef.current
    if (!p) return
    const next = YT_PLAYBACK_RATES[(YT_PLAYBACK_RATES.indexOf(ytPlaybackRate) + 1) % YT_PLAYBACK_RATES.length]
    p.setPlaybackRate(next)
    setYtPlaybackRate(next)
    if (socketRef.current) socketRef.current.emit('music-sync', { type: 'yt-state', state: 'rate', rate: next })
  }

  function stopYouTube() {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.stopVideo(); ytPlayerRef.current.destroy(); ytPlayerRef.current = null
    }
    stopYtTimeUpdater()
    setYtMode(false); setYtPlaying(false); setYtTime(0); setYtDuration(0)
    setYtVideoTitle(''); setYtPlaylistItems([]); setYtCurrentIndex(-1)
    setYtUrl(''); setIsYtHost(false); setYtPlaybackRate(1)
    ytTitlesFetchingRef.current.clear()
    if (socketRef.current) socketRef.current.emit('music-sync', { type: 'yt-stop' })
  }

  // Peer-side: load YouTube when host sends youtube-load
  async function handleYtLoad(msg) {
    setYtMode(true); setIsYtHost(false); setYtLoading(true); setTab('youtube')
    pauseMusic()
    try {
      await loadYouTubeAPI()
      if (ytPlayerRef.current) { ytPlayerRef.current.destroy(); ytPlayerRef.current = null }
      if (ytContainerRef.current) ytContainerRef.current.innerHTML = '<div id="yt-player-embed"></div>'
      const player = createYTPlayer('yt-player-embed', {
        videoId: msg.videoId, listId: msg.listId, visible: true,
        onReady: () => {
          setYtLoading(false)
          const pl = player.getPlaylist?.()
          if (pl && pl.length > 0) {
            setYtPlaylistItems(pl.map((vid, i) => ({ videoId: vid, title: `Track ${i + 1}` })))
            setYtCurrentIndex(player.getPlaylistIndex?.() ?? 0)
          }
          setYtDuration(player.getDuration?.() || 0)
          const data = player.getVideoData?.()
          if (data?.title) setYtVideoTitle(data.title)
        },
        onStateChange: (state) => {
          const p = ytPlayerRef.current
          if (!p) return
          if (state === YTState.PLAYING) {
            setYtPlaying(true); setYtDuration(p.getDuration?.() || 0)
            const data = p.getVideoData?.()
            if (data?.title) setYtVideoTitle(data.title)
            startYtTimeUpdater()
          } else if (state === YTState.PAUSED) { setYtPlaying(false); stopYtTimeUpdater() }
          else if (state === YTState.ENDED) { setYtPlaying(false); stopYtTimeUpdater() }
        },
        onError: (code) => { console.error('[YT peer] player error:', code); setYtLoading(false); setYtMode(false); setIsYtHost(false) },
      })
      ytPlayerRef.current = player
    } catch (err) { console.error('[YT peer] load error:', err); setYtLoading(false); setYtMode(false) }
  }

  // Handle YouTube-related sync messages from peer
  function handlePeerYtSync(msg) {
    switch (msg.type) {
      case 'youtube-load':
        handleYtLoad(msg); break
      case 'yt-state': {
        const p = ytPlayerRef.current
        if (!p) break
        ytIgnoreStateRef.current = true
        if (msg.state === 'playing') {
          p.seekTo(msg.time, true); p.playVideo()
          setYtPlaying(true); setYtDuration(msg.duration || ytDuration)
          if (msg.title) setYtVideoTitle(msg.title)
          if (msg.index >= 0) setYtCurrentIndex(msg.index)
          startYtTimeUpdater()
        } else if (msg.state === 'paused') {
          p.seekTo(msg.time, true); p.pauseVideo()
          setYtPlaying(false); setYtTime(msg.time); stopYtTimeUpdater()
        } else if (msg.state === 'seek') {
          p.seekTo(msg.time, true); setYtTime(msg.time)
        } else if (msg.state === 'rate') {
          p.setPlaybackRate(msg.rate); setYtPlaybackRate(msg.rate)
        }
        setTimeout(() => { ytIgnoreStateRef.current = false }, YT_IGNORE_STATE_DELAY)
        break
      }
      case 'yt-stop':
        if (ytPlayerRef.current) { ytPlayerRef.current.stopVideo(); ytPlayerRef.current.destroy(); ytPlayerRef.current = null }
        stopYtTimeUpdater()
        setYtMode(false); setYtPlaying(false); setYtTime(0); setYtDuration(0)
        setYtVideoTitle(''); setYtPlaylistItems([]); setYtCurrentIndex(-1)
        setIsYtHost(false); setYtPlaybackRate(1)
        break
    }
  }

  // Managed playlist CRUD
  function addYtItem(url) {
    const parsed = parseYouTubeURL(url)
    if (!parsed) return 'Invalid YouTube URL'
    setYtManagedItems(prev => [...prev, { url, title: parsed.videoId || 'YouTube Video', videoId: parsed.videoId, listId: parsed.listId }])
    setYtUrl('')
    return null
  }

  function removeYtItem(index) { setYtManagedItems(prev => prev.filter((_, i) => i !== index)) }

  function playYtItem(index) {
    const item = ytManagedItems[index]
    if (!item) return
    pauseMusic()
    ytManagedPlayingIdxRef.current = index
    setTab('youtube')
    loadYouTube(item.url)
  }

  async function handleSaveYtPlaylist() {
    if (!user || !ytPlaylistName.trim() || !ytManagedItems.length) return
    setSavingYtPlaylist(true)
    try {
      const songs = ytManagedItems.map((item, i) => ({ url: item.url, title: item.title, videoId: item.videoId, listId: item.listId, order: i }))
      await savePlaylist(user.id, ytPlaylistName.trim(), songs, 'youtube')
      setYtPlaylistName('')
      await fetchSavedYtPlaylists(user.id)
    } catch (err) { console.error('Failed to save YouTube playlist', err) }
    setSavingYtPlaylist(false)
  }

  function handleLoadYtPlaylist(pl) {
    const items = pl.songs.map(s => ({ url: s.url, title: s.title || s.videoId || 'YouTube Video', videoId: s.videoId, listId: s.listId }))
    setYtManagedItems(items)
    if (items.length > 0) { setTab('youtube'); loadYouTube(items[0].url) }
  }

  async function handleDeleteYtPlaylist(id) {
    try { await deletePlaylistApi(id); setSavedYtPlaylists(prev => prev.filter(p => p.id !== id)) }
    catch (err) { console.error('Failed to delete YouTube playlist', err) }
  }

  return {
    ytMode, ytUrl, setYtUrl, ytVideoTitle, ytPlaying, ytTime, ytDuration,
    ytPlaylistItems, ytCurrentIndex, ytLoading, isYtHost, ytPlaybackRate,
    ytManagedItems, ytManagedPlayingIdxRef, savedYtPlaylists,
    ytPlaylistName, setYtPlaylistName, savingYtPlaylist,
    ytContainerRef, ytPlayerRef,
    loadYouTube, toggleYtPlayback, ytPlayAt, seekYt, ytNextTrack, ytPrevTrack,
    cycleYtSpeed, stopYouTube,
    addYtItem, removeYtItem, playYtItem,
    handleSaveYtPlaylist, handleLoadYtPlaylist, handleDeleteYtPlaylist,
    handlePeerYtSync,
  }
}
