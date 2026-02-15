import { useState, useRef, useEffect } from 'react'
import {
  PIP_W, PIP_H, PIP_MARGIN,
  PIP_MIN_W, PIP_MIN_H, PIP_MAX_W, PIP_MAX_H,
  PIP_BAR_W, PIP_BAR_H, PIP_RATIO,
} from './constants'

/**
 * Manages PiP drag, resize, and minimize state for local and remote video.
 */
export default function usePiP({ ytMode }) {
  const [localPipPos, setLocalPipPos] = useState(null)
  const [remotePipPos, setRemotePipPos] = useState(null)
  const [localPipSize, setLocalPipSize] = useState({ w: PIP_W, h: PIP_H })
  const [remotePipSize, setRemotePipSize] = useState({ w: PIP_W, h: PIP_H })
  const [localPipMin, setLocalPipMin] = useState(false)
  const [remotePipMin, setRemotePipMin] = useState(false)

  const mainVideoAreaRef = useRef(null)
  const draggingPipRef = useRef(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const resizingPipRef = useRef(null)

  // Reset PiP positions when ytMode changes
  useEffect(() => {
    const el = mainVideoAreaRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (ytMode) {
      setRemotePipPos({ x: PIP_MARGIN, y: r.height - PIP_H - PIP_MARGIN })
      setLocalPipPos({ x: r.width - PIP_W - PIP_MARGIN, y: r.height - PIP_H - PIP_MARGIN })
    } else {
      setRemotePipPos(null)
      setLocalPipPos({ x: r.width - PIP_W - PIP_MARGIN, y: r.height - PIP_H - PIP_MARGIN })
      setRemotePipSize({ w: PIP_W, h: PIP_H })
      setRemotePipMin(false)
    }
    setLocalPipSize({ w: PIP_W, h: PIP_H })
    setLocalPipMin(false)
  }, [ytMode])

  // Initialize local PiP position on mount
  useEffect(() => {
    const el = mainVideoAreaRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setLocalPipPos({ x: r.width - PIP_W - PIP_MARGIN, y: r.height - PIP_H - PIP_MARGIN })
  }, [])

  function onPipPointerDown(e, pipId) {
    e.preventDefault()
    draggingPipRef.current = pipId
    const el = mainVideoAreaRef.current
    if (!el) return
    const pos = pipId === 'local' ? localPipPos : remotePipPos
    if (!pos) return
    const size = pipId === 'local' ? localPipSize : remotePipSize
    const isMin = pipId === 'local' ? localPipMin : remotePipMin
    const curW = isMin ? PIP_BAR_W : size.w
    const curH = isMin ? PIP_BAR_H : size.h
    const startX = e.clientX, startY = e.clientY
    let didMove = false
    dragOffsetRef.current = { x: e.clientX - el.getBoundingClientRect().left - pos.x, y: e.clientY - el.getBoundingClientRect().top - pos.y }

    const onMove = (ev) => {
      if (!draggingPipRef.current) return
      if (!didMove && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 3) didMove = true
      const r = el.getBoundingClientRect()
      let nx = ev.clientX - r.left - dragOffsetRef.current.x
      let ny = ev.clientY - r.top - dragOffsetRef.current.y
      nx = Math.max(0, Math.min(nx, r.width - curW))
      ny = Math.max(0, Math.min(ny, r.height - curH))
      const setter = draggingPipRef.current === 'local' ? setLocalPipPos : setRemotePipPos
      setter({ x: nx, y: ny })
    }
    const onUp = () => {
      draggingPipRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!didMove && isMin) {
        const setMin = pipId === 'local' ? setLocalPipMin : setRemotePipMin
        setMin(false)
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function onResizePointerDown(e, pipId) {
    e.preventDefault(); e.stopPropagation()
    resizingPipRef.current = pipId
    const el = mainVideoAreaRef.current
    if (!el) return
    const size = pipId === 'local' ? localPipSize : remotePipSize
    const startX = e.clientX
    const startW = size.w
    const setSizer = pipId === 'local' ? setLocalPipSize : setRemotePipSize
    const setPos = pipId === 'local' ? setLocalPipPos : setRemotePipPos

    const onMove = (ev) => {
      if (!resizingPipRef.current) return
      const dx = ev.clientX - startX
      let newW = Math.max(PIP_MIN_W, Math.min(PIP_MAX_W, startW + dx))
      let newH = Math.round(newW / PIP_RATIO)
      if (newH > PIP_MAX_H) { newH = PIP_MAX_H; newW = Math.round(newH * PIP_RATIO) }
      if (newH < PIP_MIN_H) { newH = PIP_MIN_H; newW = Math.round(newH * PIP_RATIO) }
      setSizer({ w: newW, h: newH })
      const r = el.getBoundingClientRect()
      setPos(prev => prev ? { x: Math.min(prev.x, r.width - newW), y: Math.min(prev.y, r.height - newH) } : prev)
    }
    const onUp = () => {
      resizingPipRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function getPipStyle(pipId) {
    const pos = pipId === 'local' ? localPipPos : remotePipPos
    const size = pipId === 'local' ? localPipSize : remotePipSize
    const isMin = pipId === 'local' ? localPipMin : remotePipMin
    if (!pos) {
      if (pipId === 'local') return { position: 'absolute', bottom: 32, right: 32, width: PIP_W, height: PIP_H, zIndex: 20, touchAction: 'none', userSelect: 'none' }
      return {}
    }
    const isDragging = draggingPipRef.current === pipId || resizingPipRef.current === pipId
    return {
      position: 'absolute', left: pos.x, top: pos.y,
      width: isMin ? PIP_BAR_W : size.w, height: isMin ? PIP_BAR_H : size.h,
      zIndex: pipId === 'local' ? 20 : 15,
      transition: isDragging ? 'none' : 'all 0.3s',
      cursor: 'grab', touchAction: 'none', userSelect: 'none',
    }
  }

  return {
    mainVideoAreaRef,
    localPipMin, setLocalPipMin, remotePipMin, setRemotePipMin,
    onPipPointerDown, onResizePointerDown, getPipStyle,
  }
}
