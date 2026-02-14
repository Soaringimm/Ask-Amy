import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaMusic, FaPlay, FaPause, FaPhone, FaCopy, FaCheck, FaSignInAlt,
  FaStepBackward, FaStepForward, FaListUl, FaSave, FaTrash,
  FaPlus, FaTimes, FaCircle, FaStop, FaEdit, FaHistory, FaDesktop,
  FaVolumeUp, FaVolumeMute,
} from 'react-icons/fa'
import { FaYoutube } from 'react-icons/fa'
import { supabase } from '../lib/supabase'
import {
  saveAudioFile, getAudioFile,
  savePlaylist, getPlaylists, deletePlaylist as deletePlaylistApi,
} from '../lib/playlistStorage'
import {
  createRecordingMixer, createMeetRecorder,
  saveAndProcessRecording,
  getRecordings, updateRecording, deleteRecording,
} from '../lib/meetRecording'
import {
  loadYouTubeAPI, parseYouTubeURL, createYTPlayer, YTState,
} from '../lib/youtubePlayer'

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
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showHangUpDialog, setShowHangUpDialog] = useState(false)
  const screenStreamRef = useRef(null)

  // Playlist state
  const [playlist, setPlaylist] = useState([]) // [{ name, duration, buffer }]
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicTime, setMusicTime] = useState(0)
  const [musicDuration, setMusicDuration] = useState(0)
  const [isMusicHost, setIsMusicHost] = useState(false)
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false)

  // YouTube state
  const [ytMode, setYtMode] = useState(false)       // true when YouTube is active (replaces local music)
  const [ytUrl, setYtUrl] = useState('')             // input field
  const [ytVideoTitle, setYtVideoTitle] = useState('')
  const [ytPlaying, setYtPlaying] = useState(false)
  const [ytTime, setYtTime] = useState(0)
  const [ytDuration, setYtDuration] = useState(0)
  const [ytPlaylistItems, setYtPlaylistItems] = useState([]) // [{ title, videoId }]
  const [ytCurrentIndex, setYtCurrentIndex] = useState(-1)
  const [ytLoading, setYtLoading] = useState(false)
  const [isYtHost, setIsYtHost] = useState(false)    // who loaded the YouTube URL

  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [processingState, setProcessingState] = useState('') // '' | 'transcribing' | 'summarizing' | 'saving' | 'done' | 'error'
  const [meetingSummary, setMeetingSummary] = useState(null)
  const [summaryError, setSummaryError] = useState('')
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [editingRecording, setEditingRecording] = useState(null) // the recording being viewed/edited
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [recordings, setRecordings] = useState([])
  const [showRecordings, setShowRecordings] = useState(false)

  // Supabase auth + saved playlists
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null) // 'admin' | 'client' | null
  const [savedPlaylists, setSavedPlaylists] = useState([])
  const [playlistName, setPlaylistName] = useState('')
  const [savingPlaylist, setSavingPlaylist] = useState(false)
  const [videoResolution, setVideoResolution] = useState('fhd') // 'sd' | 'hd' | 'fhd' - 默认全高清

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

  // YouTube refs
  const ytPlayerRef = useRef(null)       // YT.Player instance
  const ytContainerRef = useRef(null)    // hidden div for YT player
  const ytTimerRef = useRef(null)        // setInterval for time updates
  const ytIgnoreStateRef = useRef(false) // suppress state change events during programmatic control

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
        fetchUserRole(data.user.id)
        fetchSavedPlaylists(data.user.id)
        getRecordings(data.user.id).then(setRecordings).catch(() => {})
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null
      setUser(u)
      if (u) {
        fetchUserRole(u.id)
        fetchSavedPlaylists(u.id)
        getRecordings(u.id).then(setRecordings).catch(() => {})
      } else {
        setUserRole(null)
        setSavedPlaylists([])
        setRecordings([])
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Sync speaker state with remote audio element
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speakerEnabled
    }
  }, [speakerEnabled])

  async function fetchUserRole(userId) {
    try {
      const { data, error } = await supabase
        .from('aa_profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (!error && data) {
        setUserRole(data.role)
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err)
    }
  }

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
    // Clean up YouTube
    clearInterval(ytTimerRef.current)
    if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy() } catch {} }
    ytPlayerRef.current = null
    if (audioCtxRef.current) { audioCtxRef.current.close() }
    if (pcRef.current) { pcRef.current.close() }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()) }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()) }
    if (socketRef.current) { socketRef.current.disconnect() }
  }

  // ─── Connection ───────────────────────────────────────────────────────────

  // 检查创建会议权限
  function canCreateMeeting() {
    if (!user) {
      return { allowed: false, reason: '请先登录才能创建会议' }
    }
    if (userRole !== 'admin') {
      return { allowed: false, reason: '只有管理员可以创建会议。您可以通过会议 ID 加入现有会议。' }
    }
    return { allowed: true }
  }

  // 获取视频约束配置
  function getVideoConstraints() {
    const resolutions = {
      sd: { width: 640, height: 480 },
      hd: { width: 1280, height: 720 },
      fhd: { width: 1920, height: 1080 },
    }
    return {
      width: { ideal: resolutions[videoResolution].width },
      height: { ideal: resolutions[videoResolution].height },
      facingMode: 'user',
    }
  }

  async function initConnection(mode, targetRoomId) {
    setError('')
    setAudioBlocked(false)

    // 创建会议权限检查
    if (mode === 'create') {
      const { allowed, reason } = canCreateMeeting()
      if (!allowed) {
        setError(reason)
        setPhase('lobby')
        return
      }
    }

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
        navigator.mediaDevices.getUserMedia({
          video: getVideoConstraints(),
          audio: true
        }),
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

  // ─── YouTube functions ────────────────────────────────────────────────────

  function startYtTimeUpdater() {
    clearInterval(ytTimerRef.current)
    ytTimerRef.current = setInterval(() => {
      const p = ytPlayerRef.current
      if (p && typeof p.getCurrentTime === 'function') {
        setYtTime(p.getCurrentTime())
      }
    }, 500)
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
      startYtTimeUpdater()
      // Sync to peer
      if (socketRef.current) {
        socketRef.current.emit('music-sync', {
          type: 'yt-state',
          state: 'playing',
          time: p.getCurrentTime(),
          title: data?.title || '',
          duration: p.getDuration?.() || 0,
          index: p.getPlaylistIndex?.() ?? -1,
        })
      }
    } else if (state === YTState.PAUSED) {
      setYtPlaying(false)
      stopYtTimeUpdater()
      if (socketRef.current) {
        socketRef.current.emit('music-sync', {
          type: 'yt-state',
          state: 'paused',
          time: p.getCurrentTime(),
        })
      }
    } else if (state === YTState.ENDED) {
      // Auto-advance happens internally for playlists; for single video just stop
      setYtPlaying(false)
      stopYtTimeUpdater()
    }
  }

  async function loadYouTube(url) {
    const parsed = parseYouTubeURL(url)
    if (!parsed) {
      setError('Invalid YouTube URL')
      return
    }

    setYtLoading(true)
    setIsYtHost(true)
    setYtMode(true)

    // Pause local music if playing
    if (musicPlaying) {
      stopCurrentSource()
      const ctx = audioCtxRef.current
      if (ctx) {
        const elapsed = ctx.currentTime - musicStartTimeRef.current + musicOffsetRef.current
        musicOffsetRef.current = elapsed
      }
      setMusicPlaying(false)
    }

    try {
      await loadYouTubeAPI()

      // Destroy existing player
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy()
        ytPlayerRef.current = null
      }

      // Need a fresh div for the player
      if (ytContainerRef.current) {
        ytContainerRef.current.innerHTML = '<div id="yt-player-embed"></div>'
      }

      const player = createYTPlayer('yt-player-embed', {
        videoId: parsed.videoId,
        listId: parsed.listId,
        onReady: () => {
          setYtLoading(false)
          // Get playlist items if available
          const pl = player.getPlaylist?.()
          if (pl && pl.length > 0) {
            setYtPlaylistItems(pl.map((vid, i) => ({ videoId: vid, title: `Track ${i + 1}` })))
            setYtCurrentIndex(player.getPlaylistIndex?.() ?? 0)
          } else {
            setYtPlaylistItems([])
            setYtCurrentIndex(0)
          }
          setYtDuration(player.getDuration?.() || 0)
          const data = player.getVideoData?.()
          if (data?.title) setYtVideoTitle(data.title)

          // Tell peer to load the same URL
          if (socketRef.current) {
            socketRef.current.emit('music-sync', {
              type: 'youtube-load',
              url: url,
              videoId: parsed.videoId,
              listId: parsed.listId,
            })
          }
        },
        onStateChange: (state) => handleYtStateChange(state),
        onError: (code) => {
          console.error('[YT] player error:', code)
          setYtLoading(false)
          setError('YouTube playback error')
        },
      })
      ytPlayerRef.current = player
    } catch (err) {
      console.error('[YT] load error:', err)
      setYtLoading(false)
      setError('Failed to load YouTube player')
    }
  }

  function toggleYtPlayback() {
    const p = ytPlayerRef.current
    if (!p) return
    if (ytPlaying) {
      p.pauseVideo()
    } else {
      p.playVideo()
    }
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
    setTimeout(() => { ytIgnoreStateRef.current = false }, 500)
    if (socketRef.current) {
      socketRef.current.emit('music-sync', {
        type: 'yt-state',
        state: 'seek',
        time: seekTo,
      })
    }
  }

  function ytNextTrack() {
    const p = ytPlayerRef.current
    if (!p) return
    p.nextVideo()
  }

  function ytPrevTrack() {
    const p = ytPlayerRef.current
    if (!p) return
    if (ytTime > 3) {
      p.seekTo(0, true)
      setYtTime(0)
    } else {
      p.previousVideo()
    }
  }

  function stopYouTube() {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.stopVideo()
      ytPlayerRef.current.destroy()
      ytPlayerRef.current = null
    }
    stopYtTimeUpdater()
    setYtMode(false)
    setYtPlaying(false)
    setYtTime(0)
    setYtDuration(0)
    setYtVideoTitle('')
    setYtPlaylistItems([])
    setYtCurrentIndex(-1)
    setYtUrl('')
    setIsYtHost(false)
    if (socketRef.current) {
      socketRef.current.emit('music-sync', { type: 'yt-stop' })
    }
  }

  // Peer-side: load YouTube player when host sends youtube-load
  async function handleYtLoad(msg) {
    setYtMode(true)
    setIsYtHost(false)
    setYtLoading(true)

    // Pause local music
    if (musicPlaying) {
      stopCurrentSource()
      setMusicPlaying(false)
    }

    try {
      await loadYouTubeAPI()
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy()
        ytPlayerRef.current = null
      }
      if (ytContainerRef.current) {
        ytContainerRef.current.innerHTML = '<div id="yt-player-embed"></div>'
      }

      const player = createYTPlayer('yt-player-embed', {
        videoId: msg.videoId,
        listId: msg.listId,
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
          // Peer mirrors host state; only update UI, don't re-emit
          const p = ytPlayerRef.current
          if (!p) return
          if (state === YTState.PLAYING) {
            setYtPlaying(true)
            setYtDuration(p.getDuration?.() || 0)
            const data = p.getVideoData?.()
            if (data?.title) setYtVideoTitle(data.title)
            startYtTimeUpdater()
          } else if (state === YTState.PAUSED) {
            setYtPlaying(false)
            stopYtTimeUpdater()
          } else if (state === YTState.ENDED) {
            setYtPlaying(false)
            stopYtTimeUpdater()
          }
        },
        onError: (code) => {
          console.error('[YT peer] player error:', code)
          setYtLoading(false)
        },
      })
      ytPlayerRef.current = player
    } catch (err) {
      console.error('[YT peer] load error:', err)
      setYtLoading(false)
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
      // YouTube sync events
      case 'youtube-load':
        handleYtLoad(msg)
        break
      case 'yt-state': {
        const p = ytPlayerRef.current
        if (!p) break
        ytIgnoreStateRef.current = true
        if (msg.state === 'playing') {
          p.seekTo(msg.time, true)
          p.playVideo()
          setYtPlaying(true)
          setYtDuration(msg.duration || ytDuration)
          if (msg.title) setYtVideoTitle(msg.title)
          if (msg.index >= 0) setYtCurrentIndex(msg.index)
          startYtTimeUpdater()
        } else if (msg.state === 'paused') {
          p.seekTo(msg.time, true)
          p.pauseVideo()
          setYtPlaying(false)
          setYtTime(msg.time)
          stopYtTimeUpdater()
        } else if (msg.state === 'seek') {
          p.seekTo(msg.time, true)
          setYtTime(msg.time)
        }
        setTimeout(() => { ytIgnoreStateRef.current = false }, 500)
        break
      }
      case 'yt-stop':
        if (ytPlayerRef.current) {
          ytPlayerRef.current.stopVideo()
          ytPlayerRef.current.destroy()
          ytPlayerRef.current = null
        }
        stopYtTimeUpdater()
        setYtMode(false)
        setYtPlaying(false)
        setYtTime(0)
        setYtDuration(0)
        setYtVideoTitle('')
        setYtPlaylistItems([])
        setYtCurrentIndex(-1)
        setIsYtHost(false)
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
    // 直接开始录音，不弹对话框
    confirmStartRecording()
  }

  function confirmStartRecording() {
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

    if (!user) {
      setProcessingState('error')
      setSummaryError('Please log in to save recordings.')
      // 3秒后自动隐藏错误状态
      setTimeout(() => setProcessingState(''), 3000)
      return
    }

    // 设置处理中状态（不弹对话框）
    setProcessingState('processing')

    // Save pending record immediately, process async in background
    try {
      const record = await saveAndProcessRecording({
        userId: user.id,
        roomId,
        topic: '', // 空字符串，由函数生成默认名称
        durationSeconds,
        audioBlob: blob,
        onUpdate: (updated) => {
          // Background processing completed — update state if this recording is still being viewed
          setRecordings(prev => prev.map(r => r.id === updated.id ? updated : r))
          setEditingRecording(prev => prev?.id === updated.id ? updated : prev)
          if (updated.summary?.status === 'done') {
            setMeetingSummary(prev => {
              // Only update if we're still looking at this recording
              if (prev?._recordId === updated.id) {
                return { ...updated.summary, transcript: updated.transcript, _recordId: updated.id }
              }
              return prev
            })
            // 完成后显示"完成"状态3秒
            setProcessingState('done')
            setTimeout(() => setProcessingState(''), 3000)
          } else if (updated.summary?.status === 'error') {
            setProcessingState('error')
            setSummaryError(updated.summary.error || 'Processing failed')
            setTimeout(() => setProcessingState(''), 5000)
          }
        },
      })

      // Add to recordings list immediately
      setRecordings(prev => [record, ...prev])
      setEditingRecording(record)

      // Start polling for completion
      pollRecordingStatus(record.id)
    } catch (err) {
      console.error('Failed to save recording:', err)
      setProcessingState('error')
      setSummaryError(err.message || 'Failed to save recording')
      setTimeout(() => setProcessingState(''), 5000)
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
    setEditingRecording(null)
    setIsEditing(false)
    setEditForm(null)
  }

  // ─── Recording CRUD ────────────────────────────────────────────────────

  async function fetchRecordings() {
    if (!user) return
    try {
      const data = await getRecordings(user.id)
      setRecordings(data)
    } catch { /* ignore */ }
  }

  function openRecording(rec) {
    setEditingRecording(rec)
    setMeetingSummary({ ...rec.summary, transcript: rec.transcript || '', _recordId: rec.id })
    setProcessingState('done')
    setIsEditing(false)
    setEditForm(null)

    // If still processing, start polling for completion
    if (rec.summary?.status === 'processing') {
      pollRecordingStatus(rec.id)
    }
  }

  async function pollRecordingStatus(recordId) {
    const poll = async () => {
      try {
        const { data } = await supabase
          .from('aa_meet_recordings')
          .select('*')
          .eq('id', recordId)
          .single()
        if (!data) return

        if (data.summary?.status !== 'processing') {
          // Done or error — update everything
          setRecordings(prev => prev.map(r => r.id === data.id ? data : r))
          setEditingRecording(prev => prev?.id === data.id ? data : prev)
          setMeetingSummary(prev => {
            if (prev?._recordId === data.id) {
              return { ...data.summary, transcript: data.transcript || '', _recordId: data.id }
            }
            return prev
          })
          return // stop polling
        }

        // Still processing, poll again in 3s
        setTimeout(poll, 3000)
      } catch { /* ignore */ }
    }
    setTimeout(poll, 3000)
  }

  function startEditing() {
    if (!editingRecording) return
    const s = editingRecording.summary || {}
    setEditForm({
      title: s.title || '',
      summary: s.summary || '',
      keyPoints: (s.keyPoints || []).join('\n'),
      actionItems: (s.actionItems || []).join('\n'),
      decisions: (s.decisions || []).join('\n'),
      transcript: editingRecording.transcript || '',
    })
    setIsEditing(true)
  }

  async function saveEdit() {
    if (!editingRecording || !editForm) return
    setSavingEdit(true)
    try {
      const newSummary = {
        title: editForm.title,
        summary: editForm.summary,
        keyPoints: editForm.keyPoints.split('\n').filter(l => l.trim()),
        actionItems: editForm.actionItems.split('\n').filter(l => l.trim()),
        decisions: editForm.decisions.split('\n').filter(l => l.trim()),
      }
      const updated = await updateRecording(editingRecording.id, {
        summary: newSummary,
        transcript: editForm.transcript,
      })
      setEditingRecording(updated)
      setMeetingSummary({ ...newSummary, transcript: editForm.transcript })
      setIsEditing(false)
      setEditForm(null)
      fetchRecordings()
    } catch (err) {
      console.error('Failed to save edit:', err)
    }
    setSavingEdit(false)
  }

  async function handleDeleteRecording() {
    if (!editingRecording) return
    try {
      await deleteRecording(editingRecording.id)
      dismissSummary()
      fetchRecordings()
    } catch (err) {
      console.error('Failed to delete recording:', err)
    }
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

  function toggleSpeaker() {
    if (remoteAudioRef.current) {
      const newState = !speakerEnabled
      remoteAudioRef.current.muted = !newState
      setSpeakerEnabled(newState)
    }
  }

  // 屏幕共享功能
  async function toggleScreenShare() {
    if (isScreenSharing) {
      // 停止屏幕共享，切换回摄像头
      await stopScreenShare()
    } else {
      // 开始屏幕共享
      await startScreenShare()
    }
  }

  async function startScreenShare() {
    try {
      // 获取屏幕共享流
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: false // 屏幕共享通常不需要音频
      })

      screenStreamRef.current = screenStream

      // 监听用户通过浏览器停止共享按钮停止共享
      const screenTrack = screenStream.getVideoTracks()[0]
      screenTrack.onended = () => {
        stopScreenShare()
      }

      // 替换 PeerConnection 中的视频轨道
      if (pcRef.current && localStreamRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(screenTrack)
        }

        // 更新本地视频显示
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }
      }

      setIsScreenSharing(true)
    } catch (err) {
      console.error('Failed to start screen share:', err)
      setError('无法开始屏幕共享')
      setTimeout(() => setError(''), 3000)
    }
  }

  async function stopScreenShare() {
    try {
      // 停止屏幕共享流
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop())
        screenStreamRef.current = null
      }

      // 切换回摄像头
      if (pcRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack)
        }

        // 恢复本地视频显示
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current
        }
      }

      setIsScreenSharing(false)
    } catch (err) {
      console.error('Failed to stop screen share:', err)
    }
  }

  function requestHangUp() {
    setShowHangUpDialog(true)
  }

  async function confirmHangUp() {
    setShowHangUpDialog(false)

    // 如果正在录音，先停止录音
    if (isRecording) {
      await stopRecording()
    }

    // 调用原有的 hangUp 逻辑
    hangUp()
  }

  function cancelHangUp() {
    setShowHangUpDialog(false)
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

  // Lobby view - 精致优雅的启动界面
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        </div>

        <div className="w-full max-w-lg relative z-10">
          {/* 用户信息卡片 - 优雅设计 */}
          {user && (
            <div className="mb-6 p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-soft-lg transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                  <span className="text-lg font-semibold text-white">
                    {user.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      userRole === 'admin'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {userRole === 'admin' ? '👑 管理员' : '👤 普通用户'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 主标题区域 - 现代设计 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 mb-6 shadow-2xl transform hover:rotate-6 transition-transform duration-300 float-container">
              <FaVideo className="text-3xl text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-3 tracking-tight">
              Quick <span className="gradient-text">Meet</span>
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              {user && userRole === 'admin'
                ? '创建或加入会议，开启高效协作'
                : '输入会议 ID，即刻开始连接'}
            </p>
          </div>

          {/* 错误提示 - 优雅动画 */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 shadow-soft animate-shake">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">!</span>
                </div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* 视频分辨率选择 - 精致设计 */}
            {user && userRole === 'admin' && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/40 shadow-soft-lg transform hover:scale-[1.01] transition-all duration-300">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  视频分辨率
                </label>
                <select
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 bg-white font-medium text-gray-900"
                >
                  <option value="sd">📺 标清 - 640×480</option>
                  <option value="hd">🎬 高清 - 1280×720</option>
                  <option value="fhd">✨ 全高清 - 1920×1080 (推荐)</option>
                </select>
              </div>
            )}

            {/* 创建会议按钮 - 醒目设计 */}
            <button
              onClick={() => { setPhase('joining'); initConnection('create') }}
              className="group w-full relative overflow-hidden px-8 py-5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg shadow-2xl hover:shadow-glow transform hover:scale-[1.02] transition-all duration-300"
              title={!user ? '需要登录' : userRole !== 'admin' ? '仅管理员可创建' : ''}
              disabled={!user || userRole !== 'admin'}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
              <div className="relative flex items-center justify-center gap-3">
                <FaVideo className="text-xl" />
                <span>
                  {!user ? '🔐 创建会议 (需登录)' :
                   userRole !== 'admin' ? '🔒 创建会议 (仅管理员)' :
                   '✨ 创建新会议'}
                </span>
              </div>
            </button>

            {/* 分隔线 - 精致设计 */}
            <div className="relative flex items-center py-4">
              <div className="flex-1 border-t-2 border-gray-200" />
              <span className="px-4 text-sm font-medium text-gray-400 bg-transparent">或使用会议 ID</span>
              <div className="flex-1 border-t-2 border-gray-200" />
            </div>

            {/* 加入会议输入框 - 现代设计 */}
            <div className="flex gap-3">
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
                placeholder="输入 8 位会议 ID"
                className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none text-xl tracking-[0.3em] font-mono text-center uppercase bg-white/80 backdrop-blur-sm shadow-soft transition-all duration-200 font-bold"
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
                className="px-6 py-4 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <FaSignInAlt className="text-xl" />
              </button>
            </div>

            {/* 登录提示 - 优雅设计 */}
            {!user && (
              <div className="text-center pt-6 mt-6 border-t-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-3 font-medium">
                  💼 需要创建会议？
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-semibold link-underline transition-colors"
                >
                  立即登录或注册
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Connecting view - 优雅的连接动画
  if (phase === 'joining') {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        </div>

        <div className="text-center relative z-10 max-w-md">
          {/* 连接动画 - 优雅设计 */}
          <div className="relative mb-8">
            <div className="w-24 h-24 border-8 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-2xl">
                <FaVideo className="text-white text-2xl animate-pulse" />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-3">正在连接...</h2>
          <p className="text-lg text-gray-600 mb-8 font-medium">
            正在建立安全连接，请稍候
          </p>

          {/* 连接步骤指示器 */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-primary-400 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 shadow-soft-lg">
              <div className="flex items-center gap-3 text-red-700">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <p className="text-sm font-medium text-left">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Meeting view - 优雅专业的会议界面 ─────────────────────────────────
  return (
    <div className="meet-bg-dark flex flex-col relative overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Ambient background effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
      </div>

      {/* Top bar - 优雅设计 */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3 meet-control-panel shadow-2xl">
        <div className="flex items-center gap-4">
          {/* Meeting ID Badge */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">会议 ID</span>
            <code className="text-sm font-mono tracking-[0.2em] text-white font-bold">{roomId}</code>
            <button
              onClick={copyRoomId}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-all duration-200 text-slate-400 hover:text-white transform hover:scale-110"
              title="复制会议 ID"
            >
              {copied ? (
                <FaCheck className="text-green-400 animate-pulse" />
              ) : (
                <FaCopy className="text-sm" />
              )}
            </button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className={`w-2.5 h-2.5 rounded-full ${
              peerConnected
                ? 'bg-green-400 animate-pulse-ring'
                : 'bg-yellow-400 animate-pulse'
            }`} />
            <span className="text-sm text-slate-300 font-medium">
              {peerConnected ? '✅ 已连接' : '⏳ 等待对方...'}
            </span>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {/* Recording History - 只有创建者可见 */}
          {!urlRoomId && user && recordings.length > 0 && (
            <button
              onClick={() => { setShowRecordings(true); fetchRecordings() }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200 border border-transparent hover:border-slate-700/50"
              title="历史录制"
            >
              <FaHistory className="text-sm" />
              <span className="text-sm font-semibold">{recordings.length}</span>
              <span className="text-xs">录制</span>
            </button>
          )}

          {/* Resolution Indicator */}
          <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs text-slate-400 font-medium">
              {videoResolution === 'fhd' ? '📺 1080p' :
               videoResolution === 'hd' ? '📺 720p' : '📺 480p'}
            </span>
          </div>
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

      {/* Hidden YouTube player container */}
      <div ref={ytContainerRef} className="hidden">
        <div id="yt-player-embed"></div>
      </div>

      {/* Video area + Playlist panel */}
      <div className="flex-1 flex min-h-0 relative z-0">
        {/* Main Video Area */}
        <div className="flex-1 flex items-center justify-center p-6 relative">
          {/* Remote Video Container - 优雅设计 */}
          <div className="flex-1 h-full relative rounded-3xl overflow-hidden meet-video-container shadow-2xl border border-slate-700/30">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!peerConnected && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm">
                <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 animate-pulse">
                  <FaVideo className="text-3xl text-slate-400" />
                </div>
                <p className="text-slate-300 text-xl font-semibold mb-2">等待对方加入...</p>
                <p className="text-slate-500 text-sm">分享会议 ID 邀请参与者</p>
              </div>
            )}

            {/* Overlay gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Local Video (Picture-in-Picture) - 精致设计 */}
          <div className={`absolute bottom-8 right-8 w-64 h-48 rounded-2xl overflow-hidden shadow-2xl z-20 transform hover:scale-105 transition-all duration-300 group ${
            isScreenSharing
              ? 'border-2 border-primary-500/80 shadow-primary-500/30'
              : 'border-2 border-slate-600/50'
          }`}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isScreenSharing ? '' : 'mirror'}`}
            />
            {/* Label */}
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white font-semibold">
                  {isScreenSharing ? '🖥️ 你的屏幕' : '👤 你'}
                </span>
                {isScreenSharing && (
                  <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    共享中
                  </span>
                )}
              </div>
            </div>
            {/* Hover effect */}
            <div className={`absolute inset-0 ring-2 transition-all duration-300 rounded-2xl ${
              isScreenSharing
                ? 'ring-primary-500/50 group-hover:ring-primary-500/80'
                : 'ring-primary-500/0 group-hover:ring-primary-500/50'
            }`} />
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

              {/* YouTube */}
              <div className="border-t border-gray-700 p-3">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <FaYoutube className="text-red-500" size={12} />
                  YouTube
                </p>

                {ytMode ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <FaYoutube className="text-red-500 flex-shrink-0" size={14} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200 truncate">{ytVideoTitle || 'Loading...'}</p>
                        {ytPlaylistItems.length > 1 && (
                          <p className="text-[10px] text-gray-500">{ytCurrentIndex + 1}/{ytPlaylistItems.length} tracks</p>
                        )}
                      </div>
                      {isYtHost && (
                        <button
                          onClick={stopYouTube}
                          className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                          title="Stop YouTube"
                        >
                          <FaTimes size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && ytUrl.trim() && loadYouTube(ytUrl.trim())}
                      placeholder="Paste YouTube URL..."
                      className="flex-1 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-xs text-gray-200 outline-none focus:border-red-500/50 placeholder-gray-500"
                    />
                    <button
                      onClick={() => ytUrl.trim() && loadYouTube(ytUrl.trim())}
                      disabled={!ytUrl.trim() || ytLoading}
                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white text-xs transition-colors"
                    >
                      {ytLoading ? '...' : <FaPlay size={10} />}
                    </button>
                  </div>
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
          {ytMode ? (
            <>
              <FaYoutube className="text-red-500 flex-shrink-0" size={16} />
              {isYtHost ? (
                <>
                  {/* Prev */}
                  <button
                    onClick={ytPrevTrack}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <FaStepBackward size={11} />
                  </button>
                  {/* Play/Pause */}
                  <button onClick={toggleYtPlayback} className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors flex-shrink-0">
                    {ytPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
                  </button>
                  {/* Next */}
                  <button
                    onClick={ytNextTrack}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <FaStepForward size={11} />
                  </button>
                  {/* Time + Progress */}
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(ytTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group" onClick={seekYt}>
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${ytDuration ? (ytTime / ytDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(ytDuration)}</span>
                  {/* Track info */}
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={ytVideoTitle}>{ytVideoTitle || 'YouTube'}</span>
                  {ytPlaylistItems.length > 1 && (
                    <span className="text-[10px] text-gray-500 flex-shrink-0">{ytCurrentIndex + 1}/{ytPlaylistItems.length}</span>
                  )}
                  {/* Stop */}
                  <button
                    onClick={stopYouTube}
                    className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Stop YouTube"
                  >
                    <FaStop size={11} />
                  </button>
                </>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ytPlaying ? 'bg-red-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(ytTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full relative">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${ytDuration ? (ytTime / ytDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(ytDuration)}</span>
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={ytVideoTitle}>{ytVideoTitle || 'YouTube'}</span>
                </>
              )}
            </>
          ) : (
            <>
              <FaMusic className="text-gray-400 flex-shrink-0" />

              {isMusicHost ? (
                <>
                  {playlist.length === 0 && (!user || savedPlaylists.length === 0) ? (
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
            </>
          )}

          {/* Playlist panel toggle */}
          {!urlRoomId && (
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

      {/* Control Panel - 现代优雅设计 */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-6 py-5 meet-control-panel shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Audio Control - 优雅按钮 */}
          <button
            onClick={toggleAudio}
            className={`group relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
              audioEnabled
                ? 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg hover:shadow-xl'
                : 'bg-red-500/90 hover:bg-red-600/90 text-white shadow-lg shadow-red-500/30'
            }`}
            title={audioEnabled ? '静音' : '取消静音'}
          >
            {audioEnabled ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
            {/* Tooltip */}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {audioEnabled ? '静音' : '取消静音'}
            </span>
          </button>

          {/* Speaker Control - 扬声器控制 */}
          <button
            onClick={toggleSpeaker}
            className={`group relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
              speakerEnabled
                ? 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg hover:shadow-xl'
                : 'bg-red-500/90 hover:bg-red-600/90 text-white shadow-lg shadow-red-500/30'
            }`}
            title={speakerEnabled ? '静音扬声器' : '开启扬声器'}
          >
            {speakerEnabled ? <FaVolumeUp size={20} /> : <FaVolumeMute size={20} />}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {speakerEnabled ? '静音扬声器' : '开启扬声器'}
            </span>
          </button>

          {/* Video Control */}
          <button
            onClick={toggleVideo}
            className={`group relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
              videoEnabled
                ? 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg hover:shadow-xl'
                : 'bg-red-500/90 hover:bg-red-600/90 text-white shadow-lg shadow-red-500/30'
            }`}
            title={videoEnabled ? '关闭摄像头' : '打开摄像头'}
          >
            {videoEnabled ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {videoEnabled ? '关闭摄像头' : '打开摄像头'}
            </span>
          </button>

          {/* Screen Share Control - 屏幕共享 */}
          <button
            onClick={toggleScreenShare}
            className={`group relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-110 ${
              isScreenSharing
                ? 'bg-primary-600/90 hover:bg-primary-700/90 text-white shadow-lg shadow-primary-500/30'
                : 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg hover:shadow-xl'
            }`}
            title={isScreenSharing ? '停止共享' : '共享屏幕'}
          >
            <FaDesktop size={20} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isScreenSharing ? '停止共享' : '共享屏幕'}
            </span>
            {/* 共享中指示器 */}
            {isScreenSharing && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-10 bg-slate-700/50 mx-2" />

          {/* Recording Controls - 只有创建者可以录音 */}
          {!urlRoomId && (
            <>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={!!processingState && processingState !== 'done' && processingState !== 'error'}
                  className="group relative p-5 rounded-2xl bg-slate-700/80 hover:bg-slate-600/80 disabled:bg-slate-800/50 disabled:text-slate-600 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 disabled:transform-none"
                  title="开始录制"
                >
                  <FaCircle size={20} className="text-red-400" />
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    开始录制
                  </span>
                </button>
              ) : (
                <>
                  {/* Pause/Resume */}
                  <button
                    onClick={toggleRecordingPause}
                    className="group relative p-5 rounded-2xl bg-slate-700/80 hover:bg-slate-600/80 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110"
                    title={isPaused ? '继续录制' : '暂停录制'}
                  >
                    {isPaused ? <FaPlay size={20} className="text-green-400" /> : <FaPause size={20} className="text-yellow-400" />}
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {isPaused ? '继续录制' : '暂停录制'}
                    </span>
                  </button>

                  {/* Stop Recording */}
                  <button
                    onClick={stopRecording}
                    className="group relative p-5 rounded-2xl bg-red-600/90 hover:bg-red-700/90 text-white transition-all duration-300 shadow-lg shadow-red-600/30 hover:shadow-xl transform hover:scale-110"
                    title="停止录制"
                  >
                    <FaStop size={20} />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      停止录制
                    </span>
                  </button>

                  {/* Recording Timer - 优雅设计 */}
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-900/60 border-2 border-red-700/50 shadow-lg">
                    <div className={`w-3 h-3 rounded-full bg-red-500 ${isPaused ? '' : 'animate-pulse'}`} />
                    <span className="text-base font-mono font-bold text-white tabular-nums">{formatTime(recordingTime)}</span>
                    {isPaused && (
                      <span className="text-xs font-bold text-yellow-400 px-2 py-0.5 rounded-full bg-yellow-400/20">
                        暂停
                      </span>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Processing Indicator - 处理状态指示器（只有创建者可见） */}
          {!urlRoomId && !isRecording && processingState && processingState !== '' && (
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-sm border-2 border-white/10 shadow-lg">
              {processingState === 'processing' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-sm font-medium text-white">处理中...</span>
                </>
              )}
              {processingState === 'done' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-white">处理完成</span>
                </>
              )}
              {processingState === 'error' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-white">处理失败</span>
                </>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-10 bg-slate-700/50 mx-2" />

          {/* Hang Up Button - 醒目设计 */}
          <button
            onClick={requestHangUp}
            className="group relative p-5 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 shadow-lg shadow-red-500/40 hover:shadow-xl transform hover:scale-110"
            title="结束通话"
          >
            <FaPhone size={20} className="rotate-[135deg]" />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              结束通话
            </span>
          </button>
        </div>
      </div>

      {/* Error state (save failed, no record created) */}
      {processingState === 'error' && !meetingSummary && (
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

      {/* Meeting summary overlay — processing / view / edit mode */}
      {processingState === 'done' && meetingSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl border border-gray-700 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              {isEditing ? (
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white font-semibold text-lg outline-none focus:border-primary-500 mr-3"
                />
              ) : (
                <h3 className="text-white font-semibold text-lg flex-1 min-w-0 truncate">
                  {meetingSummary?.status === 'processing' && (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                      Processing...
                    </span>
                  )}
                  {meetingSummary?.status === 'error' && 'Error'}
                  {meetingSummary?.status === 'done' && meetingSummary.title}
                  {!meetingSummary?.status && meetingSummary?.title}
                </h3>
              )}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!isEditing && meetingSummary?.status === 'done' && (
                  <>
                    <button
                      onClick={copySummaryText}
                      className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                      title="Copy as Markdown"
                    >
                      {summaryCopied ? <FaCheck className="text-green-400" size={14} /> : <FaCopy size={14} />}
                    </button>
                    {editingRecording && (
                      <>
                        <button
                          onClick={startEditing}
                          className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                          title="Edit"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={handleDeleteRecording}
                          className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete recording"
                        >
                          <FaTrash size={14} />
                        </button>
                      </>
                    )}
                  </>
                )}
                {isEditing && (
                  <>
                    <button
                      onClick={saveEdit}
                      disabled={savingEdit}
                      className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      <FaSave size={12} /> {savingEdit ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setIsEditing(false); setEditForm(null) }}
                      className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  onClick={dismissSummary}
                  className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Processing state */}
              {meetingSummary?.status === 'processing' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
                  <p className="text-white font-medium">Processing recording...</p>
                  <p className="text-gray-400 text-sm mt-1">Transcribing and generating summary</p>
                  <button
                    onClick={dismissSummary}
                    className="mt-4 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
                  >
                    Close (processing continues in background)
                  </button>
                </div>
              )}

              {/* Error from background processing */}
              {meetingSummary?.status === 'error' && (
                <div className="py-8">
                  <h4 className="text-red-400 font-semibold mb-2">Processing Failed</h4>
                  <p className="text-gray-300 text-sm mb-4">{meetingSummary.error || 'Unknown error'}</p>
                  {editingRecording && (
                    <button
                      onClick={handleDeleteRecording}
                      className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm transition-colors"
                    >
                      Delete this recording
                    </button>
                  )}
                </div>
              )}

              {meetingSummary?.status === 'done' && isEditing && (
                <>
                  {/* Edit: Summary */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Summary</label>
                    <textarea
                      value={editForm.summary}
                      onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                      rows={3}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary-500 resize-none"
                    />
                  </div>
                  {/* Edit: Key Points */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Key Points <span className="normal-case text-gray-500">(one per line)</span></label>
                    <textarea
                      value={editForm.keyPoints}
                      onChange={(e) => setEditForm({ ...editForm, keyPoints: e.target.value })}
                      rows={4}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary-500 resize-none"
                    />
                  </div>
                  {/* Edit: Action Items */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Action Items <span className="normal-case text-gray-500">(one per line)</span></label>
                    <textarea
                      value={editForm.actionItems}
                      onChange={(e) => setEditForm({ ...editForm, actionItems: e.target.value })}
                      rows={3}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary-500 resize-none"
                    />
                  </div>
                  {/* Edit: Decisions */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Decisions <span className="normal-case text-gray-500">(one per line)</span></label>
                    <textarea
                      value={editForm.decisions}
                      onChange={(e) => setEditForm({ ...editForm, decisions: e.target.value })}
                      rows={3}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary-500 resize-none"
                    />
                  </div>
                  {/* Edit: Transcript */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Transcript</label>
                    <textarea
                      value={editForm.transcript}
                      onChange={(e) => setEditForm({ ...editForm, transcript: e.target.value })}
                      rows={6}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary-500 resize-none font-mono"
                    />
                  </div>
                </>
              )}

              {meetingSummary?.status === 'done' && !isEditing && (
                <>
                  {/* View: Summary */}
                  <p className="text-gray-300 text-sm leading-relaxed">{meetingSummary.summary}</p>

                  {/* View: Key Points */}
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

                  {/* View: Action Items */}
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

                  {/* View: Decisions */}
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

                  {/* View: Transcript */}
                  <details className="group">
                    <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300">
                      Full Transcript
                    </summary>
                    <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3">
                      {meetingSummary.transcript}
                    </pre>
                  </details>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recordings history panel */}
      {showRecordings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[70vh] shadow-2xl border border-gray-700 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold">Meeting Recordings</h3>
              <button onClick={() => setShowRecordings(false)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                <FaTimes size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {recordings.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No recordings yet</p>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {recordings.map(rec => (
                    <button
                      key={rec.id}
                      onClick={() => { setShowRecordings(false); openRecording(rec) }}
                      className="w-full text-left px-5 py-3 hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium truncate flex-1">
                          {rec.summary?.status === 'done' ? (rec.summary?.title || rec.topic || 'Untitled') : (rec.topic || 'Untitled')}
                        </p>
                        {rec.summary?.status === 'processing' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-600/20 text-primary-300 flex-shrink-0">Processing</span>
                        )}
                        {rec.summary?.status === 'error' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600/20 text-red-400 flex-shrink-0">Failed</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">{new Date(rec.created_at).toLocaleDateString()}</span>
                        <span className="text-xs text-gray-500">{formatTime(rec.duration_seconds)}</span>
                        {rec.room_id && <span className="text-xs text-gray-600 font-mono">{rec.room_id}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 停止会议确认对话框 */}
      {showHangUpDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <FaPhone className="text-red-600 text-xl rotate-[135deg]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                结束会议
              </h3>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">
              {isRecording
                ? '当前正在录音，结束会议将自动停止并保存录音。确定要结束会议吗？'
                : '确定要结束会议吗？'
              }
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={cancelHangUp}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={confirmHangUp}
                className="px-6 py-3 text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors font-medium shadow-lg shadow-red-500/30"
              >
                确定结束
              </button>
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
