import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { SIGNAL_URL, RESOLUTIONS } from './constants'

/**
 * Manages WebRTC peer connection, socket.io signaling, and media streams.
 */
export default function useMeetConnection({ urlRoomId, videoResolution, onMusicSync }) {
  const [phase, setPhase] = useState(urlRoomId ? 'joining' : 'lobby')
  const [roomId, setRoomId] = useState(urlRoomId || '')
  const [error, setError] = useState('')
  const [peerConnected, setPeerConnected] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [speakerEnabled, setSpeakerEnabled] = useState(true)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)

  const socketRef = useRef(null)
  const pcRef = useRef(null)
  const peerIdRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteVideoStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const remoteAudioStreamRef = useRef(new MediaStream())
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const remoteDescSetRef = useRef(false)
  const musicStreamDestRef = useRef(null)
  const iceServersRef = useRef(null)

  // Fetch ICE servers (TURN credentials) from backend
  const fetchIceServers = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/meet/ice-servers', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        iceServersRef.current = data.iceServers
      } else {
        console.warn('[ICE] Failed to fetch TURN credentials, using STUN only')
        iceServersRef.current = [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ]
      }
    } catch (err) {
      console.error('[ICE] Error fetching TURN credentials:', err)
      iceServersRef.current = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    }
  }, [])

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        fetchUserRole(data.user.id)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null
      setUser(u)
      if (u) fetchUserRole(u.id)
      else setUserRole(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchUserRole(userId) {
    try {
      const { data, error: err } = await supabase
        .from('aa_profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (!err && data) setUserRole(data.role)
    } catch (err) {
      console.error('Failed to fetch user role:', err)
    }
  }

  // Sync speaker state
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speakerEnabled
    }
  }, [speakerEnabled])

  // Attach local stream to video element once meeting view renders
  useEffect(() => {
    if (phase === 'connected' && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current
    }
    if (phase === 'connected' && remoteAudioRef.current && remoteAudioStreamRef.current.getTracks().length > 0) {
      remoteAudioRef.current.srcObject = remoteAudioStreamRef.current
      remoteAudioRef.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true))
    }
  }, [phase])

  // Create persistent <audio> element on mount
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
    return () => cleanup()
  }, [])

  // Auto-join if URL has room id
  useEffect(() => {
    if (urlRoomId && phase === 'joining') {
      initConnection('join', urlRoomId)
    }
  }, [urlRoomId])

  function canCreateMeeting() {
    if (!user) return { allowed: false, reason: '请先登录才能创建会议' }
    if (userRole !== 'admin') return { allowed: false, reason: '只有管理员可以创建会议。您可以通过会议 ID 加入现有会议。' }
    return { allowed: true }
  }

  function getVideoConstraints() {
    const res = RESOLUTIONS[videoResolution] || RESOLUTIONS.fhd
    return { width: { ideal: res.width }, height: { ideal: res.height }, facingMode: 'user' }
  }

  function cleanup() {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()) }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()) }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
  }

  async function loadSocketIO() {
    // Dynamic import of socket.io-client npm package
    const { io } = await import('socket.io-client')
    return io
  }

  async function initConnection(mode, targetRoomId) {
    setError('')
    setAudioBlocked(false)

    if (mode === 'create') {
      const { allowed, reason } = canCreateMeeting()
      if (!allowed) { setError(reason); setPhase('lobby'); return }
    }

    try {
      // Fetch TURN credentials before connecting
      await fetchIceServers()

      // Generate or retrieve a stable client ID for connection tracking (grace period)
      let stableId = user?.id
      if (!stableId) {
        stableId = localStorage.getItem('aa_meet_client_id')
        if (!stableId) {
          stableId = 'guest_' + Math.random().toString(36).slice(2, 11)
          localStorage.setItem('aa_meet_client_id', stableId)
        }
      }

      const io = await loadSocketIO()
      const socket = io(SIGNAL_URL, { path: '/socket.io/', transports: ['websocket', 'polling'] })
      socketRef.current = socket

      socket.on('peer-joined', (peerId) => {
        setPeerConnected(true)
        createPeerConnection(socket, peerId, true)
      })

      socket.on('signal', async ({ from, data }) => {
        if (!pcRef.current) createPeerConnection(socket, from, false)
        const pc = pcRef.current
        if (data.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          remoteDescSetRef.current = true
          for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c))
          pendingCandidatesRef.current = []
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          socket.emit('signal', { to: from, data: answer })
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data))
          remoteDescSetRef.current = true
          for (const c of pendingCandidatesRef.current) await pc.addIceCandidate(new RTCIceCandidate(c))
          pendingCandidatesRef.current = []
        } else if (data.candidate) {
          if (remoteDescSetRef.current) await pc.addIceCandidate(new RTCIceCandidate(data))
          else pendingCandidatesRef.current.push(data)
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

      socket.on('music-sync', (msg) => onMusicSync?.(msg))

      socket.on('connect_error', () => { setError('Cannot connect to signal server'); setPhase('lobby') })

      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: getVideoConstraints(), audio: true }),
        new Promise((resolve) => {
          if (socket.connected) resolve()
          else socket.on('connect', () => resolve())
        }),
      ])

      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream

      if (mode === 'create') {
        socket.emit('create-room', stableId, (res) => {
          if (res.roomId) { setRoomId(res.roomId); setPhase('connected'); window.history.replaceState(null, '', `/meet/${res.roomId}`) }
        })
      } else {
        socket.emit('join-room', targetRoomId, stableId, (res) => {
          if (res.error) { setError(res.error === 'Room not found' ? 'Meeting ID not found' : res.error); setPhase('lobby'); return }
          setRoomId(targetRoomId); setPhase('connected'); window.history.replaceState(null, '', `/meet/${targetRoomId}`)
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to get camera/mic access')
      setPhase('lobby')
    }
  }

  function createPeerConnection(socket, peerId, isInitiator) {
    const iceServers = iceServersRef.current || [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
    const pc = new RTCPeerConnection({ iceServers })
    pcRef.current = pc
    peerIdRef.current = peerId
    remoteDescSetRef.current = false
    pendingCandidatesRef.current = []

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current))
    }
    if (musicStreamDestRef.current) {
      musicStreamDestRef.current.stream.getTracks().forEach(track => pc.addTrack(track, musicStreamDestRef.current.stream))
    }

    remoteAudioStreamRef.current = new MediaStream()

    pc.ontrack = (e) => {
      if (e.track.kind === 'video') {
        remoteVideoStreamRef.current = e.streams[0]
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]
      } else if (e.track.kind === 'audio') {
        remoteAudioStreamRef.current.addTrack(e.track)
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteAudioStreamRef.current
          remoteAudioRef.current.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true))
        }
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('signal', { to: peerId, data: e.candidate.toJSON() })
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setPeerConnected(true)
      else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) setPeerConnected(false)
    }

    if (isInitiator) {
      pc.createOffer().then(offer => { pc.setLocalDescription(offer); socket.emit('signal', { to: peerId, data: offer }) })
    }
  }

  async function renegotiate() {
    const pc = pcRef.current, socket = socketRef.current, peerId = peerIdRef.current
    if (!pc || !socket || !peerId) return
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    socket.emit('signal', { to: peerId, data: offer })
  }

  // Re-bind local video srcObject (call after PiP restore, screen share stop, etc.)
  function rebindLocalVideo() {
    const videoEl = localVideoRef.current
    if (!videoEl) return
    const stream = isScreenSharing ? screenStreamRef.current : localStreamRef.current
    if (stream) {
      if (videoEl.srcObject !== stream) videoEl.srcObject = stream
      // Ensure playback resumes after browser may have paused it
      if (videoEl.paused) videoEl.play().catch(() => {})
    }
  }

  // Re-bind remote video srcObject
  function rebindRemoteVideo() {
    const videoEl = remoteVideoRef.current
    if (!videoEl) return
    const stream = remoteVideoStreamRef.current
    if (stream) {
      if (videoEl.srcObject !== stream) videoEl.srcObject = stream
      if (videoEl.paused) videoEl.play().catch(() => {})
    }
  }

  // Media toggles
  function toggleVideo() {
    const stream = localStreamRef.current
    if (!stream) return
    const vTrack = stream.getVideoTracks()[0]
    if (!vTrack || vTrack.readyState === 'ended') {
      console.warn('[toggleVideo] No live video track available')
      return
    }
    vTrack.enabled = !vTrack.enabled
    setVideoEnabled(vTrack.enabled)
    // Re-bind srcObject in case browser detached it
    if (vTrack.enabled) rebindLocalVideo()
  }

  function toggleAudio() {
    const stream = localStreamRef.current
    if (!stream) return
    const aTrack = stream.getAudioTracks()[0]
    if (!aTrack || aTrack.readyState === 'ended') {
      console.warn('[toggleAudio] No live audio track available')
      return
    }
    aTrack.enabled = !aTrack.enabled
    setAudioEnabled(aTrack.enabled)
  }

  function toggleSpeaker() {
    if (remoteAudioRef.current) {
      const newState = !speakerEnabled
      remoteAudioRef.current.muted = !newState
      setSpeakerEnabled(newState)
    }
  }

  async function startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', displaySurface: 'monitor' },
        audio: false,
      })
      screenStreamRef.current = screenStream
      const screenTrack = screenStream.getVideoTracks()[0]
      screenTrack.onended = () => stopScreenShare()

      if (pcRef.current && localStreamRef.current) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
        if (sender) await sender.replaceTrack(screenTrack)
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
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
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop())
        screenStreamRef.current = null
      }
      if (pcRef.current && localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0]
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video')
        if (sender && videoTrack) await sender.replaceTrack(videoTrack)
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
      }
      setIsScreenSharing(false)
    } catch (err) {
      console.error('Failed to stop screen share:', err)
    }
  }

  async function toggleScreenShare() {
    if (isScreenSharing) await stopScreenShare()
    else await startScreenShare()
  }

  function unlockAudio() {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.play().then(() => setAudioBlocked(false)).catch(() => {})
    }
  }

  function hangUp() {
    cleanup()
    window.location.href = '/meet'
  }

  return {
    // State
    phase, setPhase, roomId, error, setError, peerConnected,
    videoEnabled, audioEnabled, speakerEnabled, audioBlocked, isScreenSharing,
    user, userRole,
    // Refs
    socketRef, pcRef, localVideoRef, remoteVideoRef, remoteAudioRef,
    remoteAudioStreamRef, localStreamRef, musicStreamDestRef,
    // Actions
    initConnection, renegotiate, cleanup,
    toggleVideo, toggleAudio, toggleSpeaker, toggleScreenShare,
    rebindLocalVideo, rebindRemoteVideo,
    unlockAudio, hangUp, canCreateMeeting,
  }
}
