import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { SIGNAL_URL, RESOLUTIONS } from './constants'

/**
 * Manages WebRTC peer connection, socket.io signaling, and media streams.
 *
 * Resilience features:
 * - ICE restart on connectionState 'disconnected' or 'failed'
 * - Socket.io auto-reconnect with room re-join
 * - Video stream re-attachment on visibility change (tab switch / minimize)
 */

const ICE_RESTART_DELAY_MS = 1500
const ICE_RESTART_MAX_ATTEMPTS = 3

export default function useMeetConnection({ urlRoomId, videoResolution, onMusicSync }) {
  const navigate = useNavigate()
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
  const iceRestartAttemptsRef = useRef(0)
  const iceRestartTimerRef = useRef(null)
  const roomIdRef = useRef('') // track roomId for socket reconnect
  const audioEnabledRef = useRef(true) // mirror audioEnabled for use in event callbacks
  const phaseRef = useRef('lobby') // mirror phase for use in event callbacks
  const onMusicSyncRef = useRef(onMusicSync) // mirror onMusicSync to avoid stale closure in socket listener
  const initInFlightRef = useRef(false) // guard against concurrent initConnection calls

  // Keep refs in sync with state/props (for use in callbacks/event listeners)
  useEffect(() => { roomIdRef.current = roomId }, [roomId])
  useEffect(() => { audioEnabledRef.current = audioEnabled }, [audioEnabled])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { onMusicSyncRef.current = onMusicSync }, [onMusicSync])

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

  // ─── Visibility change handler (fix video disappearing on minimize/tab switch) ───
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && phase === 'connected') {
        // Re-attach local video
        if (localVideoRef.current && localStreamRef.current) {
          const current = localVideoRef.current.srcObject
          if (!current || current.getVideoTracks().length === 0 || current.getVideoTracks().every(t => t.readyState === 'ended')) {
            localVideoRef.current.srcObject = isScreenSharing ? screenStreamRef.current : localStreamRef.current
          }
        }
        // Re-attach remote video if stream exists but element lost it
        if (remoteVideoRef.current && pcRef.current) {
          const receivers = pcRef.current.getReceivers()
          const videoReceiver = receivers.find(r => r.track?.kind === 'video')
          if (videoReceiver?.track && videoReceiver.track.readyState === 'live') {
            const currentSrc = remoteVideoRef.current.srcObject
            if (!currentSrc || currentSrc.getVideoTracks().length === 0) {
              const stream = new MediaStream([videoReceiver.track])
              remoteVideoRef.current.srcObject = stream
            }
          }
        }
        // Re-attach remote audio
        if (remoteAudioRef.current && remoteAudioStreamRef.current.getTracks().length > 0) {
          if (!remoteAudioRef.current.srcObject) {
            remoteAudioRef.current.srcObject = remoteAudioStreamRef.current
          }
          remoteAudioRef.current.play().catch(() => {})
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [phase, isScreenSharing])

  // ─── Bluetooth / audio device change handler ────────────────────────────────
  // Fires when any audio/video device connects or disconnects (e.g. Bluetooth headset).
  // If the current microphone track has ended, we re-acquire audio and hot-swap
  // the track in the RTCPeerConnection without dropping the call.
  useEffect(() => {
    async function handleDeviceChange() {
      if (phaseRef.current !== 'connected') return
      const stream = localStreamRef.current
      if (!stream) return

      const audioTrack = stream.getAudioTracks()[0]
      // Only act if the current track has ended (device disconnected)
      if (audioTrack && audioTrack.readyState === 'live') return

      console.log('[devicechange] Audio track ended, re-acquiring microphone...')
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const newAudioTrack = newStream.getAudioTracks()[0]

        // Preserve the user's mute state
        newAudioTrack.enabled = audioEnabledRef.current

        // Swap out the old audio track in the local stream
        stream.getAudioTracks().forEach(t => { t.stop(); stream.removeTrack(t) })
        stream.addTrack(newAudioTrack)

        // Replace the track in the RTCPeerConnection (no renegotiation needed)
        if (pcRef.current) {
          const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'audio')
          if (sender) await sender.replaceTrack(newAudioTrack)
        }

        console.log('[devicechange] Audio track replaced successfully')
      } catch (err) {
        console.error('[devicechange] Failed to re-acquire audio:', err)
      }

      // Always try to resume remote audio on the new default output device
      if (remoteAudioRef.current) {
        remoteAudioRef.current.play().catch(() => {})
      }
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }, []) // stable: uses refs, no state deps needed

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
    return () => {
      if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current)
      cleanup()
    }
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
    if (iceRestartTimerRef.current) { clearTimeout(iceRestartTimerRef.current); iceRestartTimerRef.current = null }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
      localStreamRef.current = null // (#7) null after stopping so stale refs aren't re-used
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
    }
    // (#8) Clear remote audio tracks in-place instead of replacing the object,
    // so external hooks holding a reference to the same MediaStream stay valid.
    remoteAudioStreamRef.current.getTracks().forEach(t => remoteAudioStreamRef.current.removeTrack(t))
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
    iceRestartAttemptsRef.current = 0
    initInFlightRef.current = false
  }

  async function loadSocketIO() {
    const { io } = await import('socket.io-client')
    return io
  }

  // ─── ICE Restart logic ─────────────────────────────────────────────────────
  function attemptIceRestart() {
    const pc = pcRef.current
    const socket = socketRef.current
    const peerId = peerIdRef.current
    if (!pc || !socket || !peerId) return

    if (iceRestartAttemptsRef.current >= ICE_RESTART_MAX_ATTEMPTS) {
      console.warn('[ICE] Max restart attempts reached, giving up')
      return
    }

    iceRestartAttemptsRef.current++
    console.log(`[ICE] Attempting ICE restart (attempt ${iceRestartAttemptsRef.current}/${ICE_RESTART_MAX_ATTEMPTS})`)

    pc.createOffer({ iceRestart: true })
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        socket.emit('signal', { to: peerId, data: pc.localDescription })
      })
      .catch(err => {
        console.error('[ICE] Restart failed:', err)
      })
  }

  async function initConnection(mode, targetRoomId) {
    // (#1) Prevent concurrent initConnection calls from creating duplicate sockets/PCs.
    // Clean up any previous connection before starting fresh.
    if (initInFlightRef.current) {
      console.warn('[initConnection] already in flight, ignoring duplicate call')
      return
    }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
    initInFlightRef.current = true

    setError('')
    setAudioBlocked(false)

    if (mode === 'create') {
      const { allowed, reason } = canCreateMeeting()
      if (!allowed) { setError(reason); setPhase('lobby'); initInFlightRef.current = false; return }
    }

    let stream = null // (#2) Track stream so we can stop tracks in catch block
    try {
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
      const socket = io(SIGNAL_URL, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })
      socketRef.current = socket

      socket.on('peer-joined', (peerId) => {
        iceRestartAttemptsRef.current = 0 // reset on new peer
        setPeerConnected(true)
        createPeerConnection(socket, peerId, true)
      })

      socket.on('signal', async ({ from, data }) => {
        if (!pcRef.current) createPeerConnection(socket, from, false)
        const pc = pcRef.current
        try {
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
        } catch (err) {
          console.error('[signal] Error handling signal:', err)
        }
      })

      socket.on('peer-left', () => {
        console.log('[peer-left] Peer disconnected, waiting for rejoin...')
        setPeerConnected(false)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
        // (#8) Clear in-place to keep external hook references valid
        remoteAudioStreamRef.current.getTracks().forEach(t => remoteAudioStreamRef.current.removeTrack(t))
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
        remoteDescSetRef.current = false
        pendingCandidatesRef.current = []
        iceRestartAttemptsRef.current = 0
        // NOTE: We do NOT leave the room. We stay connected to the socket
        // so the peer can rejoin and we get a new 'peer-joined' event.
      })

      socket.on('music-sync', (msg) => onMusicSyncRef.current?.(msg)) // (#4) use ref to avoid stale closure

      socket.on('connect_error', (err) => {
        console.error('[socket] connect_error:', err.message)
        // Don't immediately bail to lobby — socket.io will auto-reconnect
      })

      // Handle socket.io reconnect — reset signaling state and re-join the room
      socket.on('reconnect', () => {
        console.log('[socket] Reconnected, re-joining room...')
        // (#5) Reset signaling state to avoid InvalidStateError on re-offer
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
        remoteDescSetRef.current = false
        pendingCandidatesRef.current = []
        peerIdRef.current = null
        iceRestartAttemptsRef.current = 0
        setPeerConnected(false)

        const rid = roomIdRef.current
        if (rid) {
          socket.emit('join-room', rid, (res) => {
            if (res.error) {
              console.error('[socket] Failed to re-join room:', res.error)
              setError('会议连接已断开，请重新加入')
              setPhase('lobby')
            } else {
              console.log('[socket] Re-joined room successfully')
            }
          })
        }
      })

      // If socket fully fails after all retries
      socket.on('reconnect_failed', () => {
        console.error('[socket] All reconnection attempts failed')
        setError('无法连接到信号服务器，请检查网络后重试')
        setPhase('lobby')
      })

      ;[stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: getVideoConstraints(), audio: true }),
        // (#3) Socket connect with timeout + reject path — prevents initConnection hanging forever
        new Promise((resolve, reject) => {
          if (socket.connected) { resolve(); return }
          const timer = setTimeout(() => reject(new Error('Signal server connection timed out')), 10000)
          socket.once('connect', () => { clearTimeout(timer); resolve() })
          socket.once('connect_error', (err) => { clearTimeout(timer); reject(err) })
        }),
      ])

      localStreamRef.current = stream
      initInFlightRef.current = false // connection established, allow future re-init
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
      // (#2) Stop camera/mic tracks if getUserMedia succeeded before the failure
      if (stream) stream.getTracks().forEach(t => t.stop())
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null }
      initInFlightRef.current = false
      setError(err.message || 'Failed to get camera/mic access')
      setPhase('lobby')
    }
  }

  function createPeerConnection(socket, peerId, isInitiator) {
    // Clean up previous connection if any
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }

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

    // (#8) Clear existing remote audio tracks in-place to keep external refs valid
    remoteAudioStreamRef.current.getTracks().forEach(t => remoteAudioStreamRef.current.removeTrack(t))

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
      const state = pc.connectionState
      console.log(`[WebRTC] connectionState: ${state}`)

      if (state === 'connected') {
        setPeerConnected(true)
        iceRestartAttemptsRef.current = 0
        if (iceRestartTimerRef.current) { clearTimeout(iceRestartTimerRef.current); iceRestartTimerRef.current = null }
      } else if (state === 'disconnected') {
        // Temporary disruption — attempt ICE restart after a short delay
        // (connectionState can briefly go to 'disconnected' during network changes)
        console.log('[WebRTC] Disconnected, scheduling ICE restart...')
        if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current)
        iceRestartTimerRef.current = setTimeout(() => {
          if (pcRef.current?.connectionState === 'disconnected') {
            attemptIceRestart()
          }
        }, ICE_RESTART_DELAY_MS)
      } else if (state === 'failed') {
        // ICE has completely failed — try restart immediately
        console.log('[WebRTC] Failed, attempting ICE restart...')
        attemptIceRestart()
      } else if (state === 'closed') {
        setPeerConnected(false)
      }
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] iceConnectionState: ${pc.iceConnectionState}`)
    }

    if (isInitiator) {
      // (#6) Await setLocalDescription before emitting; add catch for silent failures
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer).then(() => {
          socket.emit('signal', { to: peerId, data: offer })
        }))
        .catch(err => console.error('[WebRTC] createOffer/setLocalDescription failed:', err))
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
    navigate('/meet') // (#10) Use React Router navigate instead of window.location.href
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
