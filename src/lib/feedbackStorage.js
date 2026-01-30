import { supabase } from './supabase'

// Storage bucket name
const BUCKET_NAME = 'aa_feedback_images'

// Image constraints
export const MAX_IMAGES_PER_FEEDBACK = 5
export const MAX_IMAGE_SIZE_MB = 5
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp']

/**
 * Validate image file
 * @param {File} file - The file to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: '请选择文件' }
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: `不支持的文件格式。支持: ${ALLOWED_EXTENSIONS.join(', ')}` }
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: `文件大小不能超过 ${MAX_IMAGE_SIZE_MB}MB` }
  }

  return { valid: true }
}

/**
 * Upload an image to feedback storage
 * @param {File} file - The file to upload
 * @param {string} feedbackId - The feedback ID
 * @returns {Promise<{ path: string, filename: string, fileSize: number, mimeType: string } | null>}
 */
export async function uploadFeedbackImage(file, feedbackId) {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Generate unique filename
  const ext = file.name.split('.').pop().toLowerCase()
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const storagePath = `${feedbackId}/${timestamp}-${randomStr}.${ext}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Error uploading image:', error)
    throw new Error('图片上传失败: ' + error.message)
  }

  return {
    path: data.path,
    filename: file.name,
    fileSize: file.size,
    mimeType: file.type,
  }
}

/**
 * Get a signed URL for viewing an image
 * @param {string} storagePath - The storage path of the image
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string | null>}
 */
export async function getFeedbackImageUrl(storagePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn)

  if (error) {
    console.error('Error getting signed URL:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Delete an image from storage
 * @param {string} storagePath - The storage path of the image
 * @returns {Promise<boolean>}
 */
export async function deleteFeedbackImage(storagePath) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath])

  if (error) {
    console.error('Error deleting image:', error)
    return false
  }

  return true
}

/**
 * Delete all images for a feedback item
 * @param {Array<{ storage_path: string }>} images - Array of image records
 * @returns {Promise<boolean>}
 */
export async function deleteFeedbackImages(images) {
  if (!images || images.length === 0) return true

  const paths = images.map(img => img.storage_path)

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths)

  if (error) {
    console.error('Error deleting images:', error)
    return false
  }

  return true
}
