import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaMusic, FaPlay, FaPause, FaPhone, FaCopy, FaCheck, FaSignInAlt } from 'react-icons/fa'

const SIGNAL_URL = window.location.origin
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
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

  // Music state
  const [musicFile, setMusicFile] = useState(null)
  const [musicName, setMusicName] = useState('')
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [musicTime, setMusicTime] = useState(0)
  const [musicDuration, setMusicDuration] = useState(0)
  const [isMusicHost, setIsMusicHost] = useState(false)

  // Refs
  const socketRef = useRef(null)
  const pcRef = useRef(null)
  const peerIdRef = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const localStreamRef = useRef(null)
  const localStreamIdRef = useRef(null)
  const musicSourceRef = useRef(null)
  const audioCtxRef = useRef(null)
  const musicBufferRef = useRef(null)
  const musicStartTimeRef = useRef(0)
  const musicOffsetRef = useRef(0)
  const gainNodeRef = useRef(null)
  const musicStreamDestRef = useRef(null)
  const animFrameRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const remoteDescSetRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
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
        if (audioCtxRef.current && musicPlaying) {
          const elapsed = audioCtxRef.current.currentTime - musicStartTimeRef.current + musicOffsetRef.current
          setMusicTime(Math.min(elapsed, musicDuration))
        }
        animFrameRef.current = requestAnimationFrame(update)
      }
      animFrameRef.current = requestAnimationFrame(update)
      return () => cancelAnimationFrame(animFrameRef.current)
    }
  }, [musicPlaying, isMusicHost, musicDuration])

  function cleanup() {
    cancelAnimationFrame(animFrameRef.current)
    if (musicSourceRef.current) { try { musicSourceRef.current.stop() } catch {} }
    if (audioCtxRef.current) { audioCtxRef.current.close() }
    if (pcRef.current) { pcRef.current.close() }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()) }
    if (socketRef.current) { socketRef.current.disconnect() }
  }

  async function initConnection(mode, targetRoomId) {
    setError('')
    try {
      const io = await loadSocketIO()
      const socket = io(SIGNAL_URL, { path: '/socket.io/', transports: ['websocket', 'polling'] })
      socketRef.current = socket

      // Register all socket event handlers BEFORE any async calls
      // to avoid missing events that fire while awaiting getUserMedia
      function onSocketReady() {
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
      }

      // Handle connect - either already connected or wait for event
      if (socket.connected) {
        onSocketReady()
      } else {
        socket.on('connect', onSocketReady)
      }

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

      // Get local media (after event handlers are set up)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      socket.on('peer-left', () => {
        setPeerConnected(false)
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
        remoteDescSetRef.current = false
        pendingCandidatesRef.current = []
      })

      socket.on('music-sync', (msg) => {
        handleMusicSync(msg)
      })

      socket.on('connect_error', () => {
        setError('Cannot connect to signal server')
        setPhase('lobby')
      })

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

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current)
      })
    }

    // Add music stream if active
    if (musicStreamDestRef.current) {
      musicStreamDestRef.current.stream.getTracks().forEach(track => {
        pc.addTrack(track, musicStreamDestRef.current.stream)
      })
    }

    // Route incoming tracks: camera/mic → video element, music → audio element
    pc.ontrack = (e) => {
      const stream = e.streams[0]
      if (!stream) return
      // If stream has a video track, it's the camera stream
      if (stream.getVideoTracks().length > 0) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
      } else {
        // Audio-only stream = music
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream
          remoteAudioRef.current.play().catch(() => {})
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

  // Music handling
  async function handleMusicFile(e) {
    const file = e.target.files[0]
    if (!file) return

    setIsMusicHost(true)
    setMusicName(file.name)
    setMusicFile(file)

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx

    const arrayBuf = await file.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(arrayBuf)
    musicBufferRef.current = audioBuffer
    setMusicDuration(audioBuffer.duration)

    // Create stream destination for sharing via WebRTC
    const dest = ctx.createMediaStreamDestination()
    musicStreamDestRef.current = dest
    const gain = ctx.createGain()
    gain.connect(dest)
    gain.connect(ctx.destination) // local playback
    gainNodeRef.current = gain

    // Notify peer about the music file name
    if (socketRef.current) {
      socketRef.current.emit('music-sync', { type: 'load', name: file.name, duration: audioBuffer.duration })
    }

    // Add music track to existing peer connection
    if (pcRef.current) {
      dest.stream.getTracks().forEach(track => {
        pcRef.current.addTrack(track, dest.stream)
      })
      // Renegotiate
      renegotiate()
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

  function toggleMusic() {
    if (!musicBufferRef.current || !audioCtxRef.current) return
    const ctx = audioCtxRef.current

    if (musicPlaying) {
      // Pause
      if (musicSourceRef.current) {
        musicSourceRef.current.stop()
        musicSourceRef.current = null
      }
      const elapsed = ctx.currentTime - musicStartTimeRef.current + musicOffsetRef.current
      musicOffsetRef.current = elapsed
      setMusicPlaying(false)

      if (socketRef.current) {
        socketRef.current.emit('music-sync', { type: 'pause', time: elapsed })
      }
    } else {
      // Play
      const source = ctx.createBufferSource()
      source.buffer = musicBufferRef.current
      source.connect(gainNodeRef.current)
      source.start(0, musicOffsetRef.current)
      musicSourceRef.current = source
      musicStartTimeRef.current = ctx.currentTime
      setMusicPlaying(true)

      source.onended = () => {
        if (musicPlaying) {
          setMusicPlaying(false)
          musicOffsetRef.current = 0
          setMusicTime(0)
          if (socketRef.current) {
            socketRef.current.emit('music-sync', { type: 'stop' })
          }
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
      musicSourceRef.current.stop()
      const source = audioCtxRef.current.createBufferSource()
      source.buffer = musicBufferRef.current
      source.connect(gainNodeRef.current)
      source.start(0, seekTo)
      musicSourceRef.current = source
      musicStartTimeRef.current = audioCtxRef.current.currentTime
      musicOffsetRef.current = seekTo
    } else {
      musicOffsetRef.current = seekTo
      setMusicTime(seekTo)
    }

    if (socketRef.current) {
      socketRef.current.emit('music-sync', { type: 'seek', time: seekTo, playing: musicPlaying })
    }
  }

  function handleMusicSync(msg) {
    switch (msg.type) {
      case 'load':
        setMusicName(msg.name)
        setMusicDuration(msg.duration)
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
    }
  }

  function toggleVideo() {
    if (localStreamRef.current) {
      const vTrack = localStreamRef.current.getVideoTracks()[0]
      if (vTrack) {
        vTrack.enabled = !vTrack.enabled
        setVideoEnabled(vTrack.enabled)
      }
    }
  }

  function toggleAudio() {
    if (localStreamRef.current) {
      const aTrack = localStreamRef.current.getAudioTracks()[0]
      if (aTrack) {
        aTrack.enabled = !aTrack.enabled
        setAudioEnabled(aTrack.enabled)
      }
    }
  }

  function hangUp() {
    cleanup()
    window.location.href = '/meet'
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatTime(sec) {
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
            {/* Create Meeting */}
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

            {/* Join Meeting */}
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

  // Meeting view
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

      {/* Video area */}
      <div className="flex-1 flex items-center justify-center gap-4 p-4 min-h-0">
        {/* Remote (large) */}
        <div className="flex-1 h-full relative rounded-2xl overflow-hidden bg-gray-800 flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!peerConnected && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500 text-lg">Waiting for peer to join...</p>
            </div>
          )}
        </div>

        {/* Local (small pip) */}
        <div className="absolute bottom-32 right-6 w-48 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
        </div>
      </div>

      {/* Music bar */}
      <div className="px-4 py-2 bg-gray-800/80 backdrop-blur border-t border-gray-700">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <FaMusic className="text-gray-400 flex-shrink-0" />

          {isMusicHost ? (
            <>
              {!musicFile ? (
                <label className="cursor-pointer px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors">
                  Load Music
                  <input type="file" accept="audio/*" onChange={handleMusicFile} className="hidden" />
                </label>
              ) : (
                <>
                  <button onClick={toggleMusic} className="p-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors flex-shrink-0">
                    {musicPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
                  </button>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(musicTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group" onClick={seekMusic}>
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${musicDuration ? (musicTime / musicDuration) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(musicDuration)}</span>
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={musicName}>{musicName}</span>
                </>
              )}
            </>
          ) : (
            <>
              {musicName ? (
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
                </>
              ) : (
                <span className="text-xs text-gray-500">Peer can load music to listen together</span>
              )}
            </>
          )}

          {/* Either user can load music */}
          {!isMusicHost && !musicName && (
            <label className="cursor-pointer px-4 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 transition-colors ml-auto">
              Load Music
              <input type="file" accept="audio/*" onChange={handleMusicFile} className="hidden" />
            </label>
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
        <button
          onClick={hangUp}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
        >
          <FaPhone size={18} className="rotate-[135deg]" />
        </button>
      </div>

      {/* Hidden audio element for remote music stream */}
      <audio ref={remoteAudioRef} autoPlay />

      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  )
}
