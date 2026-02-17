import { useState, useRef, useEffect, useCallback } from 'react'
import {
  saveAudioFile, getAudioFile,
  savePlaylist, getPlaylists, deletePlaylist as deletePlaylistApi,
} from '../../lib/playlistStorage'
import { MUSIC_RESTART_THRESHOLD } from './constants'

/**
 * Manages local music playback, playlists, and sync with peer via socket.
 */
export default function useMusicPlayer({ socketRef, pcRef, musicStreamDestRef, user, renegotiate, ytMode, stopYouTube, setActiveTab, speakerEnabled }) {
  const [playlist, setPlaylist] = useState([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicTime, setMusicTime] = useState(0)
  const [musicDuration, setMusicDuration] = useState(0)
  const [isMusicHost, setIsMusicHost] = useState(false)
  const [savedPlaylists, setSavedPlaylists] = useState([])
  const [playlistName, setPlaylistName] = useState('')
  const [savingPlaylist, setSavingPlaylist] = useState(false)

  const musicSourceRef = useRef(null)
  const audioCtxRef = useRef(null)
  const musicStartTimeRef = useRef(0)
  const musicOffsetRef = useRef(0)
  const gainNodeRef = useRef(null)
  const localGainNodeRef = useRef(null)  // controls local speaker output only (not WebRTC stream)
  const animFrameRef = useRef(null)
  const addMoreInputRef = useRef(null)

  // Keep refs in sync
  const playlistRef = useRef([])
  const currentTrackIndexRef = useRef(-1)
  const musicPlayingRef = useRef(false)

  useEffect(() => { playlistRef.current = playlist }, [playlist])
  useEffect(() => { currentTrackIndexRef.current = currentTrackIndex }, [currentTrackIndex])
  useEffect(() => { musicPlayingRef.current = musicPlaying }, [musicPlaying])

  const currentTrack = playlist[currentTrackIndex] || null
  const musicName = currentTrack?.name || ''

  // Fetch saved playlists
  useEffect(() => {
    if (user) fetchSavedPlaylists(user.id)
    else setSavedPlaylists([])
  }, [user])

  async function fetchSavedPlaylists(userId) {
    try {
      const data = await getPlaylists(userId, 'local')
      setSavedPlaylists(data)
    } catch (err) {
      console.error('Failed to fetch saved playlists:', err)
    }
  }

  // Music time updater
  useEffect(() => {
    if (musicPlaying && isMusicHost) {
      const update = () => {
        if (audioCtxRef.current && musicPlayingRef.current) {
          const elapsed = audioCtxRef.current.currentTime - musicStartTimeRef.current + musicOffsetRef.current
          setMusicTime(Math.min(elapsed, musicDuration))
        }
        animFrameRef.current = requestAnimationFrame(update)
      }
      animFrameRef.current = requestAnimationFrame(update)
      return () => cancelAnimationFrame(animFrameRef.current)
    }
  }, [musicPlaying, isMusicHost, musicDuration])

  // Mute/unmute local music when speaker toggle changes (does not affect WebRTC stream)
  useEffect(() => {
    if (localGainNodeRef.current) {
      localGainNodeRef.current.gain.value = speakerEnabled === false ? 0 : 1
    }
  }, [speakerEnabled])

  // Resume AudioContext when output device changes (e.g. Bluetooth headset disconnected)
  useEffect(() => {
    function handleDeviceChange() {
      const ctx = audioCtxRef.current
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {})
      }
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      stopCurrentSource()
      if (audioCtxRef.current) { audioCtxRef.current.close() }
    }
  }, [])

  function stopCurrentSource() {
    if (musicSourceRef.current) {
      musicSourceRef.current.onended = null
      try { musicSourceRef.current.stop() } catch (e) { console.debug('Music source already stopped:', e.message) }
      musicSourceRef.current = null
    }
  }

  function ensureAudioContext() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const dest = ctx.createMediaStreamDestination()
      musicStreamDestRef.current = dest
      const gain = ctx.createGain()
      // localGain controls only the local speaker output; muting it does not affect the WebRTC stream
      const localGain = ctx.createGain()
      gain.connect(dest)          // WebRTC stream (always active)
      gain.connect(localGain)     // local speakers path
      localGain.connect(ctx.destination)
      gainNodeRef.current = gain
      localGainNodeRef.current = localGain
      // Apply current speaker state immediately
      localGain.gain.value = speakerEnabled === false ? 0 : 1
    }
    return audioCtxRef.current
  }

  function playTrackAtIndex(index, pl) {
    const tracks = pl || playlistRef.current
    if (index < 0 || index >= tracks.length) return
    const track = tracks[index]
    const ctx = ensureAudioContext()
    stopCurrentSource()

    const source = ctx.createBufferSource()
    source.buffer = track.buffer
    source.connect(gainNodeRef.current)
    source.start(0)
    musicSourceRef.current = source
    musicStartTimeRef.current = ctx.currentTime
    musicOffsetRef.current = 0
    setCurrentTrackIndex(index)
    setMusicDuration(track.duration)
    setMusicTime(0)
    setMusicPlaying(true)

    source.onended = () => { if (musicPlayingRef.current) onTrackEnded() }

    if (socketRef.current) {
      socketRef.current.emit('music-sync', { type: 'track-change', index, name: track.name, duration: track.duration })
    }
  }

  function onTrackEnded() {
    const nextIdx = currentTrackIndexRef.current + 1
    if (nextIdx < playlistRef.current.length) {
      playTrackAtIndex(nextIdx)
    } else {
      setMusicPlaying(false)
      musicOffsetRef.current = 0
      setMusicTime(0)
      if (socketRef.current) socketRef.current.emit('music-sync', { type: 'stop' })
    }
  }

  function nextTrack() {
    const nextIdx = currentTrackIndexRef.current + 1
    if (nextIdx < playlist.length) playTrackAtIndex(nextIdx)
  }

  function prevTrack() {
    if (musicTime > MUSIC_RESTART_THRESHOLD && currentTrackIndex >= 0) playTrackAtIndex(currentTrackIndex)
    else if (currentTrackIndex > 0) playTrackAtIndex(currentTrackIndex - 1)
  }

  function toggleMusic() {
    if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) return
    const ctx = audioCtxRef.current
    if (!ctx) return

    if (musicPlaying) {
      stopCurrentSource()
      const elapsed = ctx.currentTime - musicStartTimeRef.current + musicOffsetRef.current
      musicOffsetRef.current = elapsed
      setMusicPlaying(false)
      if (socketRef.current) socketRef.current.emit('music-sync', { type: 'pause', time: elapsed })
    } else {
      const track = playlist[currentTrackIndex]
      const source = ctx.createBufferSource()
      source.buffer = track.buffer
      source.connect(gainNodeRef.current)
      source.start(0, musicOffsetRef.current)
      musicSourceRef.current = source
      musicStartTimeRef.current = ctx.currentTime
      setMusicPlaying(true)
      source.onended = () => { if (musicPlayingRef.current) onTrackEnded() }
      if (socketRef.current) socketRef.current.emit('music-sync', { type: 'play', time: musicOffsetRef.current })
    }
  }

  function seekMusic(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const seekTo = pct * musicDuration

    if (musicPlaying && musicSourceRef.current) {
      stopCurrentSource()
      const ctx = audioCtxRef.current
      const track = playlist[currentTrackIndex]
      const source = ctx.createBufferSource()
      source.buffer = track.buffer
      source.connect(gainNodeRef.current)
      source.start(0, seekTo)
      musicSourceRef.current = source
      musicStartTimeRef.current = ctx.currentTime
      musicOffsetRef.current = seekTo
      source.onended = () => { if (musicPlayingRef.current) onTrackEnded() }
    } else {
      musicOffsetRef.current = seekTo
      setMusicTime(seekTo)
    }
    if (socketRef.current) socketRef.current.emit('music-sync', { type: 'seek', time: seekTo, playing: musicPlaying })
  }

  function removeTrack(index) {
    const updated = playlist.filter((_, i) => i !== index)
    setPlaylist(updated)
    if (index === currentTrackIndex) {
      stopCurrentSource()
      if (updated.length === 0) { setCurrentTrackIndex(-1); setMusicPlaying(false); setMusicTime(0); setMusicDuration(0) }
      else { const newIdx = Math.min(index, updated.length - 1); playTrackAtIndex(newIdx, updated) }
    } else if (index < currentTrackIndex) { setCurrentTrackIndex(prev => prev - 1) }
    if (socketRef.current) {
      socketRef.current.emit('music-sync', {
        type: 'load-playlist',
        tracks: updated.map(t => ({ name: t.name, duration: t.duration })),
        index: currentTrackIndex > index ? currentTrackIndex - 1 : currentTrackIndex,
      })
    }
  }

  async function handleMusicFiles(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setIsMusicHost(true)
    setActiveTab('local')
    if (ytMode) stopYouTube()
    const ctx = ensureAudioContext()

    const newTracks = []
    for (const file of files) {
      const arrayBuf = await file.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0))
      newTracks.push({ name: file.name, duration: audioBuffer.duration, buffer: audioBuffer })
      await saveAudioFile(file.name, file, audioBuffer.duration)
    }

    const updated = [...playlistRef.current, ...newTracks]
    setPlaylist(updated)
    if (currentTrackIndexRef.current === -1) {
      const startIdx = playlistRef.current.length
      playTrackAtIndex(startIdx, updated)
    }

    if (pcRef.current && musicStreamDestRef.current) {
      const existingSenders = pcRef.current.getSenders()
      const musicTracks = musicStreamDestRef.current.stream.getTracks()
      const alreadyAdded = musicTracks.every(t => existingSenders.some(s => s.track === t))
      if (!alreadyAdded) {
        musicTracks.forEach(track => pcRef.current.addTrack(track, musicStreamDestRef.current.stream))
        renegotiate()
      }
    }

    if (socketRef.current) {
      socketRef.current.emit('music-sync', {
        type: 'load-playlist',
        tracks: updated.map(t => ({ name: t.name, duration: t.duration })),
        index: currentTrackIndexRef.current === -1 ? playlistRef.current.length : currentTrackIndexRef.current,
      })
    }
    e.target.value = ''
  }

  async function handleLoadPlaylist(pl) {
    setIsMusicHost(true)
    setActiveTab('local')
    if (ytMode) stopYouTube()
    const ctx = ensureAudioContext()

    const tracks = []
    const missing = []
    for (const song of pl.songs) {
      const stored = await getAudioFile(song.name)
      if (stored && stored.blob) {
        const arrayBuf = await stored.blob.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuf)
        tracks.push({ name: song.name, duration: audioBuffer.duration, buffer: audioBuffer })
      } else {
        missing.push(song.name)
        tracks.push({ name: song.name, duration: song.duration, buffer: null })
      }
    }
    setPlaylist(tracks)

    if (missing.length > 0) {
      // Use setError from connection hook if available — here we just log
      console.warn(`Missing local files: ${missing.join(', ')}. Re-add them via + Add more songs.`)
    }

    const firstPlayable = tracks.findIndex(t => t.buffer)
    if (firstPlayable >= 0) playTrackAtIndex(firstPlayable, tracks)
    else { setCurrentTrackIndex(0); setMusicDuration(tracks[0]?.duration || 0) }

    if (socketRef.current) {
      socketRef.current.emit('music-sync', {
        type: 'load-playlist', tracks: tracks.map(t => ({ name: t.name, duration: t.duration })), index: firstPlayable >= 0 ? firstPlayable : 0,
      })
    }

    if (pcRef.current && musicStreamDestRef.current) {
      const existingSenders = pcRef.current.getSenders()
      const musicTracks = musicStreamDestRef.current.stream.getTracks()
      const alreadyAdded = musicTracks.every(t => existingSenders.some(s => s.track === t))
      if (!alreadyAdded) {
        musicTracks.forEach(track => pcRef.current.addTrack(track, musicStreamDestRef.current.stream))
        renegotiate()
      }
    }
  }

  async function handleSavePlaylist() {
    if (!user || !playlistName.trim() || !playlist.length) return
    setSavingPlaylist(true)
    try {
      const songs = playlist.map((t, i) => ({ name: t.name, duration: t.duration, order: i }))
      await savePlaylist(user.id, playlistName.trim(), songs, 'local')
      setPlaylistName('')
      await fetchSavedPlaylists(user.id)
    } catch (err) {
      console.error('Failed to save playlist', err)
    }
    setSavingPlaylist(false)
  }

  async function handleDeletePlaylist(id) {
    try {
      await deletePlaylistApi(id)
      setSavedPlaylists(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete playlist', err)
    }
  }

  // Handle music-sync messages from peer
  function handlePeerMusicSync(msg) {
    switch (msg.type) {
      case 'load-playlist':
        setPlaylist(msg.tracks.map(t => ({ name: t.name, duration: t.duration, buffer: null })))
        setCurrentTrackIndex(msg.index)
        setMusicDuration(msg.tracks[msg.index]?.duration || 0)
        setIsMusicHost(false)
        setActiveTab('local')
        break
      case 'track-change':
        setCurrentTrackIndex(msg.index); setMusicDuration(msg.duration); setMusicTime(0); setMusicPlaying(true); setIsMusicHost(false)
        break
      case 'play':
        setMusicPlaying(true); setMusicTime(msg.time)
        break
      case 'pause':
        setMusicPlaying(false); setMusicTime(msg.time)
        break
      case 'seek':
        setMusicTime(msg.time); setMusicPlaying(msg.playing)
        break
      case 'stop':
        setMusicPlaying(false); setMusicTime(0)
        break
      case 'load':
        setPlaylist([{ name: msg.name, duration: msg.duration, buffer: null }])
        setCurrentTrackIndex(0); setMusicDuration(msg.duration); setIsMusicHost(false)
        break
    }
  }

  // Stop music playback (used when switching to YouTube)
  function pauseMusic() {
    if (musicPlaying) {
      stopCurrentSource()
      const ctx = audioCtxRef.current
      if (ctx) {
        const elapsed = ctx.currentTime - musicStartTimeRef.current + musicOffsetRef.current
        musicOffsetRef.current = elapsed
      }
      setMusicPlaying(false)
    }
  }

  return {
    playlist, currentTrackIndex, musicPlaying, musicTime, musicDuration,
    isMusicHost, musicName, savedPlaylists, playlistName, setPlaylistName,
    savingPlaylist, addMoreInputRef,
    playTrackAtIndex, nextTrack, prevTrack, toggleMusic, seekMusic, removeTrack,
    handleMusicFiles, handleLoadPlaylist, handleSavePlaylist, handleDeletePlaylist,
    handlePeerMusicSync, pauseMusic, ensureAudioContext,
    audioCtxRef, stopCurrentSource,
  }
}
