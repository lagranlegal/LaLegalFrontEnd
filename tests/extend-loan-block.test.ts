import { describe, expect, it } from 'vitest'
import { extensionBlock } from '@/features/contracts/extensionBlock'

/**
 * Qué muestra el panel «Ampliar el préstamo» según el motivo que devuelve
 * `GET /contracts/{id}/extension-options`.
 *
 * Nació del reporte «solo se puede ampliar una vez el contrato» (25/09/2026,
 * F21-38). El backend nunca lo prohibió —una cadena A → B → C funciona—, pero
 * la pantalla lo parecía por dos caminos:
 *
 * 1. La primera ampliación casi siempre se lleva TODO el cupo, y el sucesor
 *    llega con `EXTENSION_NO_HEADROOM`. El panel escondía el formulario aun
 *    para quien tiene `contracts.override_ltv`, que por RECARGOS §8.1 sí
 *    puede prestar por encima del avalúo (y el backend lo acepta).
 * 2. Con la ventana vencida decía «Pasó el plazo» sin explicar que el plazo
 *    se cuenta desde el contrato ORIGINAL y que ampliar no lo reinicia — que
 *    es deliberado (§3), pero invisible desde el sucesor.
 */
describe('extensionBlock', () => {
  it('sin cupo y SIN el permiso, bloquea y dice quién puede autorizarlo', () => {
    const r = extensionBlock({ blockedReason: 'EXTENSION_NO_HEADROOM', canOverrideLtv: false, windowEndsOn: '2026-10-01' })
    expect(r.kind).toBe('blocked')
    expect(r.kind === 'blocked' && r.message).toMatch(/tope del avalúo/)
    expect(r.kind === 'blocked' && r.message).toMatch(/permiso/)
  })

  it('sin cupo y CON contracts.override_ltv, el formulario sigue abierto (F21-38)', () => {
    const r = extensionBlock({ blockedReason: 'EXTENSION_NO_HEADROOM', canOverrideLtv: true, windowEndsOn: '2026-10-01' })
    expect(r).toEqual({ kind: 'open', overLimitOnly: true })
  })

  it('con cupo, abierto sin advertencia', () => {
    expect(extensionBlock({ blockedReason: null, canOverrideLtv: false, windowEndsOn: '2026-10-01' })).toEqual({
      kind: 'open',
      overLimitOnly: false,
    })
  })

  it('el permiso NO abre los bloqueos duros: mora, ventana, sin avalúo', () => {
    for (const reason of ['CONTRACT_INTEREST_OVERDUE', 'EXTENSION_WINDOW_CLOSED', 'CONTRACT_WITHOUT_APPRAISAL']) {
      expect(extensionBlock({ blockedReason: reason, canOverrideLtv: true, windowEndsOn: '2026-10-01' }).kind).toBe('blocked')
    }
  })

  it('un contrato cerrado no muestra el panel: el aviso de la cadena lleva al sucesor', () => {
    expect(extensionBlock({ blockedReason: 'CONTRACT_CLOSED', canOverrideLtv: true, windowEndsOn: null })).toEqual({ kind: 'hidden' })
  })

  it('en un sucesor, la ventana vencida nombra al contrato original y dice que ampliar no la reinicia', () => {
    const r = extensionBlock({
      blockedReason: 'EXTENSION_WINDOW_CLOSED',
      canOverrideLtv: true,
      windowEndsOn: '2026-09-19',
      root: { number: 9, start_date: '2026-08-22' },
    })
    expect(r.kind).toBe('blocked')
    const msg = r.kind === 'blocked' ? r.message : ''
    expect(msg).toContain('#9')
    expect(msg).toContain('22/08/2026')
    expect(msg).toContain('19/09/2026')
    expect(msg).toMatch(/no reinicia/)
  })

  it('en un contrato sin cadena, la ventana vencida dice la fecha', () => {
    const r = extensionBlock({ blockedReason: 'EXTENSION_WINDOW_CLOSED', canOverrideLtv: false, windowEndsOn: '2026-09-19' })
    expect(r.kind === 'blocked' && r.message).toContain('19/09/2026')
  })

  it('con 0 días para ampliar no habla de un plazo vencido: el contrato no admite ampliaciones', () => {
    const r = extensionBlock({ blockedReason: 'EXTENSION_WINDOW_CLOSED', canOverrideLtv: false, windowEndsOn: null })
    expect(r.kind === 'blocked' && r.message).toMatch(/no admite ampliaciones/)
  })
})
