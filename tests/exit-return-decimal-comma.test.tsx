import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * H-20: la coma decimal en las cantidades del EGRESO y de la DEVOLUCIÓN. Es el
 * mismo arreglo de 07e8259 (ingreso y transformación): en Colombia el decimal
 * se escribe con coma y `Number("1,5")` es NaN.
 *
 * - Egreso: el input era numérico controlado; "1,5" se descartaba y la línea
 *   se quedaba en 1 — se daba de baja otra cantidad sin avisar.
 * - Devolución: "1,5" viajaba crudo y el backend respondía 422.
 */
const crearEgreso = vi.fn()
const crearDevolucion = vi.fn()

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/inventory/api', () => ({ useCreateExit: () => ({ mutateAsync: crearEgreso, isPending: false }) }))
vi.mock('@/components/shared/ItemPicker', () => ({
  ItemPicker: ({ onSelect }: { onSelect: (item: unknown) => void }) => (
    <button type="button" onClick={() => onSelect({ id: 'a1', name: 'Oro por gramo', code: 'JOA0001-01K', unit: 'gram', quantity: '5.000' })}>
      agregar
    </button>
  ),
}))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => null }))
vi.mock('@/lib/inventory/items', () => ({ useItemsByIds: () => ({ data: new Map([['i1', { id: 'i1', name: 'Oro por gramo', unit: 'gram' }]]) }) }))
vi.mock('@/lib/sales/returns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sales/returns')>()
  return { ...actual, useSaleReturns: () => ({ data: [] }), useCreateReturn: () => ({ mutateAsync: crearDevolucion, isPending: false }) }
})
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: ReactNode }) => children }))

const { ExitFormDialog } = await import('@/features/inventory/components/ExitFormDialog')
const { ReturnFormDialog } = await import('@/components/shared/ReturnFormDialog')

const venta = {
  id: 's1',
  number: 3,
  status: 'completed',
  payment_method: 'cash',
  sold_at: '2026-09-27T15:00:00Z',
  total: '660000.00',
  discount_amount: '0.00',
  customer_id: null,
  void_reason: null,
  credit_note_redeemed_amount: null,
  returned_amount: '0.00',
  lines: [{ id: 'l1', item_id: 'i1', quantity: '2.200', unit_price: '300000.00', unit_cost: '200000.00', subtotal: '660000.00' }],
} as unknown as Parameters<typeof ReturnFormDialog>[0]['sale']

beforeEach(() => {
  crearEgreso.mockReset().mockResolvedValue({})
  crearDevolucion.mockReset().mockResolvedValue({ refunded_amount: '0.00', credit_note_amount: '0.00', lines: [] })
})
afterEach(cleanup)

describe('egreso — cantidad con coma', () => {
  it('"1,5" g viaja como "1.5"', async () => {
    render(<ExitFormDialog open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByText('agregar'))
    const cantidad = screen.getByLabelText(/Cantidad en/i) as HTMLInputElement
    fireEvent.change(cantidad, { target: { value: '1,5' } })
    expect(cantidad.value).toBe('1,5')
    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Merma de fundición' } })
    fireEvent.submit(document.getElementById('exit-form')!)
    await waitFor(() => expect(crearEgreso).toHaveBeenCalled())
    expect(crearEgreso.mock.calls[0]![0].lines[0].quantity).toBe('1.5')
  })

  it('más de 3 decimales se señala antes de enviar', async () => {
    render(<ExitFormDialog open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByText('agregar'))
    fireEvent.change(screen.getByLabelText(/Cantidad en/i), { target: { value: '1,0001' } })
    fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Merma' } })
    fireEvent.submit(document.getElementById('exit-form')!)
    await waitFor(() => expect(screen.getByText(/3 decimales/i)).toBeInTheDocument())
    expect(crearEgreso).not.toHaveBeenCalled()
  })
})

describe('devolución — cantidad con coma', () => {
  it('"1,5" viaja como "1.5"', async () => {
    const { container } = render(<ReturnFormDialog open onOpenChange={() => {}} sale={venta} />)
    fireEvent.click(screen.getAllByRole('checkbox')[0]!)
    fireEvent.change(screen.getByLabelText(/Cantidad a devolver/i), { target: { value: '1,5' } })
    fireEvent.submit(container.ownerDocument.querySelector('form')!)
    await waitFor(() => expect(crearDevolucion).toHaveBeenCalled())
    expect(crearDevolucion.mock.calls[0]![0].lines[0].quantity).toBe('1.5')
  })
})
