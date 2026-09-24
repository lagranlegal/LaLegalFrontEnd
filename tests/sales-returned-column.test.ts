import { describe, expect, it } from 'vitest'
import { returnExtent, saleExportRow } from '@/features/sales/export'
import type { Sale } from '@/features/sales/api'

// F21-17: `returned_amount` es lo devuelto NETO de su parte prorrateada del
// descuento (backend `SaleOut`), así que una venta devuelta completa da
// exactamente su `total`. `status` sigue en `completed` a propósito.
function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    number: 42,
    sold_at: '2026-09-20T15:30:00Z',
    customer_id: null,
    payment_method: 'cash',
    discount_amount: '100000.00',
    total: '900000.00',
    status: 'completed',
    void_reason: null,
    credit_note_redeemed_amount: null,
    returned_amount: '0.00',
    lines: [],
    ...overrides,
  } as Sale
}

describe('returnExtent', () => {
  it('sin devoluciones es none', () => {
    expect(returnExtent(sale())).toBe('none')
  })

  it('devolución parcial: menos que el total', () => {
    expect(returnExtent(sale({ returned_amount: '450000.00' }))).toBe('partial')
  })

  it('devolución total: igual al total aunque venga escrito distinto', () => {
    expect(returnExtent(sale({ returned_amount: '900000' }))).toBe('full')
  })
})

describe('saleExportRow', () => {
  it('sin devoluciones la columna Devuelto va vacía, como Nota crédito redimida', () => {
    const row = saleExportRow(sale(), '')
    expect(row.Devuelto).toBe('')
    expect(row.Estado).toBe('Completada')
  })

  it('con devolución la columna Devuelto trae el monto en pesos como número', () => {
    expect(saleExportRow(sale({ returned_amount: '450000.00' }), '').Devuelto).toBe(450000)
    expect(saleExportRow(sale({ returned_amount: '900000.00' }), '').Devuelto).toBe(900000)
  })

  it('Devuelto va justo después de Total y antes de Estado', () => {
    const keys = Object.keys(saleExportRow(sale({ returned_amount: '450000.00' }), 'Ana'))
    expect(keys.slice(keys.indexOf('Total'), keys.indexOf('Total') + 3)).toEqual(['Total', 'Devuelto', 'Estado'])
  })

  it('conserva el resto de columnas del export', () => {
    const row = saleExportRow(sale({ credit_note_redeemed_amount: '200000.00' }), 'Ana Pérez')
    expect(row).toMatchObject({
      Número: 42,
      Cliente: 'Ana Pérez',
      'Medio de pago': 'Efectivo',
      Descuento: 100000,
      'Nota crédito redimida': 200000,
      Total: 900000,
      'Motivo de anulación': '',
    })
  })
})
