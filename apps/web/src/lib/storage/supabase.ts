import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { StorageAdapter } from './types'

let cachedClient: SupabaseClient | null = null

export function resetSupabaseAdminCache(): void {
  cachedClient = null
}

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'Missing Supabase environment variable: NEXT_PUBLIC_SUPABASE_URL',
    )
  }

  if (!supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Storage operations require the service role key to bypass RLS.',
    )
  }

  cachedClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
  return cachedClient
}

export interface UploadedFile {
  path: string
  url: string
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer | Blob,
  contentType: string,
): Promise<UploadedFile> {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: true,
    })

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  const { data: signedUrlData, error: signedUrlError } =
    await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600)

  if (signedUrlError || !signedUrlData) {
    return { path: data.path, url: '' }
  }

  return { path: data.path, url: signedUrlData.signedUrl }
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin()
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path])
  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

export async function fileExists(
  bucket: string,
  path: string,
): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin()
  const folder = path.split('/').slice(0, -1).join('/')
  const filename = path.split('/').pop() ?? ''
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(folder, { limit: 1, search: filename })

  return !error && Array.isArray(data) && data.length > 0
}

export const supabaseStorageAdapter: StorageAdapter = {
  uploadFile,
  deleteFile,
  fileExists,
}
