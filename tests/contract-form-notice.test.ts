import { describe, expect, it } from 'vitest'
import { customerNoticePayload, customerNoticeState } from '@/features/contracts/customerNotice'

/**
 * El correo y la casilla de avisos al crear el contrato (NOTIFICACIONES
 * §9.2-f): qué viaja en `POST /contracts`. Del lado del backend la misma
 * operación los escribe en la ficha con origen `contract_form`.
 */
const sinCorreo = { email: null, email_basis: null, email_opt_out_at: null }
const conCorreo = { email: 'juana@example.com', email_basis: 'contract' as const, email_opt_out_at: null }

describe('customerNoticePayload', () => {
  it('cliente sin correo: el correo escrito viaja y la casilla marcada también', () => {
    expect(customerNoticePayload(sinCorreo, { customer_email: ' nuevo@example.com ', customer_email_consent: true })).toEqual({
      customer_email: 'nuevo@example.com',
      customer_email_consent: true,
    })
  })

  it('la casilla sin correo no viaja: no autoriza nada', () => {
    expect(customerNoticePayload(sinCorreo, { customer_email: '', customer_email_consent: true })).toEqual({})
    expect(customerNoticePayload(sinCorreo, { customer_email: 'no-es-correo', customer_email_consent: true })).toEqual({
      customer_email: 'no-es-correo',
    })
  })

  it('cliente con correo: no se reenvía el correo, solo la casilla', () => {
    expect(customerNoticePayload(conCorreo, { customer_email: '', customer_email_consent: true })).toEqual({
      customer_email_consent: true,
    })
  })

  it('una casilla sin marcar no viaja: no es una decisión de nadie', () => {
    expect(customerNoticePayload(conCorreo, { customer_email: '', customer_email_consent: false })).toEqual({})
  })

  it('quien ya autorizó o pidió la baja no recibe la casilla', () => {
    const yaAutorizo = { ...conCorreo, email_basis: 'consent' as const }
    const deBaja = { ...conCorreo, email_opt_out_at: '2026-09-20T15:00:00Z' }
    expect(customerNoticeState(yaAutorizo, '').offersConsent).toBe(false)
    expect(customerNoticeState(deBaja, '').offersConsent).toBe(false)
    expect(customerNoticePayload(deBaja, { customer_email: '', customer_email_consent: true })).toEqual({})
  })
})
