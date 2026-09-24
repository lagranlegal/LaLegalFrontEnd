import { describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiError } from '@/lib/api/errors'

/**
 * F21-02 — anular una venta exige caja abierta.
 *
 * Anular MUEVE CAJA: el backend emite un contra-movimiento `out` por el total
 * (`sales/service.py::void_sale`), así que comprueba la sesión antes de tocar
 * nada y **sin importar el medio de pago** — anular una venta pagada por
 * transferencia también se cae si la caja está cerrada.
 *
 * Lo que el comprobante hacía era un toast con el texto del error. Aunque el
 * texto fuera el del backend ("no hay una sesión de caja abierta"), el toast
 * es un callejón sin salida: nombra lo que falta y no da dónde hacerlo. El
 * patrón que ya usan diez operaciones de dinero es
 * `CashSessionRequiredDialog`, que ofrece "Abrir caja" a quien tiene el
 * permiso y le dice a quién pedírselo a quien no.
 *
 * El sobre del error está copiado de `void_sale` literal (409 +
 * `CASH_SESSION_NOT_OPEN`), no escrito de memoria.
 */

const mutateAsync = vi.fn()
const toastError = vi.fn()
const toastSuccess = vi.fn()

vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a), success: (...a: unknown[]) => toastSuccess(...a) } }))
vi.mock('@/lib/sales/void', () => ({ useVoidSale: () => ({ mutateAsync, isPending: false }) }))
vi.mock('@/components/shared/confirmStore', () => ({
  confirm: () => Promise.resolve({ confirmed: true, reason: 'error de digitación' }),
}))
// `Can` sin permisos reales: lo que se prueba es la ruta del error, no el gate.
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/components/shared/PrintLayout', () => ({ PrintLayout: () => null }))
vi.mock('@/components/shared/ReturnFormDialog', () => ({ ReturnFormDialog: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({
  CashSessionRequiredDialog: ({ open }: { open: boolean }) => (open ? <div>MODAL_ABRIR_CAJA</div> : null),
}))
vi.mock('@/lib/customers/search', () => ({ useCustomer: () => ({ data: undefined }) }))
vi.mock('@/lib/inventory/items', () => ({ useItemsByIds: () => ({ data: new Map() }) }))
vi.mock('@/lib/sales/returns', () => ({
  useSaleReturns: () => ({ data: [] }),
  RETURN_REASON_LABELS: {},
  RETURN_SETTLEMENT_LABELS: {},
}))

const { SaleReceiptDialog } = await import('@/components/shared/SaleReceiptDialog')

const venta = {
  id: '11111111-1111-1111-1111-111111111111',
  number: 14,
  status: 'completed',
  payment_method: 'transfer',
  sold_at: '2026-09-23T15:04:05Z',
  total: '250000.00',
  discount_amount: '0.00',
  customer_id: null,
  void_reason: null,
  lines: [],
} as unknown as Parameters<typeof SaleReceiptDialog>[0]['sale']

beforeEach(() => {
  // Sin `globals: true` en la config de Vitest no hay cleanup automático:
  // el DOM del test anterior sobrevive y el `queryByText` de abajo
  // encontraría el modal del PRIMER caso.
  cleanup()
  mutateAsync.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
})

describe('anular una venta con la caja cerrada', () => {
  it('abre el modal de "Abrir caja" en vez de un toast sin salida', async () => {
    mutateAsync.mockRejectedValue(
      new ApiError({
        code: 'CASH_SESSION_NOT_OPEN',
        message: 'No hay una sesión de caja abierta para anular la venta.',
        status: 409,
        details: {},
      }),
    )

    render(<SaleReceiptDialog open onOpenChange={() => {}} sale={venta} />)
    fireEvent.click(screen.getByRole('button', { name: 'Anular venta' }))

    expect(await screen.findByText('MODAL_ABRIR_CAJA')).toBeInTheDocument()
    // Un toast acá sería el callejón sin salida: el aviso se va solo y no
    // deja ningún botón para hacer lo que falta.
    expect(toastError).not.toHaveBeenCalled()
  })

  it('cualquier otro rechazo sigue mostrando el mensaje del backend (SALE_HAS_RETURNS)', async () => {
    mutateAsync.mockRejectedValue(
      new ApiError({
        code: 'SALE_HAS_RETURNS',
        message:
          'Esta venta ya tiene 1 devolución y por eso no se puede anular: lo devuelto ya se liquidó con el cliente.',
        status: 409,
        details: { return_count: 1, return_numbers: [4] },
      }),
    )

    render(<SaleReceiptDialog open onOpenChange={() => {}} sale={venta} />)
    fireEvent.click(screen.getByRole('button', { name: 'Anular venta' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(expect.stringContaining('ya tiene 1 devolución')))
    expect(screen.queryByText('MODAL_ABRIR_CAJA')).not.toBeInTheDocument()
  })
})
