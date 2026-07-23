import { localStorageAdapter } from './local'
import { supabaseStorageAdapter } from './supabase'
import type { StorageAdapter } from './types'

export type { StorageAdapter, UploadedFile } from './types'

let cachedAdapter: StorageAdapter | null = null

// Troca de provider é só uma env var (STORAGE_ADAPTER=supabase) — nenhum
// use-case depende de um provider específico, só desta interface.
export function getStorageAdapter(): StorageAdapter {
  if (!cachedAdapter) {
    cachedAdapter =
      process.env.STORAGE_ADAPTER === 'supabase'
        ? supabaseStorageAdapter
        : localStorageAdapter
  }
  return cachedAdapter
}
