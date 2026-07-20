import type { CarrierDocument, CarrierDocumentType } from '~/generated/prisma/client'
import { uploadFile } from '~/lib/storage/supabase'
import type { CarrierDocumentRepository } from '../../repositories/carrier-document.repository'

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'carrier-documents'

export interface UploadCarrierDocumentFile {
  buffer: Buffer
  contentType: string
  originalFilename: string
}

export type UploadCarrierDocumentResult =
  | { success: true; document: CarrierDocument }
  | { success: false; code: 'ATTACHMENT_UPLOAD_FAILED' }

interface UploadCarrierDocumentRepos {
  carrierDocumentRepo: CarrierDocumentRepository
}

export async function uploadCarrierDocument(
  repos: UploadCarrierDocumentRepos,
  userId: string,
  type: CarrierDocumentType,
  file: UploadCarrierDocumentFile,
): Promise<UploadCarrierDocumentResult> {
  const safeName = file.originalFilename.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80)
  const path = `carrier-documents/${userId}/${Date.now()}-${safeName}`

  let uploaded
  try {
    uploaded = await uploadFile(STORAGE_BUCKET, path, file.buffer, file.contentType)
  } catch {
    return { success: false, code: 'ATTACHMENT_UPLOAD_FAILED' }
  }

  const document = await repos.carrierDocumentRepo.create({
    carrierId: userId,
    type,
    fileUrl: uploaded.url,
  })

  return { success: true, document }
}
