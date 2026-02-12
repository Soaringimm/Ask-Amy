import { supabase } from './supabase'

// ─── IndexedDB: local audio blob storage ────────────────────────────────────

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

export async function saveAudioFile(name, blob, duration) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ name, blob, duration, savedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAudioFile(name) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(name)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteAudioFile(name) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(name)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ─── Supabase: playlist metadata CRUD ───────────────────────────────────────

export async function savePlaylist(userId, name, songs) {
  const { data, error } = await supabase
    .from('aa_meet_playlists')
    .insert({ user_id: userId, name, songs })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPlaylists(userId) {
  const { data, error } = await supabase
    .from('aa_meet_playlists')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
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
