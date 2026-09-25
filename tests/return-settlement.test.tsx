import { describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * F21-37 — la devolución de una venta pagada con nota crédito se PARTE: lo
 * pagado con nota vuelve como una nota nueva y solo lo pagado en plata sale
 * del cajón (`backend-starter/app/modules/sales/settlement.py`). El backend
 * calcula el reparto; el front solo lo muestra — en el recibo (por
 * devolución), en el toast al registrarla y, antes de registrarla, avisando
 * que la venta se pagó con nota.
 *
 * `devolucionMixta` es la respuesta REAL del backend local (el caso de
 * $800.000 = $500.000 de nota + $300.000 en efectivo, devuelta completa en
 * efectivo), no escrita de memoria.
 */

const devolucionMixta = {
  id: 'f5d0cfd2-d175-4816-9a4a-dc2d94032e1b',
  number: 2,
  sale_id: 'b84f404e-5862-4cf3-a9a1-121843d0d01c',
  customer_id: '3081106b-c385-4425-9609-fcd5bcf02df9',
  reason: 'other',
  settlement_method: 'cash',
  notes: null,
  return_date: '2026-09-25',
  created_at: '2026-09-25T22:33:33.603181Z',
  lines: [
    {
      id: 'c14914b2-b6d7-4ace-94dc-fa9a41fb5d22',
      sale_line_id: '1faf2552-7ad8-46a3-b23b-7d3cc085f8f1',
      item_id: 'c23dba61-0203-40ae-8922-a67a34520436',
      quantity: '1.000',
      unit_cost: '300000.00',
      restock: true,
    },
  ],
  credit_note_id: 'd054b2c7-3102-4efd-82df-05fbb6ff23e8',
  total_amount: '800000.00',
  refunded_amount: '300000.00',
  credit_note_amount: '500000.00',
  credit_note_number: 2,
  time_limit_warning: false,
}

const soloEfectivo = { ...devolucionMixta, credit_note_id: null, credit_note_number: null, total_amount: '500000.00', refunded_amount: '500000.00', credit_note_amount: '0.00' }

const mutateAsync = vi.fn()
const toastSuccess = vi.fn()
let returnsData: unknown[] = []

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: (...a: unknown[]) => toastSuccess(...a) } }))
vi.mock('@/lib/sales/void', () => ({ useVoidSale: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/components/shared/PrintLayout', () => ({ PrintLayout: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => null }))
vi.mock('@/lib/customers/search', () => ({ useCustomer: () => ({ data: undefined }) }))
vi.mock('@/lib/inventory/items', () => ({ useItemsByIds: () => ({ data: new Map() }) }))
vi.mock('@/lib/sales/returns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sales/returns')>()
  return {
    ...actual,
    useSaleReturns: () => ({ data: returnsData }),
    useCreateReturn: () => ({ mutateAsync, isPending: false }),
  }
})

const { returnSettlementParts } = await import('@/lib/sales/returns')
const { SaleReceiptDialog } = await import('@/components/shared/SaleReceiptDialog')
const { ReturnFormDialog } = await import('@/components/shared/ReturnFormDialog')

const venta = {
  id: 'b84f404e-5862-4cf3-a9a1-121843d0d01c',
  number: 7,
  status: 'completed',
  payment_method: 'cash',
  sold_at: '2026-09-25T15:04:05Z',
  total: '800000.00',
  discount_amount: '0.00',
  customer_id: '3081106b-c385-4425-9609-fcd5bcf02df9',
  void_reason: null,
  credit_note_redeemed_amount: '500000.00',
  returned_amount: '0.00',
  lines: [{ id: '1faf2552-7ad8-46a3-b23b-7d3cc085f8f1', item_id: 'c23dba61-0203-40ae-8922-a67a34520436', quantity: '1.000', unit_price: '800000.00', unit_cost: '300000.00', subtotal: '800000.00' }],
} as unknown as Parameters<typeof SaleReceiptDialog>[0]['sale']

beforeEach(() => {
  cleanup()
  mutateAsync.mockReset()
  toastSuccess.mockReset()
  returnsData = []
})

describe('returnSettlementParts', () => {
  it('la devolución mixta tiene dos partes: efectivo y la nota nueva con su número', () => {
    expect(returnSettlementParts(devolucionMixta)).toEqual([
      { kind: 'cash', label: 'Efectivo', amount: '300000.00' },
      { kind: 'credit_note', label: 'Nota crédito #2', amount: '500000.00' },
    ])
  })

  it('sin nota de por medio es una sola parte, como antes', () => {
    expect(returnSettlementParts(soloEfectivo)).toEqual([{ kind: 'cash', label: 'Efectivo', amount: '500000.00' }])
  })
})

describe('recibo de la venta', () => {
  it('muestra por devolución cuánto salió en efectivo y cuánto quedó en qué nota', () => {
    returnsData = [devolucionMixta]
    render(<SaleReceiptDialog open onOpenChange={() => {}} sale={venta} />)
    // La línea del reparto: la que nombra la nota nueva, con las dos partes.
    const reparto = screen.getByText(/Nota crédito #2/).closest('p')
    expect(reparto?.textContent).toMatch(/Efectivo .*300\.000 · Nota crédito #2 .*500\.000/)
    // Y no el total como si todo hubiera salido del cajón.
    expect(reparto?.textContent).not.toMatch(/800\.000/)
  })
})

describe('diálogo de devolución', () => {
  it('avisa que la venta se pagó con nota y que esa parte vuelve como nota nueva', () => {
    render(<ReturnFormDialog open onOpenChange={() => {}} sale={venta} />)
    expect(screen.getByText(/se pagó .*500\.000.* con nota crédito/)).toBeInTheDocument()
  })

  it('una venta sin nota no muestra el aviso', () => {
    render(<ReturnFormDialog open onOpenChange={() => {}} sale={{ ...venta, credit_note_redeemed_amount: null }} />)
    expect(screen.queryByText(/con nota crédito/)).not.toBeInTheDocument()
  })

  it('al registrar, el toast dice el reparto que devolvió el backend', async () => {
    mutateAsync.mockResolvedValue(devolucionMixta)
    render(<ReturnFormDialog open onOpenChange={() => {}} sale={venta} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Disponible para devolver/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar devolución' }))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    const [, opts] = toastSuccess.mock.calls[0] as [string, { description: string }]
    expect(opts.description).toMatch(/Efectivo .*300\.000/)
    expect(opts.description).toMatch(/Nota crédito #2 .*500\.000/)
  })
})
