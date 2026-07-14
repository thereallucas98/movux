import { expect, test } from '@playwright/test'
import { resetDatabase } from './fixtures/db'
import { createUserFixture } from './fixtures/factories'

test.describe('PATCH /api/me — profile extension', () => {
  test.beforeEach(async () => {
    await resetDatabase()
  })

  test('200 updates fullName (existing field, still works)', async ({
    request,
  }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: { fullName: 'Renamed User' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.fullName).toBe('Renamed User')
  })

  test('200 sets avatarUrl', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: { avatarUrl: 'https://example.com/avatar.png' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.avatarUrl).toBe('https://example.com/avatar.png')
  })

  test('200 sets dateOfBirth', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: { dateOfBirth: '1990-01-15' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.dateOfBirth).toBeTruthy()
  })

  test('200 sets bio', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: { bio: 'Plantão noturno, UTI.' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.bio).toBe('Plantão noturno, UTI.')
  })

  test('200 toggles whatsappOptIn', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: { whatsappOptIn: true },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.whatsappOptIn).toBe(true)
  })

  test('200 sets emergency contact (name + phone)', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: {
        emergencyContactName: 'Mãe',
        emergencyContactPhone: '+5511999998888',
      },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.emergencyContactName).toBe('Mãe')
    expect(body.data.emergencyContactPhone).toBe('+5511999998888')
  })

  test('200 combined update', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: {
        fullName: 'Full Name',
        bio: 'Bio text',
        whatsappOptIn: true,
      },
    })
    expect(res.status()).toBe(200)
  })

  test('400 invalid phone', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: { phone: 'not-a-phone' },
    })
    expect(res.status()).toBe(400)
  })

  test('400 invalid avatar URL', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', {
      data: { avatarUrl: 'not-a-url' },
    })
    expect(res.status()).toBe(400)
  })

  test('400 empty body (no fields)', async ({ request }) => {
    await createUserFixture(request)
    const res = await request.patch('/api/me', { data: {} })
    expect(res.status()).toBe(400)
  })

  test('401 without session cookie', async ({ request }) => {
    const res = await request.patch('/api/me', {
      data: { fullName: 'Anon' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/me reflects updated fields', async ({ request }) => {
    await createUserFixture(request)
    await request.patch('/api/me', {
      data: { bio: 'Sample bio', whatsappOptIn: true },
    })
    const res = await request.get('/api/me')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.user.bio).toBe('Sample bio')
    expect(body.user.whatsappOptIn).toBe(true)
  })
})
