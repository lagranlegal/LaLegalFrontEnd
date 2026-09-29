import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import fixtures from './fixtures/backend-g2.json'
import type { Customer } from '@/lib/customers/search'
import { ReceiptEmailNotice } from '@/features/sales/components/ReceiptEmailNotice'
import { receiptEmailBlockedByConsent } from '@/features/sales/receiptEmail'

/**
 * F8-07 (sin decisión legal todavía): el comprobante de venta solo le llega
 * al cliente con base legal (un contrato vivo o la autorización expresa).
 * Quien solo compra casi nunca la tiene, y el POS no lo decía: el correo
 * quedaba «suppressed» en silencio. Clientes: respuestas reales del backend
 * local.
 */
const conCorreoSinBase = fixtures.cliente_con_correo_sin_base.body as unknown as Customer
const conConsentimiento = fixtures.cliente_con_consentimiento.body as unknown as Customer
const baseContrato = fixtures.cliente_base_contrato.body as unknown as Customer
const sinCorreo = fixtures.cliente_sin_correo.body as unknown as Customer

afterEach(cleanup)

describe('POS — aviso de comprobante por correo', () => {
  it('con correo y sin base legal: avisa', () => {
    expect(receiptEmailBlockedByConsent(conCorreoSinBase)).toBe(true)
    const { container } = render(<ReceiptEmailNotice customer={conCorreoSinBase} />)
    expect(container.textContent).toBe('No recibirá el comprobante por correo: falta su autorización')
  })

  it.each([
    ['con autorización expresa', conConsentimiento],
    ['con base de contrato', baseContrato],
    ['sin correo (no es cuestión de autorización)', sinCorreo],
  ])('%s: no avisa', (_n, cliente) => {
    expect(receiptEmailBlockedByConsent(cliente)).toBe(false)
    expect(render(<ReceiptEmailNotice customer={cliente} />).container.textContent).toBe('')
  })

  it('si el backend no manda el dato (campo ausente), no se adivina', () => {
    const { email_basis: _omitido, ...sinDato } = conCorreoSinBase
    expect(receiptEmailBlockedByConsent(sinDato as Customer)).toBe(false)
  })
})
