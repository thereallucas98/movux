import { describe, expect, it } from 'vitest'

import { errorResponse, validationErrorResponse } from '../error-response'

describe('errorResponse', () => {
  it('returns the mapped status + message + code', async () => {
    const res = errorResponse('NOT_FOUND')
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ message: 'Resource not found', code: 'NOT_FOUND' })
  })

  it('includes details when passed', async () => {
    const res = errorResponse('VALIDATION_ERROR', {
      details: [{ path: 'name', message: 'required' }],
    })
    const body = await res.json()
    expect(body.details).toEqual([{ path: 'name', message: 'required' }])
  })

  it('includes meta when passed (sibling of details)', async () => {
    const meta = {
      shape: 'simple',
      resource: 'workspacesPerTenant',
      plan: 'FREE',
      limit: 1,
      current: 1,
    }
    const res = errorResponse('PLAN_LIMIT_REACHED', { meta })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body).toEqual({
      message: 'Plan limit reached',
      code: 'PLAN_LIMIT_REACHED',
      meta,
    })
    expect(body.details).toBeUndefined()
  })

  it('keeps details and meta separate (no merging)', async () => {
    const res = errorResponse('PLAN_LIMIT_REACHED', {
      details: { hint: 'unrelated' },
      meta: { shape: 'simple', resource: 'membersPerWorkspace', plan: 'FREE' },
    })
    const body = await res.json()
    expect(body.details).toEqual({ hint: 'unrelated' })
    expect(body.meta).toEqual({
      shape: 'simple',
      resource: 'membersPerWorkspace',
      plan: 'FREE',
    })
  })

  it('messageOverride replaces the default mapped message', async () => {
    const res = errorResponse('FORBIDDEN', {
      messageOverride: 'Custom forbidden text',
    })
    const body = await res.json()
    expect(body.message).toBe('Custom forbidden text')
    expect(body.code).toBe('FORBIDDEN')
  })

  it('omits details and meta when not passed', async () => {
    const res = errorResponse('UNAUTHENTICATED')
    const body = await res.json()
    expect('details' in body).toBe(false)
    expect('meta' in body).toBe(false)
  })
})

describe('validationErrorResponse', () => {
  it('uses VALIDATION_ERROR mapping with issues as details', async () => {
    const fakeIssues = [{ path: ['email'], message: 'invalid' }]
    const res = validationErrorResponse({ issues: fakeIssues } as never)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.details).toEqual(fakeIssues)
  })
})
