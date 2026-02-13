import { supabase } from './supabase'

/**
 * Mix local microphone + remote audio into a single stream for recording.
 */
export function createRecordingMixer(localStream, remoteAudioStream) {
  const ctx = new AudioContext()
  const dest = ctx.createMediaStreamDestination()

  // Local microphone
  if (localStream) {
    const localSource = ctx.createMediaStreamSource(localStream)
    localSource.connect(dest)
  }

  // Remote audio (peer voice + music)
  if (remoteAudioStream && remoteAudioStream.getAudioTracks().length > 0) {
    const remoteSource = ctx.createMediaStreamSource(remoteAudioStream)
    remoteSource.connect(dest)
  }

  return { ctx, stream: dest.stream }
}

/**
 * Create a MediaRecorder wrapper with pause/resume/stop support.
 * Returns { start, pause, resume, stop, getState }
 */
export function createMeetRecorder(mixedStream) {
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm'

  const recorder = new MediaRecorder(mixedStream, { mimeType })
  const chunks = []

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  return {
    start() {
      chunks.length = 0
      recorder.start(1000) // collect data every second
    },
    pause() {
      if (recorder.state === 'recording') recorder.pause()
    },
    resume() {
      if (recorder.state === 'paused') recorder.resume()
    },
    stop() {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType })
          resolve(blob)
        }
        if (recorder.state !== 'inactive') {
          recorder.stop()
        } else {
          const blob = new Blob(chunks, { type: mimeType })
          resolve(blob)
        }
      })
    },
    getState() {
      return recorder.state // 'inactive' | 'recording' | 'paused'
    },
  }
}

/**
 * Send audio blob to server for transcription.
 */
export async function transcribeAudio(blob) {
  const formData = new FormData()
  formData.append('audio', blob, 'recording.webm')

  const res = await fetch('/api/meet/transcribe', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Transcription failed (${res.status})`)
  }

  const data = await res.json()
  return data.transcript
}

/**
 * Send transcript to server for structured summary.
 */
export async function summarizeMeeting(transcript, topic) {
  const res = await fetch('/api/meet/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, topic }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Summarization failed (${res.status})`)
  }

  const data = await res.json()
  return data.summary
}

/**
 * Save recording metadata to Supabase.
 */
export async function saveRecording({ userId, roomId, topic, durationSeconds, transcript, summary }) {
  const { data, error } = await supabase
    .from('aa_meet_recordings')
    .insert({
      user_id: userId,
      room_id: roomId,
      topic,
      duration_seconds: durationSeconds,
      transcript,
      summary,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
