import { describe, expect, it } from 'vitest'
import { appraisalRequirement } from '@/features/contracts/ltv'

/**
 * F4-05 del backend (commit 5a6a025, 27/09/2026): con `max_ltv_pct` en la
 * categoría de la primera prenda, el avalúo es OBLIGATORIO (> 0) salvo
 * `contracts.override_ltv`; sin él, 422 `CONTRACT_APPRAISAL_REQUIRED`
 * (`{max_ltv_pct: "70.00", permission: "contracts.override_ltv"}`, respuesta
 * real del backend local en
 * `test_con_ltv_en_la_categoria_el_avaluo_es_obligatorio_sin_override`).
 * Antes el avalúo en blanco dejaba prestar cualquier monto.
 */
describe('appraisalRequirement', () => {
  it('categoría con LTV, sin permiso y sin avalúo: obligatorio, y el formulario lo dice', () => {
    const r = appraisalRequirement({ maxLtvPct: 70, appraisalValue: '', canOverride: false })
    expect(r.required).toBe(true)
    expect(r.error).toMatch(/obligatorio/i)
    expect(r.error).toContain('70')
  })

  it('un avalúo en cero cuenta como no tasado', () => {
    expect(appraisalRequirement({ maxLtvPct: 70, appraisalValue: '0.00', canOverride: false }).error).not.toBeNull()
  })

  it('con avalúo, no hay error', () => {
    const r = appraisalRequirement({ maxLtvPct: 70, appraisalValue: '1000000.00', canOverride: false })
    expect(r.required).toBe(true)
    expect(r.error).toBeNull()
  })

  it('con contracts.override_ltv sigue siendo opcional (el contrato queda marcado)', () => {
    const r = appraisalRequirement({ maxLtvPct: 70, appraisalValue: undefined, canOverride: true })
    expect(r.required).toBe(false)
    expect(r.error).toBeNull()
  })

  it('categoría sin LTV: opcional', () => {
    expect(appraisalRequirement({ maxLtvPct: null, appraisalValue: '', canOverride: false })).toEqual({ required: false, error: null })
  })
})
