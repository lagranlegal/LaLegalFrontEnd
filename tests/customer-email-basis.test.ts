import { describe, expect, it } from 'vitest'
import { emailNoticeStatus, isValidEmailShape } from '@/features/customers/emailBasis'

/**
 * Lo que la ficha dice de los avisos por correo de un cliente
 * (`../backend-starter/docs/NOTIFICACIONES.md` §9.2). El orden tiene que ser el
 * del backend (`customer_gate`): sin correo, baja, rebote, y después la base.
 */

const base = {
  email: 'juana@example.com',
  email_basis: null,
  email_consent_at: null,
  email_opt_out_at: null,
  email_invalid_at: null,
} as const

describe('emailNoticeStatus', () => {
  it('tener correo no es tener autorización', () => {
    expect(emailNoticeStatus(base)).toEqual({ text: 'Sin autorización: no se le escribe', tone: 'muted' })
  })

  it('sin correo no hay nada que decir de la base', () => {
    expect(emailNoticeStatus({ ...base, email: null, email_basis: 'consent', email_consent_at: '2026-09-25T15:00:00Z' }).text).toBe('Sin correo')
    expect(emailNoticeStatus({ ...base, email: '   ' }).text).toBe('Sin correo')
  })

  it('la base contractual y la autorización expresa se distinguen', () => {
    expect(emailNoticeStatus({ ...base, email_basis: 'contract' })).toEqual({ text: 'Solo de sus contratos vigentes', tone: 'ok' })
    expect(emailNoticeStatus({ ...base, email_basis: 'consent', email_consent_at: '2026-09-25T15:00:00Z' })).toEqual({
      text: 'Autorizó recibirlos (25/09/2026 10:00 AM)',
      tone: 'ok',
    })
  })

  it('la baja gana sobre cualquier base, y el rebote también', () => {
    const conConsentimiento = { ...base, email_basis: 'consent' as const, email_consent_at: '2026-09-01T15:00:00Z' }
    expect(emailNoticeStatus({ ...conConsentimiento, email_opt_out_at: '2026-09-25T15:00:00Z' })).toEqual({
      text: 'Pidió no recibirlos (25/09/2026 10:00 AM)',
      tone: 'warning',
    })
    expect(emailNoticeStatus({ ...conConsentimiento, email_invalid_at: '2026-09-25T15:00:00Z' }).tone).toBe('warning')
  })
})

describe('isValidEmailShape', () => {
  it('es la misma forma que valida el formulario', () => {
    expect(isValidEmailShape('juana@example.com')).toBe(true)
    expect(isValidEmailShape('juana@gmial,com')).toBe(false)
    expect(isValidEmailShape('juanaperez.com')).toBe(false)
  })
})
