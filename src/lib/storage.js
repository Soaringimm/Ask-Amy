import { supabase } from './supabase'

const BUCKET_NAME = 'aa_article_images'

/**
 * Upload an image to Supabase Storage
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export async function uploadImage(file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Error uploading image:', error)
    throw error
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * Delete an image from Supabase Storage
 * @param {string} url - The public URL of the image to delete
 */
export async function deleteImage(url) {
  // Extract path from URL
  const urlObj = new URL(url)
  const path = urlObj.pathname.split(`/${BUCKET_NAME}/`)[1]

  if (!path) {
    console.warn('Invalid image URL:', url)
    return
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}

/**
 * Generate markdown image syntax
 * @param {string} url - The image URL
 * @param {string} alt - Alt text for the image
 * @returns {string} - Markdown image syntax
 */
export function getMarkdownImage(url, alt = 'image') {
  return `![${alt}](${url})`
}
