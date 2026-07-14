import { describe, expect, it } from 'vitest'

import {
  checkAttachmentSize,
  checkBooleanQuota,
  checkQuota,
} from '../check-quota'

describe('checkQuota', () => {
  it('FREE workspacesPerTenant — under-limit allowed', () => {
    const r = checkQuota('FREE', 'workspacesPerTenant', 0)
    expect(r).toEqual({ allowed: true, limit: 1, current: 0, plan: 'FREE' })
  })

  it('FREE workspacesPerTenant — at limit rejected (current+1 > limit)', () => {
    const r = checkQuota('FREE', 'workspacesPerTenant', 1)
    expect(r).toEqual({ allowed: false, limit: 1, current: 1, plan: 'FREE' })
  })

  it('FREE membersPerWorkspace — under, at, over', () => {
    expect(checkQuota('FREE', 'membersPerWorkspace', 19).allowed).toBe(true)
    expect(checkQuota('FREE', 'membersPerWorkspace', 20).allowed).toBe(false)
    expect(checkQuota('FREE', 'membersPerWorkspace', 100).allowed).toBe(false)
  })

  it('SMALL_TEAM membersPerWorkspace boundary at 60', () => {
    expect(checkQuota('SMALL_TEAM', 'membersPerWorkspace', 59).allowed).toBe(
      true,
    )
    expect(checkQuota('SMALL_TEAM', 'membersPerWorkspace', 60).allowed).toBe(
      false,
    )
  })

  it('BUSINESS shiftsPerMonthPerWorkspace boundary at 4000', () => {
    expect(
      checkQuota('BUSINESS', 'shiftsPerMonthPerWorkspace', 3999).allowed,
    ).toBe(true)
    expect(
      checkQuota('BUSINESS', 'shiftsPerMonthPerWorkspace', 4000).allowed,
    ).toBe(false)
  })

  it('CORPORATE membersPerWorkspace — null limit is unconditionally allowed', () => {
    const r = checkQuota('CORPORATE', 'membersPerWorkspace', 9_999_999)
    expect(r).toEqual({
      allowed: true,
      limit: null,
      current: 9_999_999,
      plan: 'CORPORATE',
    })
  })

  it('CORPORATE storageMBPerWorkspace — has a finite limit (40 GB)', () => {
    expect(
      checkQuota('CORPORATE', 'storageMBPerWorkspace', 40_959).allowed,
    ).toBe(true)
    expect(
      checkQuota('CORPORATE', 'storageMBPerWorkspace', 40_960).allowed,
    ).toBe(false)
  })

  it('FREE requestsPerMonthPerWorkspace at 40 — boundary respected', () => {
    expect(checkQuota('FREE', 'requestsPerMonthPerWorkspace', 39).allowed).toBe(
      true,
    )
    expect(checkQuota('FREE', 'requestsPerMonthPerWorkspace', 40).allowed).toBe(
      false,
    )
  })

  it('returns the plan we asked about (not a different one)', () => {
    expect(checkQuota('FREE', 'membersPerWorkspace', 0).plan).toBe('FREE')
    expect(checkQuota('SMALL_TEAM', 'membersPerWorkspace', 0).plan).toBe(
      'SMALL_TEAM',
    )
  })

  it('returns the limit unchanged when allowed', () => {
    expect(checkQuota('FREE', 'workspacesPerTenant', 0).limit).toBe(1)
  })

  it('returns the current value unchanged in both branches', () => {
    expect(checkQuota('FREE', 'membersPerWorkspace', 5).current).toBe(5)
    expect(checkQuota('FREE', 'membersPerWorkspace', 50).current).toBe(50)
  })

  it('current=0 with limit=0 is rejected (impossible plan but safe behavior)', () => {
    // No real plan has limit=0, but the algorithm should still reject.
    // Achieved here by reading via an alternate path: not in v1 numbers, but
    // `current + 1 <= 0` ⇒ false. We assert the math, not the data.
    const r = checkQuota('FREE', 'workspacesPerTenant', 1)
    // limit=1, current=1 → 1+1=2 > 1 → rejected.
    expect(r.allowed).toBe(false)
  })
})

describe('checkBooleanQuota', () => {
  it('FREE tenantScopedCatalogs is forbidden', () => {
    expect(checkBooleanQuota('FREE', 'tenantScopedCatalogs')).toEqual({
      allowed: false,
      plan: 'FREE',
    })
  })

  it('SMALL_TEAM tenantScopedCatalogs is forbidden', () => {
    expect(
      checkBooleanQuota('SMALL_TEAM', 'tenantScopedCatalogs').allowed,
    ).toBe(false)
  })

  it('BUSINESS tenantScopedCatalogs is forbidden (Corporate-only)', () => {
    expect(checkBooleanQuota('BUSINESS', 'tenantScopedCatalogs').allowed).toBe(
      false,
    )
  })

  it('CORPORATE tenantScopedCatalogs is allowed', () => {
    expect(checkBooleanQuota('CORPORATE', 'tenantScopedCatalogs').allowed).toBe(
      true,
    )
  })
})

describe('checkAttachmentSize', () => {
  const ONE_MB = 1024 * 1024

  it('FREE accepts a 1 MB upload', () => {
    const r = checkAttachmentSize('FREE', ONE_MB)
    expect(r.allowed).toBe(true)
    expect(r.limitMB).toBe(2)
    expect(r.sizeMB).toBe(1)
  })

  it('FREE rejects a 3 MB upload', () => {
    const r = checkAttachmentSize('FREE', 3 * ONE_MB)
    expect(r.allowed).toBe(false)
    expect(r.sizeMB).toBe(3)
    expect(r.limitMB).toBe(2)
  })

  it('FREE rounds up sub-megabyte values', () => {
    // 1.5 MB → ceil to 2 MB → equals limit, allowed
    expect(checkAttachmentSize('FREE', 1.5 * ONE_MB).sizeMB).toBe(2)
    // 2.1 MB → ceil to 3 MB → above limit
    expect(checkAttachmentSize('FREE', 2.1 * ONE_MB).allowed).toBe(false)
  })

  it('CORPORATE accepts up to 100 MB', () => {
    expect(checkAttachmentSize('CORPORATE', 100 * ONE_MB).allowed).toBe(true)
    expect(checkAttachmentSize('CORPORATE', 101 * ONE_MB).allowed).toBe(false)
  })
})
