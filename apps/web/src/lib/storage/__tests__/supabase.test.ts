import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  deleteFile,
  fileExists,
  getSupabaseAdmin,
  resetSupabaseAdminCache,
  uploadFile,
} from '../supabase'

const uploadMock = vi.fn()
const createSignedUrlMock = vi.fn()
const removeMock = vi.fn()
const listMock = vi.fn()

const fromMock = vi.fn(() => ({
  upload: uploadMock,
  createSignedUrl: createSignedUrlMock,
  remove: removeMock,
  list: listMock,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ storage: { from: fromMock } })),
}))

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

beforeEach(() => {
  resetSupabaseAdminCache()
  uploadMock.mockReset()
  createSignedUrlMock.mockReset()
  removeMock.mockReset()
  listMock.mockReset()
  fromMock.mockClear()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
})

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
  else process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL
  if (ORIGINAL_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
  else process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY
})

describe('getSupabaseAdmin', () => {
  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    expect(() => getSupabaseAdmin()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    expect(() => getSupabaseAdmin()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
  })

  it('caches the client across calls', () => {
    const a = getSupabaseAdmin()
    const b = getSupabaseAdmin()
    expect(a).toBe(b)
  })
})

describe('uploadFile', () => {
  it('uploads with upsert=true and returns signed URL on success', async () => {
    uploadMock.mockResolvedValueOnce({
      data: { path: 'requests/abc/atestado.pdf' },
      error: null,
    })
    createSignedUrlMock.mockResolvedValueOnce({
      data: { signedUrl: 'https://signed.example/abc' },
      error: null,
    })

    const result = await uploadFile(
      'request-attachments',
      'requests/abc/atestado.pdf',
      Buffer.from('hello'),
      'application/pdf',
    )

    expect(fromMock).toHaveBeenCalledWith('request-attachments')
    expect(uploadMock).toHaveBeenCalledWith(
      'requests/abc/atestado.pdf',
      expect.any(Buffer),
      { contentType: 'application/pdf', upsert: true },
    )
    expect(result).toEqual({
      path: 'requests/abc/atestado.pdf',
      url: 'https://signed.example/abc',
    })
  })

  it('throws with the supabase error message when upload fails', async () => {
    uploadMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'row-level security policy' },
    })
    await expect(
      uploadFile('b', 'p', Buffer.from(''), 'application/pdf'),
    ).rejects.toThrow(/row-level security policy/)
  })

  it('returns empty url when signed-URL creation fails (upload still succeeds)', async () => {
    uploadMock.mockResolvedValueOnce({ data: { path: 'p' }, error: null })
    createSignedUrlMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'signed url failure' },
    })

    const result = await uploadFile('b', 'p', Buffer.from(''), 'image/png')
    expect(result).toEqual({ path: 'p', url: '' })
  })
})

describe('deleteFile', () => {
  it('calls remove with the given path', async () => {
    removeMock.mockResolvedValueOnce({ error: null })
    await deleteFile('request-attachments', 'requests/abc/atestado.pdf')
    expect(removeMock).toHaveBeenCalledWith(['requests/abc/atestado.pdf'])
  })

  it('throws when supabase reports an error', async () => {
    removeMock.mockResolvedValueOnce({ error: { message: 'not found' } })
    await expect(deleteFile('b', 'p')).rejects.toThrow(/not found/)
  })
})

describe('fileExists', () => {
  it('returns true when list yields a matching entry', async () => {
    listMock.mockResolvedValueOnce({
      data: [{ name: 'atestado.pdf' }],
      error: null,
    })
    const exists = await fileExists(
      'request-attachments',
      'requests/abc/atestado.pdf',
    )
    expect(exists).toBe(true)
    expect(listMock).toHaveBeenCalledWith('requests/abc', {
      limit: 1,
      search: 'atestado.pdf',
    })
  })

  it('returns false when list yields an empty array', async () => {
    listMock.mockResolvedValueOnce({ data: [], error: null })
    const exists = await fileExists('b', 'requests/x/missing.pdf')
    expect(exists).toBe(false)
  })

  it('returns false when list errors out', async () => {
    listMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'boom' },
    })
    const exists = await fileExists('b', 'requests/x/y.pdf')
    expect(exists).toBe(false)
  })
})
