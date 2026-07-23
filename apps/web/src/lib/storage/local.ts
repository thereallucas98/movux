import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { StorageAdapter, UploadedFile } from './types'

// Adapter de desenvolvimento: grava em public/uploads (gitignored) e serve o
// arquivo direto pelo Next.js como estático. Só para testes locais — sem
// persistência entre deploys e sem controle de acesso; trocar pra
// `supabaseStorageAdapter` (ou outro) via STORAGE_ADAPTER antes de produção.
const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads')

function resolvePath(bucket: string, filePath: string): string {
  return path.join(UPLOADS_ROOT, bucket, filePath)
}

export const localStorageAdapter: StorageAdapter = {
  async uploadFile(bucket, filePath, file): Promise<UploadedFile> {
    const absolutePath = resolvePath(bucket, filePath)
    await mkdir(path.dirname(absolutePath), { recursive: true })
    const buffer = Buffer.isBuffer(file)
      ? file
      : Buffer.from(await file.arrayBuffer())
    await writeFile(absolutePath, buffer)
    return { path: filePath, url: `/uploads/${bucket}/${filePath}` }
  },

  async deleteFile(bucket, filePath): Promise<void> {
    await rm(resolvePath(bucket, filePath), { force: true })
  },

  async fileExists(bucket, filePath): Promise<boolean> {
    return existsSync(resolvePath(bucket, filePath))
  },
}
