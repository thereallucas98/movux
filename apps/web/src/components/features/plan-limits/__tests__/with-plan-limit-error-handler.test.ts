import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '~/lib/api-error'

import { handlePlanLimitError } from '../with-plan-limit-error-handler'

describe('handlePlanLimitError', () => {
  it('routes simple shape via onSimpleOrBoolean', () => {
    const onSimpleOrBoolean = vi.fn()
    const onPattern = vi.fn()
    const error = new ApiError(
      409,
      'Plan limit reached',
      'PLAN_LIMIT_REACHED',
      {
        shape: 'simple',
        resource: 'membersPerWorkspace',
        plan: 'FREE',
        limit: 20,
        current: 20,
      },
    )
    handlePlanLimitError(error, { onSimpleOrBoolean, onPattern })
    expect(onSimpleOrBoolean).toHaveBeenCalledOnce()
    expect(onSimpleOrBoolean.mock.calls[0][0]).toContain('membros')
    expect(onPattern).not.toHaveBeenCalled()
  })

  it('routes boolean shape via onSimpleOrBoolean', () => {
    const onSimpleOrBoolean = vi.fn()
    const error = new ApiError(
      409,
      'Plan limit reached',
      'PLAN_LIMIT_REACHED',
      {
        shape: 'boolean',
        resource: 'tenantScopedCatalogs',
        plan: 'FREE',
        allowed: false,
      },
    )
    handlePlanLimitError(error, { onSimpleOrBoolean })
    expect(onSimpleOrBoolean).toHaveBeenCalledOnce()
    expect(onSimpleOrBoolean.mock.calls[0][0]).toContain('Corporate')
  })

  it('routes pattern shape via onPattern with full meta', () => {
    const onSimpleOrBoolean = vi.fn()
    const onPattern = vi.fn()
    const meta = {
      shape: 'pattern' as const,
      resource: 'shiftsPerMonthPerWorkspace',
      plan: 'FREE' as const,
      perMonth: {
        '2026-05': { existing: 195, requested: 30, projected: 225, limit: 200 },
      },
      suggestion: { adjustedEndDate: '2026-05-22', wouldGenerate: 7 },
    }
    const error = new ApiError(
      409,
      'Plan limit reached',
      'PLAN_LIMIT_REACHED',
      meta,
    )
    handlePlanLimitError(error, { onSimpleOrBoolean, onPattern })
    expect(onPattern).toHaveBeenCalledOnce()
    expect(onPattern.mock.calls[0][0]).toEqual(meta)
    expect(onSimpleOrBoolean).not.toHaveBeenCalled()
  })

  it('falls through to onOtherError for non-PLAN_LIMIT_REACHED errors', () => {
    const onSimpleOrBoolean = vi.fn()
    const onOtherError = vi.fn()
    const error = new ApiError(404, 'Not found', 'NOT_FOUND')
    handlePlanLimitError(error, { onSimpleOrBoolean, onOtherError })
    expect(onSimpleOrBoolean).not.toHaveBeenCalled()
    expect(onOtherError).toHaveBeenCalledOnce()
  })

  it('uses fallback message when meta is undefined', () => {
    const onSimpleOrBoolean = vi.fn()
    const error = new ApiError(409, 'Plan limit reached', 'PLAN_LIMIT_REACHED')
    handlePlanLimitError(error, { onSimpleOrBoolean })
    expect(onSimpleOrBoolean).toHaveBeenCalledOnce()
    expect(onSimpleOrBoolean.mock.calls[0][0]).toBe('Limite do plano atingido.')
  })
})
