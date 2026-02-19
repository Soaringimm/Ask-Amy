import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  createRecordingMixer, createMeetRecorder,
  saveAndProcessRecording,
  getRecordings, updateRecording, deleteRecording,
} from '../../lib/meetRecording'
import {
  POLLING_INTERVAL, POLLING_MAX_RETRIES,
  ERROR_DISMISS_TIMEOUT, PROCESSING_ERROR_DISMISS_TIMEOUT,
  RECORDING_TIMER_INTERVAL, COPY_FEEDBACK_TIMEOUT,
} from './constants'

/**
 * Manages meeting recording state, processing, and CRUD.
 */
export default function useMeetRecording({ user, roomId, localStreamRef, remoteAudioStreamRef }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [processingState, setProcessingState] = useState('')
  const [meetingSummary, setMeetingSummary] = useState(null)
  const [summaryError, setSummaryError] = useState('')
  const [summaryCopied, setSummaryCopied] = useState(false)
  const [editingRecording, setEditingRecording] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [recordings, setRecordings] = useState([])
  const [showRecordings, setShowRecordings] = useState(false)

  const recorderRef = useRef(null)
  const recordingMixerCtxRef = useRef(null)
  const recordingTimerRef = useRef(null)
  const recordingStartRef = useRef(0)
  const recordingPausedTimeRef = useRef(0)
  const isMountedRef = useRef(true) // C2: guard against setState after unmount
  const pollTimerRef = useRef(null) // C2: track polling timer for cancellation

  // C1: Cleanup all recording resources on unmount to prevent leaks
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearInterval(recordingTimerRef.current)
      clearTimeout(pollTimerRef.current)
      if (recorderRef.current) {
        try { recorderRef.current.stop() } catch { /* no-op */ }
        recorderRef.current = null
      }
      if (recordingMixerCtxRef.current) {
        recordingMixerCtxRef.current.close()
        recordingMixerCtxRef.current = null
      }
    }
  }, [])

  // Fetch recordings on user change
  useEffect(() => {
    if (user) {
      getRecordings(user.id).then(setRecordings).catch(err => console.error('Failed to load recordings:', err))
    } else {
      setRecordings([])
    }
  }, [user])

  function startRecording() {
    setSummaryError('')
    setMeetingSummary(null)
    setProcessingState('')
    clearInterval(recordingTimerRef.current)

    const hasLocalAudio = (localStreamRef.current?.getAudioTracks()?.length || 0) > 0
    const hasRemoteAudio = (remoteAudioStreamRef.current?.getAudioTracks()?.length || 0) > 0
    if (!hasLocalAudio && !hasRemoteAudio) {
      setProcessingState('error')
      setSummaryError('没有可用音频，无法开始录音。')
      setTimeout(() => setProcessingState(''), ERROR_DISMISS_TIMEOUT)
      return
    }

    try {
      const { ctx, stream } = createRecordingMixer(localStreamRef.current, remoteAudioStreamRef.current)
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
      }, RECORDING_TIMER_INTERVAL)
    } catch (err) {
      console.error('Failed to start recording:', err)
      setProcessingState('error')
      setSummaryError(err.message || '录音启动失败')
      setTimeout(() => setProcessingState(''), ERROR_DISMISS_TIMEOUT)
      if (recordingMixerCtxRef.current) {
        recordingMixerCtxRef.current.close()
        recordingMixerCtxRef.current = null
      }
      recorderRef.current = null
      setIsRecording(false)
      setIsPaused(false)
    }
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
      setTimeout(() => setProcessingState(''), ERROR_DISMISS_TIMEOUT)
      return
    }

    setProcessingState('processing')

    // Fire and forget — do not block the caller (e.g. hangUp) on upload/AI processing
    saveAndProcessRecording({
      userId: user.id, roomId, topic: '', durationSeconds, audioBlob: blob,
      onUpdate: (updated) => {
        setRecordings(prev => prev.map(r => r.id === updated.id ? updated : r))
        setEditingRecording(prev => prev?.id === updated.id ? updated : prev)
        if (updated.summary?.status === 'done') {
          setMeetingSummary(prev => {
            if (prev?._recordId === updated.id) return { ...updated.summary, transcript: updated.transcript, _recordId: updated.id }
            return prev
          })
          setProcessingState('done')
          setTimeout(() => setProcessingState(''), ERROR_DISMISS_TIMEOUT)
        } else if (updated.summary?.status === 'error') {
          setProcessingState('error')
          setSummaryError(updated.summary.error || 'Processing failed')
          setTimeout(() => setProcessingState(''), PROCESSING_ERROR_DISMISS_TIMEOUT)
        }
      },
    }).then(record => {
      setRecordings(prev => [record, ...prev])
      setEditingRecording(record)
      pollRecordingStatus(record.id)
    }).catch(err => {
      console.error('Failed to save recording:', err)
      setProcessingState('error')
      setSummaryError(err.message || 'Failed to save recording')
      setTimeout(() => setProcessingState(''), PROCESSING_ERROR_DISMISS_TIMEOUT)
    })
  }

  function pollRecordingStatus(recordId) {
    let retries = 0
    const poll = async () => {
      // C2: stop polling if component has unmounted
      if (!isMountedRef.current) return

      if (retries >= POLLING_MAX_RETRIES) {
        console.warn(`[polling] Max retries (${POLLING_MAX_RETRIES}) reached for recording ${recordId}`)
        if (isMountedRef.current) {
          setProcessingState('error')
          setSummaryError('Processing timed out. Please check back later.')
        }
        return
      }
      retries++
      try {
        const { data } = await supabase
          .from('aa_meet_recordings')
          .select('*')
          .eq('id', recordId)
          .single()
        if (!data || !isMountedRef.current) return

        if (data.summary?.status !== 'processing') {
          setRecordings(prev => prev.map(r => r.id === data.id ? data : r))
          setEditingRecording(prev => prev?.id === data.id ? data : prev)
          setMeetingSummary(prev => {
            if (prev?._recordId === data.id) return { ...data.summary, transcript: data.transcript || '', _recordId: data.id }
            return prev
          })
          return
        }
        if (isMountedRef.current) {
          pollTimerRef.current = setTimeout(poll, POLLING_INTERVAL)
        }
      } catch (err) {
        console.error('[polling] Error checking recording status:', err)
        if (isMountedRef.current) {
          pollTimerRef.current = setTimeout(poll, POLLING_INTERVAL)
        }
      }
    }
    pollTimerRef.current = setTimeout(poll, POLLING_INTERVAL)
  }

  function copySummaryText() {
    if (!meetingSummary) return
    const lines = [
      `# ${meetingSummary.title}`, '', meetingSummary.summary, '', '## Key Points',
      ...meetingSummary.keyPoints.map(p => `- ${p}`),
    ]
    if (meetingSummary.actionItems?.length) lines.push('', '## Action Items', ...meetingSummary.actionItems.map(a => `- [ ] ${a}`))
    if (meetingSummary.decisions?.length) lines.push('', '## Decisions', ...meetingSummary.decisions.map(d => `- ${d}`))
    navigator.clipboard.writeText(lines.join('\n'))
    setSummaryCopied(true)
    setTimeout(() => setSummaryCopied(false), COPY_FEEDBACK_TIMEOUT)
  }

  function dismissSummary() {
    setMeetingSummary(null); setProcessingState(''); setSummaryError('')
    setEditingRecording(null); setIsEditing(false); setEditForm(null)
  }

  async function fetchRecordings() {
    if (!user) return
    try { const data = await getRecordings(user.id); setRecordings(data) }
    catch (err) { console.error('Failed to fetch recordings:', err) }
  }

  function openRecording(rec) {
    setEditingRecording(rec)
    setMeetingSummary({ ...rec.summary, transcript: rec.transcript || '', _recordId: rec.id })
    setProcessingState('done')
    setIsEditing(false); setEditForm(null)
    if (rec.summary?.status === 'processing') pollRecordingStatus(rec.id)
  }

  function startEditing() {
    if (!editingRecording) return
    const s = editingRecording.summary || {}
    setEditForm({
      title: s.title || '', summary: s.summary || '',
      keyPoints: (s.keyPoints || []).join('\n'),
      actionItems: (s.actionItems || []).join('\n'),
      decisions: (s.decisions || []).join('\n'),
      transcript: editingRecording.transcript || '',
    })
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setEditForm(null)
  }

  async function saveRecordingEdit() {
    if (!editingRecording || !editForm) return
    setSavingEdit(true)
    try {
      const newSummary = {
        title: editForm.title, summary: editForm.summary,
        keyPoints: editForm.keyPoints.split('\n').filter(l => l.trim()),
        actionItems: editForm.actionItems.split('\n').filter(l => l.trim()),
        decisions: editForm.decisions.split('\n').filter(l => l.trim()),
      }
      const updated = await updateRecording(editingRecording.id, { summary: newSummary, transcript: editForm.transcript })
      setEditingRecording(updated)
      setMeetingSummary({ ...newSummary, status: 'done', transcript: editForm.transcript })
      cancelEditing()
      fetchRecordings()
    } catch (err) {
      console.error('Failed to save recording edit:', err)
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

  return {
    isRecording, isPaused, recordingTime, processingState,
    meetingSummary, summaryError, summaryCopied,
    editingRecording, isEditing, editForm, setEditForm, savingEdit,
    recordings, showRecordings, setShowRecordings,
    startRecording, toggleRecordingPause, stopRecording,
    copySummaryText, dismissSummary, fetchRecordings, openRecording,
    startEditing, cancelEditing, saveRecordingEdit, handleDeleteRecording,
  }
}
