import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaMusic, FaPlay, FaPause, FaPhone, FaCopy, FaCheck, FaSignInAlt,
  FaStepBackward, FaStepForward, FaListUl, FaSave, FaTrash,
  FaPlus, FaTimes, FaCircle, FaStop,
} from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import {
  saveAudioFile, getAudioFile,
  savePlaylist, getPlaylists, deletePlaylist as deletePlaylistApi,
} from '../lib/playlistStorage'
import {
  createRecordingMixer, createMeetRecorder,
  transcribeAudio, summarizeMeeting, saveRecording,
} from '../lib/meetRecording'

const SIGNAL_URL = window.location.origin
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:50.92.228.38:3478',
    username: 'meet',
    credential: 'meetpass123',
  },
]

// Dynamically load socket.io client
function loadSocketIO() {
  return new Promise((resolve, reject) => {
    if (window.io) { resolve(window.io); return }
    const s = document.createElement('script')
    s.src = '/socket.io/socket.io.js'
    s.onload = () => resolve(window.io)
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export default function MeetPage() {
  const { id: urlRoomId } = useParams()
  // Connection state
  const [phase, setPhase] = useState(urlRoomId ? 'joining' : 'lobby') // lobby | joining | connected
  const [roomId, setRoomId] = useState(urlRoomId || '')
  const [joinInput, setJoinInput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [peerConnected, setPeerConnected] = useState(false)

  // Media state
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [audioBlocked, setAudioBlocked] = useState(false)

  // Playlist state
  const [playlist, setPlaylist] = useState([]) // [{ name, duration, buffer }]
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicTime, setMusicTime] = useState(0)
  const [musicDuration, setMusicDuration] = useState(0)
  const [isMusicHost, setIsMusicHost] = useState(false)
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false)

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showTopicInput, setShowTopicInput] = useState(false)
  const [meetingTopic, setMeetingTopic] = useState('')
  const [processingState, setProcessingState] = useState('') // '' | 'transcribing' | 'summarizing' | 'saving' | 'done' | 'error'
  const [meetingSummary, setMeetingSummary] = useState(null)
  const [summaryError, setSummaryError] = useState('')
  const [summaryCopied, setSummaryCopied] = useState(false)

  // Supabase auth + saved playlists
  const [user, setUser] = useState(null)
  const [savedPlaylists, setSavedPlaylists] = useState([])
  const [playlistName, setPlaylistName] = useState('')
  const [savingPlaylist, setSavingPlaylist] = useState(false)

  // Refs
  const socketRef = useRef(null)
  const pcRef = useRef(null)
  const peerIdRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const remoteAudioStreamRef = useRef(new MediaStream())
  const localStreamRef = useRef(null)
  const localStreamIdRef = useRef(null)
  const musicSourceRef = useRef(null)
  const audioCtxRef = useRef(null)
  const musicStartTimeRef = useRef(0)
  const musicOffsetRef = useRef(0)
  const gainNodeRef = useRef(null)
  const musicStreamDestRef = useRef(null)
  const animFrameRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const remoteDescSetRef = useRef(false)
  const recorderRef = useRef(null)
  const recordingMixerCtxRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const recordingStartRef = useRef(0)
  const recordingPausedTimeRef = useRef(0)
  // Keep refs in sync with state for use inside callbacks
  const playlistRef = useRef([])
  const currentTrackIndexRef = useRef(-1)
  const musicPlayingRef = useRef(false)
  const addMoreInputRef = useRef(null)

  // Sync refs with state
  useEffect(() => { playlistRef.current = playlist }, [playlist])
  useEffect(() => { currentTrackIndexRef.current = currentTrackIndex }, [currentTrackIndex])
  useEffect(() => { musicPlayingRef.current = musicPlaying }, [musicPlaying])

  // Derived values
  const currentTrack = playlist[currentTrackIndex] || null
  const musicName = currentTrack?.name || ''

  // ─── Auth check ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        fetchSavedPlaylists(data.user.id)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null
      setUser(u)
      if (u) fetchSavedPlaylists(u.id)
      else setSavedPlaylists([])
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchSavedPlaylists(userId) {
    try {
      const data = await getPlaylists(userId)
      setSavedPlaylists(data)
    } catch { /* ignore */ }
  }

  // Attach local stream to video element once meeting view renders
  useEffect(() => {
    if (phase === 'connected' && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
    // Bind any remote audio tracks that arrived before <audio> mounted
    if (phase === 'connected' && remoteAudioRef.current && remoteAudioStreamRef.current.getTracks().length > 0) {
      remoteAudioRef.current.srcObject = remoteAudioStreamRef.current
      remoteAudioRef.current.play().then(() => {
        setAudioBlocked(false)
      }).catch(() => {
        setAudioBlocked(true)
      })
    }
  }, [phase])

  // Create persistent <audio> element on mount (always available regardless of phase)
  useEffect(() => {
    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.playsInline = true
    document.body.appendChild(audio)
    remoteAudioRef.current = audio
    return () => { audio.remove() }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup() }
  }, [])

  // Auto-join if URL has room id
  useEffect(() => {
    if (urlRoomId && phase === 'joining') {
      initConnection('join', urlRoomId)
    }
  }, [urlRoomId])

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

  function stopCurrentSource() {
    if (musicSourceRef.current) {
      musicSourceRef.current.onended = null
      try { musicSourceRef.current.stop() } catch {}
      musicSourceRef.current = null
    }
  }

  function cleanup() {
    cancelAnimationFrame(animFrameRef.current)
    stopCurrentSource()
    if (audioCtxRef.current) { audioCtxRef.current.close() }
    if (pcRef.current) { pcRef.current.close() }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()) }
    if (socketRef.current) { socketRef.current.disconnect() }
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  async function initConnection(mode, targetRoomId) {
    setError('')
    setAudioBlocked(false)
    try {
      const io = await loadSocketIO()
      const socket = io(SIGNAL_URL, { path: '/socket.io/', transports: ['websocket', 'polling'] })
      socketRef.current = socket

      socket.on('peer-joined', (peerId) => {
        setPeerConnected(true)
        createPeerConnection(socket, peerId, true)
      })

      socket.on('signal', async ({ from, data }) => {
        if (!pcRef.current) {
          createPeerConnection(socket, from, false)
        }
        const pc = pcRef.current
        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          remoteDescSetRef.current = true
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c))
          }
          pendingCandidatesRef.current = []
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('signal', { to: from, data: answer })
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          remoteDescSetRef.current = true
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c))
          }
          pendingCandidatesRef.current = []
        } else if (data.candidate) {
          if (remoteDescSetRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(data))
          } else {
            pendingCandidatesRef.current.push(data)
          }
        }
      })

      socket.on('peer-left', () => {
        setPeerConnected(false)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
        remoteAudioStreamRef.current = new MediaStream()
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
        remoteDescSetRef.current = false
        pendingCandidatesRef.current = []
      })

      socket.on('music-sync', (msg) => { handleMusicSync(msg) })

      socket.on('connect_error', () => {
        setError('Cannot connect to signal server')
        setPhase('lobby')
      })

      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
        new Promise((resolve) => {
          if (socket.connected) resolve()
          else socket.on('connect', () => resolve())
        }),
      ])

      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      if (mode === 'create') {
        socket.emit('create-room', (res) => {
          if (res.roomId) {
            setRoomId(res.roomId)
            setPhase('connected')
            window.history.replaceState(null, '', `/meet/${res.roomId}`)
          }
        })
      } else {
        socket.emit('join-room', targetRoomId, (res) => {
          if (res.error) {
            setError(res.error === 'Room not found' ? 'Meeting ID not found' : res.error)
            setPhase('lobby')
            return
          }
          setRoomId(targetRoomId)
          setPhase('connected')
          window.history.replaceState(null, '', `/meet/${targetRoomId}`)
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to get camera/mic access')
      setPhase('lobby')
    }
  }

  function createPeerConnection(socket, peerId, isInitiator) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pcRef.current = pc
    peerIdRef.current = peerId
    remoteDescSetRef.current = false
    pendingCandidatesRef.current = []

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    if (musicStreamDestRef.current) {
      musicStreamDestRef.current.stream.getTracks().forEach(track => {
        pc.addTrack(track, musicStreamDestRef.current.stream)
      })
    }

    remoteAudioStreamRef.current = new MediaStream()

    pc.ontrack = (e) => {
      if (e.track.kind === 'video') {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0]
        }
      } else if (e.track.kind === 'audio') {
        // Collect ALL remote audio tracks (mic + music) into one stream
        remoteAudioStreamRef.current.addTrack(e.track)
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteAudioStreamRef.current
          remoteAudioRef.current.play().then(() => {
            setAudioBlocked(false)
          }).catch(() => {
            setAudioBlocked(true)
          })
        }
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('signal', { to: peerId, data: e.candidate.toJSON() })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setPeerConnected(true)
      } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setPeerConnected(false)
      }
    }

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer)
        socket.emit('signal', { to: peerId, data: offer })
      })
    }
  }

  async function renegotiate() {
    const pc = pcRef.current
    const socket = socketRef.current
    const peerId = peerIdRef.current
    if (!pc || !socket || !peerId) return
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('signal', { to: peerId, data: offer })
  }

  // ─── Playlist / Music handling ────────────────────────────────────────────

  function ensureAudioContext() {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const dest = ctx.createMediaStreamDestination()
      musicStreamDestRef.current = dest
      const gain = ctx.createGain()
      gain.connect(dest)
      gain.connect(ctx.destination)
      gainNodeRef.current = gain
    }
    return audioCtxRef.current
  }

  async function handleMusicFiles(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    setIsMusicHost(true)
    const ctx = ensureAudioContext()

    const newTracks = []
    for (const file of files) {
      const arrayBuf = await file.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0)) // slice to avoid detached buffer
      newTracks.push({ name: file.name, duration: audioBuffer.duration, buffer: audioBuffer })
      // Save blob to IndexedDB for later playlist restore
      await saveAudioFile(file.name, file, audioBuffer.duration)
    }

    const updated = [...playlistRef.current, ...newTracks]
    setPlaylist(updated)

    // If nothing was playing, start the first new track
    if (currentTrackIndexRef.current === -1) {
      const startIdx = playlistRef.current.length // first new track index
      playTrackAtIndex(startIdx, updated)
    }

    // Add music stream to peer connection if not yet added
    if (pcRef.current && musicStreamDestRef.current) {
      const existingSenders = pcRef.current.getSenders()
      const musicTracks = musicStreamDestRef.current.stream.getTracks()
      const alreadyAdded = musicTracks.every(t =>
        existingSenders.some(s => s.track === t)
      )
      if (!alreadyAdded) {
        musicTracks.forEach(track => {
          pcRef.current.addTrack(track, musicStreamDestRef.current.stream)
        })
        renegotiate()
      }
    }

    // Sync full track list to peer
    if (socketRef.current) {
      socketRef.current.emit('music-sync', {
        type: 'load-playlist',
        tracks: updated.map(t => ({ name: t.name, duration: t.duration })),
        index: currentTrackIndexRef.current === -1 ? playlistRef.current.length : currentTrackIndexRef.current,
      })
    }

    // Reset input so re-selecting same files works
    e.target.value = ''
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

    source.onended = () => {
      if (musicPlayingRef.current) {
        onTrackEnded()
      }
    }

    if (socketRef.current) {
      socketRef.current.emit('music-sync', {
        type: 'track-change',
        index,
        name: track.name,
        duration: track.duration,
      })
    }
  }

  function onTrackEnded() {
    const nextIdx = currentTrackIndexRef.current + 1
    if (nextIdx < playlistRef.current.length) {
      playTrackAtIndex(nextIdx)
    } else {
      // Playlist finished
      setMusicPlaying(false)
      musicOffsetRef.current = 0
      setMusicTime(0)
      if (socketRef.current) {
        socketRef.current.emit('music-sync', { type: 'stop' })
      }
    }
  }

  function nextTrack() {
    const nextIdx = currentTrackIndexRef.current + 1
    if (nextIdx < playlist.length) {
      playTrackAtIndex(nextIdx)
    }
  }

  function prevTrack() {
    // If more than 3 seconds in, restart current track; otherwise go to previous
    if (musicTime > 3 && currentTrackIndex >= 0) {
      playTrackAtIndex(currentTrackIndex)
    } else if (currentTrackIndex > 0) {
      playTrackAtIndex(currentTrackIndex - 1)
    }
  }

  function toggleMusic() {
    if (currentTrackIndex === -1 || !playlist[currentTrackIndex]) return
    const ctx = audioCtxRef.current
    if (!ctx) return

    if (musicPlaying) {
      // Pause
      stopCurrentSource()
      const elapsed = ctx.currentTime - musicStartTimeRef.current + musicOffsetRef.current
      musicOffsetRef.current = elapsed
      setMusicPlaying(false)

      if (socketRef.current) {
        socketRef.current.emit('music-sync', { type: 'pause', time: elapsed })
      }
    } else {
      // Resume
      const track = playlist[currentTrackIndex]
      const source = ctx.createBufferSource()
      source.buffer = track.buffer
      source.connect(gainNodeRef.current)
      source.start(0, musicOffsetRef.current)
      musicSourceRef.current = source
      musicStartTimeRef.current = ctx.currentTime
      setMusicPlaying(true)

      source.onended = () => {
        if (musicPlayingRef.current) {
          onTrackEnded()
        }
      }

      if (socketRef.current) {
        socketRef.current.emit('music-sync', { type: 'play', time: musicOffsetRef.current })
      }
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
      source.onended = () => {
        if (musicPlayingRef.current) onTrackEnded()
      }
    } else {
      musicOffsetRef.current = seekTo
      setMusicTime(seekTo)
    }

    if (socketRef.current) {
      socketRef.current.emit('music-sync', { type: 'seek', time: seekTo, playing: musicPlaying })
    }
  }

  function removeTrack(index) {
    const updated = playlist.filter((_, i) => i !== index)
    setPlaylist(updated)

    if (index === currentTrackIndex) {
      // Stop current and play next (or prev, or stop)
      stopCurrentSource()
      if (updated.length === 0) {
        setCurrentTrackIndex(-1)
        setMusicPlaying(false)
        setMusicTime(0)
        setMusicDuration(0)
      } else {
        const newIdx = Math.min(index, updated.length - 1)
        playTrackAtIndex(newIdx, updated)
      }
    } else if (index < currentTrackIndex) {
      setCurrentTrackIndex(prev => prev - 1)
    }

    if (socketRef.current) {
      socketRef.current.emit('music-sync', {
        type: 'load-playlist',
        tracks: updated.map(t => ({ name: t.name, duration: t.duration })),
        index: currentTrackIndex > index ? currentTrackIndex - 1 : currentTrackIndex,
      })
    }
  }

  // ─── Music sync (peer side) ───────────────────────────────────────────────

  function handleMusicSync(msg) {
    switch (msg.type) {
      case 'load-playlist':
        // Peer loaded a playlist — we don't have audio buffers, just metadata
        setPlaylist(msg.tracks.map(t => ({ name: t.name, duration: t.duration, buffer: null })))
        setCurrentTrackIndex(msg.index)
        setMusicDuration(msg.tracks[msg.index]?.duration || 0)
        setIsMusicHost(false)
        break
      case 'track-change':
        setCurrentTrackIndex(msg.index)
        setMusicDuration(msg.duration)
        setMusicTime(0)
        setMusicPlaying(true)
        setIsMusicHost(false)
        break
      case 'play':
        setMusicPlaying(true)
        setMusicTime(msg.time)
        break
      case 'pause':
        setMusicPlaying(false)
        setMusicTime(msg.time)
        break
      case 'seek':
        setMusicTime(msg.time)
        setMusicPlaying(msg.playing)
        break
      case 'stop':
        setMusicPlaying(false)
        setMusicTime(0)
        break
      // Legacy single-file load
      case 'load':
        setPlaylist([{ name: msg.name, duration: msg.duration, buffer: null }])
        setCurrentTrackIndex(0)
        setMusicDuration(msg.duration)
        setIsMusicHost(false)
        break
    }
  }

  // ─── Save / Load playlists (Supabase + IndexedDB) ────────────────────────

  async function handleSavePlaylist() {
    if (!user || !playlistName.trim() || !playlist.length) return
    setSavingPlaylist(true)
    try {
      const songs = playlist.map((t, i) => ({
        name: t.name,
        duration: t.duration,
        order: i,
      }))
      await savePlaylist(user.id, playlistName.trim(), songs)
      setPlaylistName('')
      await fetchSavedPlaylists(user.id)
    } catch (err) {
      console.error('Failed to save playlist', err)
    }
    setSavingPlaylist(false)
  }

  async function handleLoadPlaylist(pl) {
    setIsMusicHost(true)
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
      setError(`Missing local files: ${missing.join(', ')}. Re-add them via + Add more songs.`)
    }

    // Start first playable track
    const firstPlayable = tracks.findIndex(t => t.buffer)
    if (firstPlayable >= 0) {
      playTrackAtIndex(firstPlayable, tracks)
    } else {
      setCurrentTrackIndex(0)
      setMusicDuration(tracks[0]?.duration || 0)
    }

    // Sync to peer
    if (socketRef.current) {
      socketRef.current.emit('music-sync', {
        type: 'load-playlist',
        tracks: tracks.map(t => ({ name: t.name, duration: t.duration })),
        index: firstPlayable >= 0 ? firstPlayable : 0,
      })
    }

    // Add music stream to peer connection
    if (pcRef.current && musicStreamDestRef.current) {
      const existingSenders = pcRef.current.getSenders()
      const musicTracks = musicStreamDestRef.current.stream.getTracks()
      const alreadyAdded = musicTracks.every(t =>
        existingSenders.some(s => s.track === t)
      )
      if (!alreadyAdded) {
        musicTracks.forEach(track => {
          pcRef.current.addTrack(track, musicStreamDestRef.current.stream)
        })
        renegotiate()
      }
    }
  }

  async function handleDeletePlaylist(id) {
    try {
      await deletePlaylistApi(id)
      setSavedPlaylists(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete playlist', err)
    }
  }

  // ─── Recording ──────────────────────────────────────────────────────────

  function startRecording() {
    setShowTopicInput(true)
  }

  function confirmStartRecording() {
    setShowTopicInput(false)
    setSummaryError('')
    setMeetingSummary(null)
    setProcessingState('')

    const { ctx, stream } = createRecordingMixer(
      localStreamRef.current,
      remoteAudioStreamRef.current,
    )
    recordingMixerCtxRef.current = ctx

    const recorder = createMeetRecorder(stream)
    recorderRef.current = recorder
    recorder.start()

    recordingStartRef.current = Date.now()
    recordingPausedTimeRef.current = 0
    setRecordingTime(0)
    setIsRecording(true)
    setIsPaused(false)

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(Math.floor((Date.now() - recordingStartRef.current - recordingPausedTimeRef.current) / 1000))
    }, 500)
  }

  function toggleRecordingPause() {
    if (!recorderRef.current) return
    if (isPaused) {
      recorderRef.current.resume()
      recordingStartRef.current = Date.now() - (recordingTime * 1000)
      recordingPausedTimeRef.current = 0
      setIsPaused(false)
    } else {
      recorderRef.current.pause()
      recordingPausedTimeRef.current += Date.now() - recordingStartRef.current - (recordingTime * 1000)
      setIsPaused(true)
    }
  }

  async function stopRecording() {
    if (!recorderRef.current) return

    clearInterval(recordingTimerRef.current)
    const durationSeconds = recordingTime

    const blob = await recorderRef.current.stop()
    setIsRecording(false)
    setIsPaused(false)

    if (recordingMixerCtxRef.current) {
      recordingMixerCtxRef.current.close()
      recordingMixerCtxRef.current = null
    }
    recorderRef.current = null

    // Process: transcribe → summarize → save
    try {
      setProcessingState('transcribing')
      const transcript = await transcribeAudio(blob)

      if (transcript === '[No speech detected]') {
        setProcessingState('error')
        setSummaryError('No speech detected in the recording.')
        return
      }

      setProcessingState('summarizing')
      const summary = await summarizeMeeting(transcript, meetingTopic)

      // Save to Supabase if logged in
      if (user) {
        setProcessingState('saving')
        await saveRecording({
          userId: user.id,
          roomId,
          topic: meetingTopic || null,
          durationSeconds,
          transcript,
          summary,
        })
      }

      setProcessingState('done')
      setMeetingSummary({ ...summary, transcript })
    } catch (err) {
      console.error('Recording processing error:', err)
      setProcessingState('error')
      setSummaryError(err.message || 'Processing failed')
    }
  }

  function copySummaryText() {
    if (!meetingSummary) return
    const lines = [
      `# ${meetingSummary.title}`,
      '',
      meetingSummary.summary,
      '',
      '## Key Points',
      ...meetingSummary.keyPoints.map(p => `- ${p}`),
    ]
    if (meetingSummary.actionItems?.length) {
      lines.push('', '## Action Items', ...meetingSummary.actionItems.map(a => `- [ ] ${a}`))
    }
    if (meetingSummary.decisions?.length) {
      lines.push('', '## Decisions', ...meetingSummary.decisions.map(d => `- ${d}`))
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setSummaryCopied(true)
    setTimeout(() => setSummaryCopied(false), 2000)
  }

  function dismissSummary() {
    setMeetingSummary(null)
    setProcessingState('')
    setSummaryError('')
  }

  // ─── Media toggles ───────────────────────────────────────────────────────

  function toggleVideo() {
    if (localStreamRef.current) {
      const vTrack = localStreamRef.current.getVideoTracks()[0]
      if (vTrack) { vTrack.enabled = !vTrack.enabled; setVideoEnabled(vTrack.enabled) }
    }
  }

  function toggleAudio() {
    if (localStreamRef.current) {
      const aTrack = localStreamRef.current.getAudioTracks()[0]
      if (aTrack) { aTrack.enabled = !aTrack.enabled; setAudioEnabled(aTrack.enabled) }
    }
  }

  function hangUp() {
    cleanup()
    window.location.href = '/meet'
  }

  function unlockAudio() {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().then(() => {
        setAudioBlocked(false)
      }).catch(() => {})
    }
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatTime(sec) {
    if (!sec || sec < 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ==================== RENDER ====================

  // Lobby view
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 mb-4">
              <FaVideo className="text-2xl text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-primary-950 mb-2">Quick Meet</h1>
            <p className="text-gray-500">No sign-up needed. Share the Meeting ID to connect.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => { setPhase('joining'); initConnection('create') }}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-lg transition-colors shadow-lg shadow-primary-600/20"
            >
              <FaVideo />
              Create a Meeting
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-50 text-gray-400">or join with ID</span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinInput.trim()) {
                    setPhase('joining')
                    initConnection('join', joinInput.trim())
                  }
                }}
                placeholder="Enter Meeting ID"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none text-lg tracking-widest font-mono text-center uppercase"
                maxLength={8}
              />
              <button
                onClick={() => {
                  if (joinInput.trim()) {
                    setPhase('joining')
                    initConnection('join', joinInput.trim())
                  }
                }}
                disabled={!joinInput.trim()}
                className="px-5 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium transition-colors"
              >
                <FaSignInAlt />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Connecting view
  if (phase === 'joining') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Connecting...</p>
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm max-w-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Meeting view ─────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/80 backdrop-blur text-white">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-300">Meeting ID:</span>
          <code className="px-3 py-1 rounded-lg bg-gray-700 text-sm font-mono tracking-widest">{roomId}</code>
          <button onClick={copyRoomId} className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white">
            {copied ? <FaCheck className="text-green-400" /> : <FaCopy />}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${peerConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-sm text-gray-300">{peerConnected ? 'Peer connected' : 'Waiting for peer...'}</span>
        </div>
      </div>

      {/* Audio blocked banner */}
      {audioBlocked && peerConnected && (
        <button
          onClick={unlockAudio}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors"
        >
          <FaMicrophone size={14} />
          Click here to enable audio
        </button>
      )}

      {/* Video area + Playlist panel */}
      <div className="flex-1 flex min-h-0">
        {/* Video */}
        <div className="flex-1 flex items-center justify-center gap-4 p-4 relative">
          <div className="flex-1 h-full relative rounded-2xl overflow-hidden bg-gray-800 flex items-center justify-center">
            <video ref={remoteVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!peerConnected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-500 text-lg">Waiting for peer to join...</p>
              </div>
            )}
          </div>
          <div className="absolute bottom-4 right-6 w-48 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 z-10">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
          </div>
        </div>

        {/* Playlist side panel */}
        {showPlaylistPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Playlist</h3>
              <button onClick={() => setShowPlaylistPanel(false)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
                <FaTimes size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Now Playing */}
              <div className="p-3">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Now Playing</p>
                {playlist.length === 0 ? (
                  <p className="text-xs text-gray-500">No tracks loaded</p>
                ) : (
                  <div className="space-y-1">
                    {playlist.map((track, i) => (
                      <div
                        key={`${track.name}-${i}`}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${
                          i === currentTrackIndex
                            ? 'bg-primary-600/20 text-primary-300'
                            : 'text-gray-300 hover:bg-gray-700/50'
                        }`}
                        onClick={() => isMusicHost && track.buffer && playTrackAtIndex(i)}
                      >
                        <span className="text-xs w-5 text-right flex-shrink-0">
                          {i === currentTrackIndex && musicPlaying ? (
                            <span className="text-primary-400">&#9654;</span>
                          ) : (
                            <span className="text-gray-500">{i + 1}.</span>
                          )}
                        </span>
                        <span className={`text-xs truncate flex-1 ${!track.buffer ? 'italic text-gray-500' : ''}`}>
                          {track.name}
                          {!track.buffer && ' (missing)'}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatTime(track.duration)}</span>
                        {isMusicHost && (
                          <button
                            onClick={(e) => { e.stopPropagation(); removeTrack(i) }}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-opacity"
                          >
                            <FaTimes size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add more songs */}
                {isMusicHost && (
                  <label className="mt-2 flex items-center gap-1.5 cursor-pointer text-xs text-primary-400 hover:text-primary-300 transition-colors">
                    <FaPlus size={10} />
                    Add more songs
                    <input
                      ref={addMoreInputRef}
                      type="file"
                      accept="audio/*"
                      multiple
                      onChange={handleMusicFiles}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Saved Playlists */}
              <div className="border-t border-gray-700 p-3">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">
                  Saved Playlists
                  {!user && <span className="ml-1 text-gray-500 normal-case">(login required)</span>}
                </p>

                {user && playlist.length > 0 && (
                  <div className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSavePlaylist()}
                      placeholder="Playlist name..."
                      className="flex-1 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-xs text-gray-200 outline-none focus:border-primary-500"
                    />
                    <button
                      onClick={handleSavePlaylist}
                      disabled={!playlistName.trim() || savingPlaylist}
                      className="px-2 py-1 rounded bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 text-white text-xs transition-colors"
                    >
                      <FaSave size={12} />
                    </button>
                  </div>
                )}

                {user ? (
                  savedPlaylists.length === 0 ? (
                    <p className="text-xs text-gray-500">No saved playlists yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {savedPlaylists.map(pl => (
                        <div key={pl.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-700/40 group">
                          <FaMusic className="text-gray-500 flex-shrink-0" size={10} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-200 truncate">{pl.name}</p>
                            <p className="text-[10px] text-gray-500">{pl.songs.length} songs</p>
                          </div>
                          <button
                            onClick={() => handleLoadPlaylist(pl)}
                            className="px-2 py-0.5 rounded text-[10px] bg-gray-600 hover:bg-gray-500 text-gray-200 transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeletePlaylist(pl.id)}
                            className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-opacity"
                          >
                            <FaTrash size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <a href="/login" className="text-xs text-primary-400 hover:text-primary-300 underline">
                    Log in to save playlists
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Music bar */}
      <div className="px-4 py-2 bg-gray-800/80 backdrop-blur border-t border-gray-700">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <FaMusic className="text-gray-400 flex-shrink-0" />

          {isMusicHost ? (
            <>
              {playlist.length === 0 ? (
                <label className="cursor-pointer px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors">
                  Load Music
                  <input type="file" accept="audio/*" multiple onChange={handleMusicFiles} className="hidden" />
                </label>
              ) : (
                <>
                  {/* Prev */}
                  <button
                    onClick={prevTrack}
                    disabled={currentTrackIndex <= 0 && musicTime <= 3}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <FaStepBackward size={11} />
                  </button>
                  {/* Play/Pause */}
                  <button onClick={toggleMusic} className="p-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors flex-shrink-0">
                    {musicPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
                  </button>
                  {/* Next */}
                  <button
                    onClick={nextTrack}
                    disabled={currentTrackIndex >= playlist.length - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <FaStepForward size={11} />
                  </button>
                  {/* Time + Progress */}
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(musicTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group" onClick={seekMusic}>
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${musicDuration ? (musicTime / musicDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(musicDuration)}</span>
                  {/* Track info */}
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={musicName}>{musicName}</span>
                  {playlist.length > 1 && (
                    <span className="text-[10px] text-gray-500 flex-shrink-0">{currentTrackIndex + 1}/{playlist.length}</span>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {playlist.length > 0 ? (
                <>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${musicPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(musicTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full relative">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${musicDuration ? (musicTime / musicDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(musicDuration)}</span>
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={musicName}>{musicName}</span>
                  {playlist.length > 1 && (
                    <span className="text-[10px] text-gray-500 flex-shrink-0">{currentTrackIndex + 1}/{playlist.length}</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-500">Peer can load music to listen together</span>
              )}
            </>
          )}

          {/* Either user can load music when nothing loaded */}
          {!isMusicHost && playlist.length === 0 && (
            <label className="cursor-pointer px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors ml-auto">
              Load Music
              <input type="file" accept="audio/*" multiple onChange={handleMusicFiles} className="hidden" />
            </label>
          )}

          {/* Playlist panel toggle */}
          {(playlist.length > 0 || (user && savedPlaylists.length > 0)) && (
            <button
              onClick={() => setShowPlaylistPanel(p => !p)}
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                showPlaylistPanel ? 'bg-primary-600 text-white' : 'hover:bg-gray-700 text-gray-400 hover:text-white'
              }`}
              title="Playlist"
            >
              <FaListUl size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-800/80 backdrop-blur">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition-colors ${audioEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
        >
          {audioEnabled ? <FaMicrophone size={18} /> : <FaMicrophoneSlash size={18} />}
        </button>
        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${videoEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
        >
          {videoEnabled ? <FaVideo size={18} /> : <FaVideoSlash size={18} />}
        </button>

        {/* Recording controls */}
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={!!processingState && processingState !== 'done' && processingState !== 'error'}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white transition-colors"
            title="Start recording"
          >
            <FaCircle size={18} className="text-red-400" />
          </button>
        ) : (
          <>
            {/* Pause/Resume */}
            <button
              onClick={toggleRecordingPause}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors"
              title={isPaused ? 'Resume recording' : 'Pause recording'}
            >
              {isPaused ? <FaPlay size={18} className="text-red-400" /> : <FaPause size={18} className="text-yellow-400" />}
            </button>
            {/* Stop */}
            <button
              onClick={stopRecording}
              className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Stop recording"
            >
              <FaStop size={18} />
            </button>
            {/* Timer */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/40 border border-red-700/50">
              <div className={`w-2.5 h-2.5 rounded-full bg-red-500 ${isPaused ? '' : 'animate-pulse'}`} />
              <span className="text-sm font-mono text-red-300">{formatTime(recordingTime)}</span>
              {isPaused && <span className="text-xs text-yellow-400">PAUSED</span>}
            </div>
          </>
        )}

        <button
          onClick={hangUp}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          <FaPhone size={18} className="rotate-[135deg]" />
        </button>
      </div>

      {/* Topic input modal */}
      {showTopicInput && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-gray-700">
            <h3 className="text-white font-semibold mb-1">Start Recording</h3>
            <p className="text-gray-400 text-sm mb-4">Optionally set a meeting topic for better summaries.</p>
            <input
              type="text"
              value={meetingTopic}
              onChange={(e) => setMeetingTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmStartRecording()}
              placeholder="Meeting topic (optional)"
              className="w-full px-4 py-2.5 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 outline-none focus:border-primary-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowTopicInput(false); setMeetingTopic('') }}
                className="flex-1 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartRecording}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                <FaCircle size={10} /> Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing state overlay */}
      {(processingState && processingState !== 'done' && processingState !== 'error') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl border border-gray-700 text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">
              {processingState === 'transcribing' && 'Transcribing audio...'}
              {processingState === 'summarizing' && 'Generating summary...'}
              {processingState === 'saving' && 'Saving to database...'}
            </p>
            <p className="text-gray-400 text-sm mt-1">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {processingState === 'error' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-red-700/50">
            <h3 className="text-red-400 font-semibold mb-2">Processing Failed</h3>
            <p className="text-gray-300 text-sm mb-4">{summaryError}</p>
            <button
              onClick={dismissSummary}
              className="w-full px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Meeting summary overlay */}
      {processingState === 'done' && meetingSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl border border-gray-700 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold text-lg">{meetingSummary.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copySummaryText}
                  className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title="Copy as Markdown"
                >
                  {summaryCopied ? <FaCheck className="text-green-400" size={14} /> : <FaCopy size={14} />}
                </button>
                <button
                  onClick={dismissSummary}
                  className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Summary */}
              <p className="text-gray-300 text-sm leading-relaxed">{meetingSummary.summary}</p>

              {/* Key Points */}
              {meetingSummary.keyPoints?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Key Points</h4>
                  <ul className="space-y-1.5">
                    {meetingSummary.keyPoints.map((p, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-primary-400 mt-0.5 flex-shrink-0">&#8226;</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {meetingSummary.actionItems?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Action Items</h4>
                  <ul className="space-y-1.5">
                    {meetingSummary.actionItems.map((a, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-yellow-400 mt-0.5 flex-shrink-0">&#9744;</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Decisions */}
              {meetingSummary.decisions?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Decisions</h4>
                  <ul className="space-y-1.5">
                    {meetingSummary.decisions.map((d, i) => (
                      <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className="text-green-400 mt-0.5 flex-shrink-0">&#10003;</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Transcript (collapsible) */}
              <details className="group">
                <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300">
                  Full Transcript
                </summary>
                <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3">
                  {meetingSummary.transcript}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  )
}
