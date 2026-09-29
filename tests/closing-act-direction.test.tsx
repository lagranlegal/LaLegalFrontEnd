import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import fixtures from './fixtures/backend-f1.json'
import { movementLabel } from '@/lib/modules'

// Desglose REAL de una sesión con una venta, su anulación (sale/out), una
// compra y una devolución pagada (ver `_test` del fixture).
const { report, closing } = fixtures.acta_con_anulacion.body

vi.mock('@/lib/auth/me', () => ({
  useMe: () => ({ data: { company: { name: 'ZZ QA', legal_name: 'QA S.A.S.', tax_id: '900123456-7', logo_url: null, signature_url: null, address: 'Calle 1', contact_phone: '300', documents: {} } } }),
}))
vi.mock('@/lib/storage/photos', () => ({ useSignedPhotoUrl: () => ({ data: undefined }) }))
vi.mock('@/features/cashbox/api', () => ({ useSessionReport: () => ({ data: report, isPending: false, isError: false }) }))
const { ClosingActDialog } = await import('@/features/cashbox/components/ClosingActDialog')

afterEach(cleanup)

describe('acta de cierre — respeta la dirección del movimiento (F8-12)', () => {
  it('la anulación de una venta se imprime como salida, no como «Venta»', () => {
    const { baseElement } = render(<ClosingActDialog open onOpenChange={() => {}} closing={closing as never} />)
    const doc = baseElement.querySelector('[data-print-document]') as HTMLElement
    const filas = [...doc.querySelectorAll('tbody tr')].map((r) => r.textContent ?? '')
    expect(filas.filter((f) => f.includes('Venta') && !f.includes('Anulación'))).toHaveLength(1)
    const anulacion = filas.find((f) => f.includes('Anulación de venta'))
    expect(anulacion).toContain('Salida')
    expect(filas.find((f) => f.includes('Devolución a cliente'))).toContain('Salida')
  })

  it('movementLabel nombra las reversas', () => {
    expect(movementLabel('sale', 'in')).toBe('Venta')
    expect(movementLabel('sale', 'out')).toBe('Anulación de venta')
    expect(movementLabel('interest_payment', 'out')).toBe('Reversa: abono de interés')
    expect(movementLabel('expense', 'in')).toBe('Reversa: gasto')
    expect(movementLabel('sale_return', 'out')).toBe('Devolución a cliente')
  })
})
