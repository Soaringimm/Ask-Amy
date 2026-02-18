import { supabase } from './supabase'

// ─── IndexedDB: local audio blob cache ──────────────────────────────────────

const DB_NAME = 'meet_audio'
const STORE = 'files'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'name' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(record) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGet(name) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(name)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

async function idbDelete(name) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(name)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ─── Supabase Storage helpers ────────────────────────────────────────────────

const BUCKET = 'aa_audio_files'

function storagePath(userId, name) {
  return `${userId}/${encodeURIComponent(name)}`
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Save audio file: cache in IndexedDB immediately, upload to Supabase Storage
 * in background (non-blocking so playback starts right away).
 */
export async function saveAudioFile(name, blob, duration, userId) {
  // 1. Cache locally first (instant)
  await idbPut({ name, blob, duration, savedAt: Date.now() })

  // 2. Upload to cloud in background
  if (userId) {
    const path = storagePath(userId, name)
    supabase.storage
      .from(BUCKET)
      .upload(path, blob, { upsert: true, contentType: blob.type || 'audio/mpeg' })
      .then(({ error }) => {
        if (error) console.warn('[audio storage] upload failed:', error.message)
      })
  }
}

/**
 * Get audio file: IndexedDB first (fast cache), then Supabase Storage.
 * Downloads from cloud and caches locally on hit.
 */
export async function getAudioFile(name, userId) {
  // 1. Try local cache
  const cached = await idbGet(name)
  if (cached) return cached

  // 2. Try Supabase Storage
  if (userId) {
    const path = storagePath(userId, name)
    const { data, error } = await supabase.storage.from(BUCKET).download(path)
    if (!error && data) {
      await idbPut({ name, blob: data, duration: 0, savedAt: Date.now() })
      return { name, blob: data, duration: 0 }
    }
  }

  return null
}

export async function deleteAudioFile(name) {
  await idbDelete(name)
}

// ─── Supabase: playlist metadata CRUD ───────────────────────────────────────

export async function savePlaylist(userId, name, songs, type = 'local') {
  const { data, error } = await supabase
    .from('aa_meet_playlists')
    .insert({ user_id: userId, name, songs, type })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPlaylists(userId, type) {
  let query = supabase
    .from('aa_meet_playlists')
    .select('*')
    .eq('user_id', userId)
  if (type) {
    query = query.eq('type', type)
  }
  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updatePlaylist(id, name, songs) {
  const { data, error } = await supabase
    .from('aa_meet_playlists')
    .update({ name, songs, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePlaylist(id) {
  const { error } = await supabase
    .from('aa_meet_playlists')
    .delete()
    .eq('id', id)
  if (error) throw error
}
