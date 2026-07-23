export interface UploadedFile {
  path: string
  url: string
}

export interface StorageAdapter {
  uploadFile(
    bucket: string,
    path: string,
    file: Buffer | Blob,
    contentType: string,
  ): Promise<UploadedFile>
  deleteFile(bucket: string, path: string): Promise<void>
  fileExists(bucket: string, path: string): Promise<boolean>
}
