import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash,
  FaMusic, FaPlay, FaPause, FaPhone, FaCopy, FaCheck, FaSignInAlt,
  FaStepBackward, FaStepForward, FaListUl, FaSave, FaTrash,
  FaPlus, FaTimes, FaCircle, FaStop, FaEdit, FaHistory, FaDesktop,
  FaVolumeUp, FaVolumeMute,
} from 'react-icons/fa'
import { FaYoutube } from 'react-icons/fa'
import {
  useMeetConnection,
  useMusicPlayer,
  useYouTubePlayer,
  useMeetRecording,
  usePiP,
  COPY_FEEDBACK_TIMEOUT,
} from '../hooks/meet'

export default function MeetPage() {
  const { id: urlRoomId } = useParams()

  // UI state
  const [joinInput, setJoinInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false)
  const [activeTab, setActiveTab] = useState('local')
  const [videoResolution, setVideoResolution] = useState('fhd')
  const [showHangUpDialog, setShowHangUpDialog] = useState(false)

  // ─── Music sync handler (needs to be defined before hooks that use it) ───
  const handleMusicSyncRef = useRef(null) // Must be useRef, not a plain object literal
  const onMusicSync = useCallback((msg) => {
    handleMusicSyncRef.current?.(msg)
  }, [])

  // ─── Hooks ───────────────────────────────────────────────────────────────
  const connection = useMeetConnection({ urlRoomId, videoResolution, onMusicSync })
  const {
    phase, setPhase, roomId, error, setError, peerConnected,
    videoEnabled, audioEnabled, speakerEnabled, audioBlocked, isScreenSharing,
    user, userRole,
    socketRef, pcRef, localVideoRef, remoteVideoRef, remoteAudioStreamRef,
    localStreamRef, musicStreamDestRef,
    initConnection, renegotiate, cleanup,
    toggleVideo, toggleAudio, toggleSpeaker, toggleScreenShare,
    rebindLocalVideo, rebindRemoteVideo,
    unlockAudio, hangUp,
  } = connection

  const youtube = useYouTubePlayer({
    socketRef, user,
    pauseMusic: () => music.pauseMusic(),
    setActiveTab,
  })

  const music = useMusicPlayer({
    socketRef, pcRef, musicStreamDestRef, user, renegotiate,
    ytMode: youtube.ytMode, stopYouTube: youtube.stopYouTube, setActiveTab,
    speakerEnabled,
  })

  const recording = useMeetRecording({ user, roomId, localStreamRef, remoteAudioStreamRef })

  const pip = usePiP({ ytMode: youtube.ytMode })

  // Re-bind video srcObject after PiP restore (browsers may drop playback on tiny elements)
  useEffect(() => {
    if (!pip.localPipMin && phase === 'connected') rebindLocalVideo()
  }, [pip.localPipMin, phase])

  useEffect(() => {
    if (!pip.remotePipMin && phase === 'connected') rebindRemoteVideo()
  }, [pip.remotePipMin, phase])

  // Wire up music sync handler
  handleMusicSyncRef.current = (msg) => {
    // YouTube-related messages
    if (msg.type === 'youtube-load' || msg.type === 'yt-state' || msg.type === 'yt-stop') {
      youtube.handlePeerYtSync(msg)
    } else {
      music.handlePeerMusicSync(msg)
    }
  }

  // Tab switching logic
  function switchTab(tab) {
    if (tab === activeTab) return
    if (tab === 'local') {
      if (youtube.ytMode) youtube.stopYouTube()
    } else {
      music.pauseMusic()
    }
    setActiveTab(tab)
  }

  function copyRoomId() {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), COPY_FEEDBACK_TIMEOUT)
  }

  function formatTime(sec) {
    if (!sec || sec < 0) return '0:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function requestHangUp() {
    setShowHangUpDialog(true)
  }

  async function confirmHangUp() {
    setShowHangUpDialog(false)
    if (recording.isRecording) await recording.stopRecording()
    hangUp()
  }

  // ==================== RENDER ====================

  // Lobby view
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
        </div>
        <div className="w-full max-w-lg relative z-10">
          {user && (
            <div className="mb-6 p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-soft-lg transform hover:scale-[1.02] transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                  <span className="text-lg font-semibold text-white">{user.email?.charAt(0).toUpperCase() || '?'}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{user.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${userRole === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                      {userRole === 'admin' ? '👑 管理员' : '👤 普通用户'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-600 mb-6 shadow-2xl transform hover:rotate-6 transition-transform duration-300 float-container">
              <FaVideo className="text-3xl text-white" />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-3 tracking-tight">
              Quick <span className="gradient-text">Meet</span>
            </h1>
            <p className="text-lg text-gray-600 font-medium">
              {user && userRole === 'admin' ? '创建或加入会议，开启高效协作' : '输入会议 ID，即刻开始连接'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 shadow-soft animate-shake">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-xs">!</span></div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {user && userRole === 'admin' && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/40 shadow-soft-lg transform hover:scale-[1.01] transition-all duration-300">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  视频分辨率
                </label>
                <select value={videoResolution} onChange={(e) => setVideoResolution(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none transition-all duration-200 bg-white font-medium text-gray-900">
                  <option value="sd">📺 标清 - 640×480</option>
                  <option value="hd">🎬 高清 - 1280×720</option>
                  <option value="fhd">✨ 全高清 - 1920×1080 (推荐)</option>
                </select>
              </div>
            )}

            <button
              onClick={() => { setPhase('joining'); initConnection('create') }}
              className="group w-full relative overflow-hidden px-8 py-5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold text-lg shadow-2xl hover:shadow-glow transform hover:scale-[1.02] transition-all duration-300"
              title={!user ? '需要登录' : userRole !== 'admin' ? '仅管理员可创建' : ''}
              disabled={!user || userRole !== 'admin'}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
              <div className="relative flex items-center justify-center gap-3">
                <FaVideo className="text-xl" />
                <span>{!user ? '🔐 创建会议 (需登录)' : userRole !== 'admin' ? '🔒 创建会议 (仅管理员)' : '✨ 创建新会议'}</span>
              </div>
            </button>

            <div className="relative flex items-center py-4">
              <div className="flex-1 border-t-2 border-gray-200" />
              <span className="px-4 text-sm font-medium text-gray-400 bg-transparent">或使用会议 ID</span>
              <div className="flex-1 border-t-2 border-gray-200" />
            </div>

            <div className="flex gap-3">
              <input type="text" value={joinInput} onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter' && joinInput.trim()) { setPhase('joining'); initConnection('join', joinInput.trim()) } }}
                placeholder="输入 8 位会议 ID" className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-primary-400 focus:ring-4 focus:ring-primary-100 outline-none text-xl tracking-[0.3em] font-mono text-center uppercase bg-white/80 backdrop-blur-sm shadow-soft transition-all duration-200 font-bold" maxLength={8}
              />
              <button onClick={() => { if (joinInput.trim()) { setPhase('joining'); initConnection('join', joinInput.trim()) } }} disabled={!joinInput.trim()}
                className="px-6 py-4 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                <FaSignInAlt className="text-xl" />
              </button>
            </div>

            {!user && (
              <div className="text-center pt-6 mt-6 border-t-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-3 font-medium">💼 需要创建会议？</p>
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-semibold link-underline transition-colors">
                  立即登录或注册
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Connecting view
  if (phase === 'joining') {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '3s' }} />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '1s' }} />
        </div>
        <div className="text-center relative z-10 max-w-md">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-8 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-2xl">
                <FaVideo className="text-white text-2xl animate-pulse" />
              </div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">正在连接...</h2>
          <p className="text-lg text-gray-600 mb-8 font-medium">正在建立安全连接，请稍候</p>
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((i) => (<div key={i} className="w-3 h-3 rounded-full bg-primary-400 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />))}
          </div>
          {error && (
            <div className="p-4 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200/50 shadow-soft-lg">
              <div className="flex items-center gap-3 text-red-700">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"><span className="text-white text-sm font-bold">!</span></div>
                <p className="text-sm font-medium text-left">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Meeting view ─────────────────────────────────────────────────────────
  const { ytMode, ytContainerRef, isYtHost, ytPlaying, ytTime, ytDuration, ytVideoTitle,
    ytPlaylistItems, ytCurrentIndex, ytPlaybackRate, ytManagedItems, ytManagedPlayingIdxRef,
    ytUrl, setYtUrl, ytLoading, savedYtPlaylists, ytPlaylistName, setYtPlaylistName, savingYtPlaylist,
  } = youtube

  return (
    <div className="meet-bg-dark flex flex-col relative overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-3 meet-control-panel shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">会议 ID</span>
            <code className="text-sm font-mono tracking-[0.2em] text-white font-bold">{roomId}</code>
            <button onClick={copyRoomId} className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-all duration-200 text-slate-400 hover:text-white transform hover:scale-110" title="复制会议 ID">
              {copied ? <FaCheck className="text-green-400 animate-pulse" /> : <FaCopy className="text-sm" />}
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className={`w-2.5 h-2.5 rounded-full ${peerConnected ? 'bg-green-400 animate-pulse-ring' : 'bg-yellow-400 animate-pulse'}`} />
            <span className="text-sm text-slate-300 font-medium">{peerConnected ? '✅ 已连接' : '⏳ 等待对方...'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!urlRoomId && user && recording.recordings.length > 0 && (
            <button onClick={() => { recording.setShowRecordings(true); recording.fetchRecordings() }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-700/50 text-slate-400 hover:text-white transition-all duration-200 border border-transparent hover:border-slate-700/50" title="历史录制">
              <FaHistory className="text-sm" /><span className="text-sm font-semibold">{recording.recordings.length}</span><span className="text-xs">录制</span>
            </button>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <span className="text-xs text-slate-400 font-medium">{videoResolution === 'fhd' ? '📺 1080p' : videoResolution === 'hd' ? '📺 720p' : '📺 480p'}</span>
          </div>
        </div>
      </div>

      {/* Audio blocked banner */}
      {audioBlocked && peerConnected && (
        <button onClick={unlockAudio} className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors">
          <FaMicrophone size={14} /> Click here to enable audio
        </button>
      )}

      {/* Video area + Playlist panel */}
      <div className="flex-1 flex min-h-0 relative z-0">
        <div ref={pip.mainVideoAreaRef} className="flex-1 flex items-center justify-center p-6 relative">
          {/* Remote Video */}
          <div
            className={ytMode ? `rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-600/50 meet-video-container group ${pip.remotePipMin ? 'cursor-pointer' : ''}` : 'flex-1 h-full relative rounded-3xl overflow-hidden meet-video-container shadow-2xl border border-slate-700/30'}
            style={ytMode ? pip.getPipStyle('remote') : undefined}
            onPointerDown={ytMode ? (e) => pip.onPipPointerDown(e, 'remote') : undefined}
          >
            {ytMode && pip.remotePipMin && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800 rounded-2xl px-3"><span className="text-xs text-white font-semibold truncate">对方</span></div>
            )}
            <video ref={remoteVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!peerConnected && !ytMode && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm">
                <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 animate-pulse"><FaVideo className="text-3xl text-slate-400" /></div>
                <p className="text-slate-300 text-xl font-semibold mb-2">等待对方加入...</p>
                <p className="text-slate-500 text-sm">分享会议 ID 邀请参与者</p>
              </div>
            )}
            {ytMode && !pip.remotePipMin && <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/80 to-transparent"><span className="text-xs text-white font-semibold">对方</span></div>}
            {ytMode && !pip.remotePipMin && (
              <button className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded bg-black/60 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); pip.setRemotePipMin(true) }} onPointerDown={(e) => e.stopPropagation()} title="最小化">−</button>
            )}
            {ytMode && !pip.remotePipMin && (
              <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => pip.onResizePointerDown(e, 'remote')}>
                <svg viewBox="0 0 16 16" className="w-full h-full text-white/70"><path d="M14 14L8 14L14 8Z" fill="currentColor" /></svg>
              </div>
            )}
            {!ytMode && <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none" />}
          </div>

          {/* YouTube player */}
          <div ref={ytContainerRef} className={ytMode ? 'absolute inset-6 z-10 bg-black rounded-3xl overflow-hidden shadow-2xl' : 'hidden'} style={!isYtHost ? { pointerEvents: 'none' } : undefined}>
            <div id="yt-player-embed"></div>
          </div>

          {/* Local Video PiP */}
          <div className={`rounded-2xl overflow-hidden shadow-2xl group ${pip.localPipMin ? 'cursor-pointer' : ''} ${isScreenSharing ? 'border-2 border-primary-500/80 shadow-primary-500/30' : 'border-2 border-slate-600/50'}`}
            style={pip.getPipStyle('local')} onPointerDown={(e) => pip.onPipPointerDown(e, 'local')}>
            {pip.localPipMin && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-800 rounded-2xl px-3"><span className="text-xs text-white font-semibold truncate">{isScreenSharing ? '屏幕' : '你'}</span></div>
            )}
            <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isScreenSharing ? '' : 'mirror'}`} />
            {!pip.localPipMin && (
              <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white font-semibold">{isScreenSharing ? '你的屏幕' : '你'}</span>
                  {isScreenSharing && <span className="flex items-center gap-1 text-xs text-green-400 font-semibold"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />共享中</span>}
                </div>
              </div>
            )}
            {!pip.localPipMin && (
              <button className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded bg-black/60 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); pip.setLocalPipMin(true) }} onPointerDown={(e) => e.stopPropagation()} title="最小化">−</button>
            )}
            {!pip.localPipMin && (
              <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => pip.onResizePointerDown(e, 'local')}>
                <svg viewBox="0 0 16 16" className="w-full h-full text-white/70"><path d="M14 14L8 14L14 8Z" fill="currentColor" /></svg>
              </div>
            )}
            {!pip.localPipMin && (
              <div className={`absolute inset-0 ring-2 transition-all duration-300 rounded-2xl pointer-events-none ${isScreenSharing ? 'ring-primary-500/50 group-hover:ring-primary-500/80' : 'ring-primary-500/0 group-hover:ring-primary-500/50'}`} />
            )}
          </div>
        </div>

        {/* Playlist side panel */}
        {showPlaylistPanel && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <div className="flex gap-1">
                <button onClick={() => switchTab('local')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'local' ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                  <FaMusic size={10} /> Local Music
                </button>
                <button onClick={() => switchTab('youtube')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'youtube' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                  <FaYoutube size={10} /> YouTube
                </button>
              </div>
              <button onClick={() => setShowPlaylistPanel(false)} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"><FaTimes size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'local' ? (
                <>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Now Playing</p>
                    {music.playlist.length === 0 ? <p className="text-xs text-gray-500">No tracks loaded</p> : (
                      <div className="space-y-1">
                        {music.playlist.map((track, i) => (
                          <div key={`${track.name}-${i}`} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${i === music.currentTrackIndex ? 'bg-primary-600/20 text-primary-300' : 'text-gray-300 hover:bg-gray-700/50'}`}
                            onClick={() => music.isMusicHost && track.buffer && music.playTrackAtIndex(i)}>
                            <span className="text-xs w-5 text-right flex-shrink-0">
                              {i === music.currentTrackIndex && music.musicPlaying ? <span className="text-primary-400">&#9654;</span> : <span className="text-gray-500">{i + 1}.</span>}
                            </span>
                            <span className={`text-xs truncate flex-1 ${!track.buffer ? 'italic text-gray-500' : ''}`}>{track.name}{!track.buffer && ' (missing)'}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">{formatTime(track.duration)}</span>
                            {music.isMusicHost && (
                              <button onClick={(e) => { e.stopPropagation(); music.removeTrack(i) }} className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-opacity"><FaTimes size={10} /></button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="mt-2 flex items-center gap-1.5 cursor-pointer text-xs text-primary-400 hover:text-primary-300 transition-colors">
                      <FaPlus size={10} /> Add more songs
                      <input ref={music.addMoreInputRef} type="file" accept="audio/*" multiple onChange={music.handleMusicFiles} className="hidden" />
                    </label>
                  </div>
                  <div className="border-t border-gray-700 p-3">
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Saved Playlists{!user && <span className="ml-1 text-gray-500 normal-case">(login required)</span>}</p>
                    {user && music.playlist.length > 0 && (
                      <div className="flex gap-1.5 mb-3">
                        <input type="text" value={music.playlistName} onChange={(e) => music.setPlaylistName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && music.handleSavePlaylist()}
                          placeholder="Playlist name..." className="flex-1 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-xs text-gray-200 outline-none focus:border-primary-500" />
                        <button onClick={music.handleSavePlaylist} disabled={!music.playlistName.trim() || music.savingPlaylist}
                          className="px-2 py-1 rounded bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 text-white text-xs transition-colors"><FaSave size={12} /></button>
                      </div>
                    )}
                    {user ? (music.savedPlaylists.length === 0 ? <p className="text-xs text-gray-500">No saved playlists yet</p> : (
                      <div className="space-y-1.5">
                        {music.savedPlaylists.map(pl => (
                          <div key={pl.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-700/40 group">
                            <FaMusic className="text-gray-500 flex-shrink-0" size={10} />
                            <div className="flex-1 min-w-0"><p className="text-xs text-gray-200 truncate">{pl.name}</p><p className="text-[10px] text-gray-500">{pl.songs.length} songs</p></div>
                            <button onClick={() => music.handleLoadPlaylist(pl)} className="px-2 py-0.5 rounded text-[10px] bg-gray-600 hover:bg-gray-500 text-gray-200 transition-colors">Load</button>
                            <button onClick={() => music.handleDeletePlaylist(pl.id)} className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-opacity"><FaTrash size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )) : <a href="/login" className="text-xs text-primary-400 hover:text-primary-300 underline">Log in to save playlists</a>}
                  </div>
                </>
              ) : (
                <>
                  {ytMode && (
                    <div className="p-3">
                      <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Now Playing</p>
                      {ytPlaylistItems.length > 1 ? (
                        <div className="space-y-1">
                          {ytPlaylistItems.map((track, i) => (
                            <div key={`ytp-${track.videoId}-${i}`} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${i === ytCurrentIndex ? 'bg-red-500/20 text-red-300' : 'text-gray-300 hover:bg-gray-700/50'}`}
                              onClick={() => isYtHost && youtube.ytPlayAt(i)}>
                              <span className="text-xs w-5 text-right flex-shrink-0">{i === ytCurrentIndex && ytPlaying ? <span className="text-red-400">&#9654;</span> : <span className="text-gray-500">{i + 1}.</span>}</span>
                              <span className="text-xs truncate flex-1">{track.title}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                          <FaYoutube className="text-red-500 flex-shrink-0" size={14} />
                          <p className="text-xs text-gray-200 truncate flex-1">{ytVideoTitle || 'Loading...'}</p>
                        </div>
                      )}
                      {isYtHost && <button onClick={youtube.stopYouTube} className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"><FaStop size={9} /> Stop YouTube</button>}
                    </div>
                  )}
                  <div className={`p-3 ${ytMode ? 'border-t border-gray-700' : ''}`}>
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Playlist</p>
                    {ytManagedItems.length === 0 ? <p className="text-xs text-gray-500">No YouTube items added</p> : (
                      <div className="space-y-1 mb-3">
                        {ytManagedItems.map((item, i) => (
                          <div key={`yt-${item.videoId}-${i}`} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors ${ytManagedPlayingIdxRef.current === i && ytMode ? 'bg-red-500/20 text-red-300' : 'text-gray-300 hover:bg-gray-700/50'}`}
                            onClick={() => youtube.playYtItem(i)}>
                            <span className="text-xs w-5 text-right flex-shrink-0">{ytManagedPlayingIdxRef.current === i && ytMode && ytPlaying ? <span className="text-red-400">&#9654;</span> : <span className="text-gray-500">{i + 1}.</span>}</span>
                            <span className="text-xs truncate flex-1">{item.title}</span>
                            <button onClick={(e) => { e.stopPropagation(); youtube.removeYtItem(i) }} className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-opacity"><FaTimes size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <input type="text" value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ytUrl.trim()) { const err = youtube.addYtItem(ytUrl.trim()); if (err) setError(err) } }}
                        placeholder="Paste YouTube URL..." className="flex-1 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-xs text-gray-200 outline-none focus:border-red-500/50 placeholder-gray-500" />
                      <button onClick={() => { if (ytUrl.trim()) { const err = youtube.addYtItem(ytUrl.trim()); if (err) setError(err) } }} disabled={!ytUrl.trim()}
                        className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white text-xs transition-colors"><FaPlus size={10} /></button>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 p-3">
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Saved Playlists{!user && <span className="ml-1 text-gray-500 normal-case">(login required)</span>}</p>
                    {user && ytManagedItems.length > 0 && (
                      <div className="flex gap-1.5 mb-3">
                        <input type="text" value={ytPlaylistName} onChange={(e) => setYtPlaylistName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && youtube.handleSaveYtPlaylist()}
                          placeholder="Playlist name..." className="flex-1 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-xs text-gray-200 outline-none focus:border-red-500" />
                        <button onClick={youtube.handleSaveYtPlaylist} disabled={!ytPlaylistName.trim() || savingYtPlaylist}
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white text-xs transition-colors"><FaSave size={12} /></button>
                      </div>
                    )}
                    {user ? (savedYtPlaylists.length === 0 ? <p className="text-xs text-gray-500">No saved playlists yet</p> : (
                      <div className="space-y-1.5">
                        {savedYtPlaylists.map(pl => (
                          <div key={pl.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-700/40 group">
                            <FaYoutube className="text-red-500 flex-shrink-0" size={10} />
                            <div className="flex-1 min-w-0"><p className="text-xs text-gray-200 truncate">{pl.name}</p><p className="text-[10px] text-gray-500">{pl.songs.length} items</p></div>
                            <button onClick={() => youtube.handleLoadYtPlaylist(pl)} className="px-2 py-0.5 rounded text-[10px] bg-gray-600 hover:bg-gray-500 text-gray-200 transition-colors">Load</button>
                            <button onClick={() => youtube.handleDeleteYtPlaylist(pl.id)} className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 text-gray-500 transition-opacity"><FaTrash size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )) : <a href="/login" className="text-xs text-primary-400 hover:text-primary-300 underline">Log in to save playlists</a>}
                  </div>
                </>
              )}
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
                  <button onClick={youtube.ytPrevTrack} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:text-gray-600 transition-colors flex-shrink-0"><FaStepBackward size={11} /></button>
                  <button onClick={youtube.toggleYtPlayback} className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors flex-shrink-0">{ytPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}</button>
                  <button onClick={youtube.ytNextTrack} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:text-gray-600 transition-colors flex-shrink-0"><FaStepForward size={11} /></button>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(ytTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group" onClick={youtube.seekYt}>
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${ytDuration ? (ytTime / ytDuration) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(ytDuration)}</span>
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={ytVideoTitle}>{ytVideoTitle || 'YouTube'}</span>
                  {ytPlaylistItems.length > 1 && <span className="text-[10px] text-gray-500 flex-shrink-0">{ytCurrentIndex + 1}/{ytPlaylistItems.length}</span>}
                  <button onClick={youtube.cycleYtSpeed} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors flex-shrink-0" title="Playback speed">{ytPlaybackRate}x</button>
                  <button onClick={youtube.stopYouTube} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors flex-shrink-0" title="Stop YouTube"><FaStop size={11} /></button>
                </>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ytPlaying ? 'bg-red-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(ytTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full relative"><div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${ytDuration ? (ytTime / ytDuration) * 100 : 0}%` }} /></div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(ytDuration)}</span>
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={ytVideoTitle}>{ytVideoTitle || 'YouTube'}</span>
                  {ytPlaybackRate !== 1 && <span className="text-[10px] text-gray-500 flex-shrink-0">{ytPlaybackRate}x</span>}
                </>
              )}
            </>
          ) : (
            <>
              <FaMusic className="text-gray-400 flex-shrink-0" />
              {music.isMusicHost && music.playlist.length > 0 ? (
                <>
                  <button onClick={music.prevTrack} disabled={music.currentTrackIndex <= 0 && music.musicTime <= 3} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:text-gray-600 transition-colors flex-shrink-0"><FaStepBackward size={11} /></button>
                  <button onClick={music.toggleMusic} className="p-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors flex-shrink-0">{music.musicPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}</button>
                  <button onClick={music.nextTrack} disabled={music.currentTrackIndex >= music.playlist.length - 1} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white disabled:text-gray-600 transition-colors flex-shrink-0"><FaStepForward size={11} /></button>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(music.musicTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full cursor-pointer relative group" onClick={music.seekMusic}>
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${music.musicDuration ? (music.musicTime / music.musicDuration) * 100 : 0}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(music.musicDuration)}</span>
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={music.musicName}>{music.musicName}</span>
                  {music.playlist.length > 1 && <span className="text-[10px] text-gray-500 flex-shrink-0">{music.currentTrackIndex + 1}/{music.playlist.length}</span>}
                </>
              ) : !music.isMusicHost && music.playlist.length > 0 ? (
                <>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${music.musicPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10 text-right">{formatTime(music.musicTime)}</span>
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full relative"><div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${music.musicDuration ? (music.musicTime / music.musicDuration) * 100 : 0}%` }} /></div>
                  <span className="text-xs text-gray-400 flex-shrink-0 w-10">{formatTime(music.musicDuration)}</span>
                  <span className="text-xs text-gray-300 truncate max-w-[120px]" title={music.musicName}>{music.musicName}</span>
                  {music.playlist.length > 1 && <span className="text-[10px] text-gray-500 flex-shrink-0">{music.currentTrackIndex + 1}/{music.playlist.length}</span>}
                </>
              ) : (
                <span className="flex-1 text-center text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition-colors" onClick={() => setShowPlaylistPanel(true)}>Click to load music or YouTube</span>
              )}
            </>
          )}
          <button onClick={() => setShowPlaylistPanel(p => !p)} className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${showPlaylistPanel ? 'bg-primary-600 text-white' : 'hover:bg-gray-700 text-gray-400 hover:text-white'}`} title="Playlist"><FaListUl size={13} /></button>
        </div>
      </div>

      {/* Control Panel */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-6 py-5 meet-control-panel shadow-2xl">
        <div className="flex items-center gap-3">
          <button onClick={toggleAudio} className={`group relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-110 ${audioEnabled ? 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg hover:shadow-xl' : 'bg-red-500/90 hover:bg-red-600/90 text-white shadow-lg shadow-red-500/30'}`} title={audioEnabled ? '静音' : '取消静音'}>
            {audioEnabled ? <FaMicrophone size={20} /> : <FaMicrophoneSlash size={20} />}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{audioEnabled ? '静音' : '取消静音'}</span>
          </button>
          <button onClick={toggleSpeaker} className={`group relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-110 ${speakerEnabled ? 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg hover:shadow-xl' : 'bg-red-500/90 hover:bg-red-600/90 text-white shadow-lg shadow-red-500/30'}`} title={speakerEnabled ? '静音扬声器' : '开启扬声器'}>
            {speakerEnabled ? <FaVolumeUp size={20} /> : <FaVolumeMute size={20} />}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{speakerEnabled ? '静音扬声器' : '开启扬声器'}</span>
          </button>
          <button onClick={toggleVideo} className={`group relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-110 ${videoEnabled ? 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg hover:shadow-xl' : 'bg-red-500/90 hover:bg-red-600/90 text-white shadow-lg shadow-red-500/30'}`} title={videoEnabled ? '关闭摄像头' : '打开摄像头'}>
            {videoEnabled ? <FaVideo size={20} /> : <FaVideoSlash size={20} />}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{videoEnabled ? '关闭摄像头' : '打开摄像头'}</span>
          </button>
          <button onClick={toggleScreenShare} className={`group relative p-5 rounded-2xl transition-all duration-300 transform hover:scale-110 ${isScreenSharing ? 'bg-primary-600/90 hover:bg-primary-700/90 text-white shadow-lg shadow-primary-500/30' : 'bg-slate-700/80 hover:bg-slate-600/80 text-white shadow-lg hover:shadow-xl'}`} title={isScreenSharing ? '停止共享' : '共享屏幕'}>
            <FaDesktop size={20} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{isScreenSharing ? '停止共享' : '共享屏幕'}</span>
            {isScreenSharing && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />}
          </button>

          <div className="w-px h-10 bg-slate-700/50 mx-2" />

          {/* Recording Controls */}
          {!urlRoomId && (
            <>
              {!recording.isRecording ? (
                <button onClick={recording.startRecording} disabled={!!recording.processingState && recording.processingState !== 'done' && recording.processingState !== 'error'}
                  className="group relative p-5 rounded-2xl bg-slate-700/80 hover:bg-slate-600/80 disabled:bg-slate-800/50 disabled:text-slate-600 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 disabled:transform-none" title="开始录制">
                  <FaCircle size={20} className="text-red-400" />
                  <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">开始录制</span>
                </button>
              ) : (
                <>
                  <button onClick={recording.toggleRecordingPause} className="group relative p-5 rounded-2xl bg-slate-700/80 hover:bg-slate-600/80 text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110" title={recording.isPaused ? '继续录制' : '暂停录制'}>
                    {recording.isPaused ? <FaPlay size={20} className="text-green-400" /> : <FaPause size={20} className="text-yellow-400" />}
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{recording.isPaused ? '继续录制' : '暂停录制'}</span>
                  </button>
                  <button onClick={recording.stopRecording} className="group relative p-5 rounded-2xl bg-red-600/90 hover:bg-red-700/90 text-white transition-all duration-300 shadow-lg shadow-red-600/30 hover:shadow-xl transform hover:scale-110" title="停止录制">
                    <FaStop size={20} />
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">停止录制</span>
                  </button>
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-900/60 border-2 border-red-700/50 shadow-lg">
                    <div className={`w-3 h-3 rounded-full bg-red-500 ${recording.isPaused ? '' : 'animate-pulse'}`} />
                    <span className="text-base font-mono font-bold text-white tabular-nums">{formatTime(recording.recordingTime)}</span>
                    {recording.isPaused && <span className="text-xs font-bold text-yellow-400 px-2 py-0.5 rounded-full bg-yellow-400/20">暂停</span>}
                  </div>
                </>
              )}
            </>
          )}

          {/* Processing Indicator */}
          {!urlRoomId && !recording.isRecording && recording.processingState && recording.processingState !== '' && (
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/60 backdrop-blur-sm border-2 border-white/10 shadow-lg">
              {recording.processingState === 'processing' && <><div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" /><span className="text-sm font-medium text-white">处理中...</span></>}
              {recording.processingState === 'done' && <><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-sm font-medium text-white">处理完成</span></>}
              {recording.processingState === 'error' && <><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-sm font-medium text-white">处理失败</span></>}
            </div>
          )}

          <div className="w-px h-10 bg-slate-700/50 mx-2" />

          <button onClick={requestHangUp} className="group relative p-5 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 shadow-lg shadow-red-500/40 hover:shadow-xl transform hover:scale-110" title="结束通话">
            <FaPhone size={20} className="rotate-[135deg]" />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg bg-black/90 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">结束通话</span>
          </button>
        </div>
      </div>

      {/* Error state modal */}
      {recording.processingState === 'error' && !recording.meetingSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-red-700/50">
            <h3 className="text-red-400 font-semibold mb-2">Processing Failed</h3>
            <p className="text-gray-300 text-sm mb-4">{recording.summaryError}</p>
            <button onClick={recording.dismissSummary} className="w-full px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-white transition-colors">Close</button>
          </div>
        </div>
      )}

      {/* Meeting summary overlay */}
      {recording.processingState === 'done' && recording.meetingSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-lg max-h-[80vh] shadow-2xl border border-gray-700 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              {recording.isEditing ? (
                <input value={recording.editForm.title} onChange={(e) => recording.setEditForm({ ...recording.editForm, title: e.target.value })}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white font-semibold text-lg outline-none focus:border-primary-500 mr-3" />
              ) : (
                <h3 className="text-white font-semibold text-lg flex-1 min-w-0 truncate">
                  {recording.meetingSummary?.status === 'processing' && <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />Processing...</span>}
                  {recording.meetingSummary?.status === 'error' && 'Error'}
                  {recording.meetingSummary?.status === 'done' && recording.meetingSummary.title}
                  {!recording.meetingSummary?.status && recording.meetingSummary?.title}
                </h3>
              )}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {!recording.isEditing && recording.meetingSummary?.status === 'done' && (
                  <>
                    <button onClick={recording.copySummaryText} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Copy as Markdown">
                      {recording.summaryCopied ? <FaCheck className="text-green-400" size={14} /> : <FaCopy size={14} />}
                    </button>
                    {recording.editingRecording && (
                      <>
                        <button onClick={recording.startEditing} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Edit"><FaEdit size={14} /></button>
                        <button onClick={recording.handleDeleteRecording} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors" title="Delete recording"><FaTrash size={14} /></button>
                      </>
                    )}
                  </>
                )}
                {recording.isEditing && (
                  <>
                    <button onClick={recording.saveRecordingEdit} disabled={recording.savingEdit}
                      className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 disabled:bg-gray-600 text-white text-sm font-medium transition-colors flex items-center gap-1.5">
                      <FaSave size={12} /> {recording.savingEdit ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => { recording.setEditForm(null) }} className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors">Cancel</button>
                  </>
                )}
                <button onClick={recording.dismissSummary} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><FaTimes size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {recording.meetingSummary?.status === 'processing' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
                  <p className="text-white font-medium">Processing recording...</p>
                  <p className="text-gray-400 text-sm mt-1">Transcribing and generating summary</p>
                  <button onClick={recording.dismissSummary} className="mt-4 px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors">Close (processing continues in background)</button>
                </div>
              )}
              {recording.meetingSummary?.status === 'error' && (
                <div className="py-8">
                  <h4 className="text-red-400 font-semibold mb-2">Processing Failed</h4>
                  <p className="text-gray-300 text-sm mb-4">{recording.meetingSummary.error || 'Unknown error'}</p>
                  {recording.editingRecording && <button onClick={recording.handleDeleteRecording} className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm transition-colors">Delete this recording</button>}
                </div>
              )}
              {recording.meetingSummary?.status === 'done' && recording.isEditing && (
                <>
                  <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Summary</label>
                    <textarea value={recording.editForm.summary} onChange={(e) => recording.setEditForm({ ...recording.editForm, summary: e.target.value })} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary-500 resize-none" /></div>
                  <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Key Points <span className="normal-case text-gray-500">(one per line)</span></label>
                    <textarea value={recording.editForm.keyPoints} onChange={(e) => recording.setEditForm({ ...recording.editForm, keyPoints: e.target.value })} rows={4} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary-500 resize-none" /></div>
                  <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Action Items <span className="normal-case text-gray-500">(one per line)</span></label>
                    <textarea value={recording.editForm.actionItems} onChange={(e) => recording.setEditForm({ ...recording.editForm, actionItems: e.target.value })} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary-500 resize-none" /></div>
                  <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Decisions <span className="normal-case text-gray-500">(one per line)</span></label>
                    <textarea value={recording.editForm.decisions} onChange={(e) => recording.setEditForm({ ...recording.editForm, decisions: e.target.value })} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-primary-500 resize-none" /></div>
                  <div><label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">Transcript</label>
                    <textarea value={recording.editForm.transcript} onChange={(e) => recording.setEditForm({ ...recording.editForm, transcript: e.target.value })} rows={6} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary-500 resize-none font-mono" /></div>
                </>
              )}
              {recording.meetingSummary?.status === 'done' && !recording.isEditing && (
                <>
                  <p className="text-gray-300 text-sm leading-relaxed">{recording.meetingSummary.summary}</p>
                  {recording.meetingSummary.keyPoints?.length > 0 && (
                    <div><h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Key Points</h4>
                      <ul className="space-y-1.5">{recording.meetingSummary.keyPoints.map((p, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-primary-400 mt-0.5 flex-shrink-0">&#8226;</span>{p}</li>)}</ul></div>
                  )}
                  {recording.meetingSummary.actionItems?.length > 0 && (
                    <div><h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Action Items</h4>
                      <ul className="space-y-1.5">{recording.meetingSummary.actionItems.map((a, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-yellow-400 mt-0.5 flex-shrink-0">&#9744;</span>{a}</li>)}</ul></div>
                  )}
                  {recording.meetingSummary.decisions?.length > 0 && (
                    <div><h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Decisions</h4>
                      <ul className="space-y-1.5">{recording.meetingSummary.decisions.map((d, i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-green-400 mt-0.5 flex-shrink-0">&#10003;</span>{d}</li>)}</ul></div>
                  )}
                  <details className="group"><summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-300">Full Transcript</summary>
                    <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-gray-900 rounded-lg p-3">{recording.meetingSummary.transcript}</pre></details>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recordings history panel */}
      {recording.showRecordings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md max-h-[70vh] shadow-2xl border border-gray-700 flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-700">
              <h3 className="text-white font-semibold">Meeting Recordings</h3>
              <button onClick={() => recording.setShowRecordings(false)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"><FaTimes size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {recording.recordings.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">No recordings yet</p> : (
                <div className="divide-y divide-gray-700/50">
                  {recording.recordings.map(rec => (
                    <button key={rec.id} onClick={() => { recording.setShowRecordings(false); recording.openRecording(rec) }} className="w-full text-left px-5 py-3 hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-medium truncate flex-1">{rec.summary?.status === 'done' ? (rec.summary?.title || rec.topic || 'Untitled') : (rec.topic || 'Untitled')}</p>
                        {rec.summary?.status === 'processing' && <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-600/20 text-primary-300 flex-shrink-0">Processing</span>}
                        {rec.summary?.status === 'error' && <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-600/20 text-red-400 flex-shrink-0">Failed</span>}
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

      {/* Hang up confirmation dialog */}
      {showHangUpDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full"><FaPhone className="text-red-600 text-xl rotate-[135deg]" /></div>
              <h3 className="text-xl font-bold text-gray-900">结束会议</h3>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">{recording.isRecording ? '当前正在录音，结束会议将自动停止并保存录音。确定要结束会议吗？' : '确定要结束会议吗？'}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowHangUpDialog(false)} className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium">取消</button>
              <button onClick={confirmHangUp} className="px-6 py-3 text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors font-medium shadow-lg shadow-red-500/30">确定结束</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  )
}
