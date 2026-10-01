import saleFixtures from './fixtures/backend-f1.json'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-f1.json'

/**
 * Vender por debajo del COSTO del lote (backend e8a3560, auditoría fase 7):
 * sin `sales.apply_discount` es 403 SALE_BELOW_COST_REQUIRES_PERMISSION con
 * `details.below_cost_lines`. El sobre es real (tests/fixtures/backend-f1.json,
 * `test_vender_bajo_costo_exige_permiso_y_queda_auditado`): costo 300.000,
 * precio 250.000.
 */
const RECHAZO = fixtures.sale_error_bajo_costo.body
const LINEA = RECHAZO.details.below_cost_lines[0]!

const mutateAsync = vi.fn()
const apiGet = vi.fn()
let permisos: string[] = []

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: 'idle' }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/lib/api/client', async () => {
  const errors = await import('@/lib/api/errors')
  return {
    api: { GET: (...a: unknown[]) => apiGet(...a) },
    unwrap: async (p: Promise<{ data: unknown }>) => (await p).data,
    ApiError: errors.ApiError,
    NetworkError: errors.NetworkError,
  }
})
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => permisos.includes(code) }))
vi.mock('@/features/sales/api', () => ({ useCreateSale: () => ({ mutateAsync, isPending: false }) }))
vi.mock('@/lib/sales/creditNotes', () => ({ useCustomerCreditNotes: () => ({ data: undefined }) }))
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => <input aria-label="Cliente" /> }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
// Rediseño P1: el envío pasa por la confirmación con resumen (F9-18); acá se
// acepta sola para probar lo que viene después.
vi.mock('@/components/shared/confirmStore', () => ({ confirm: vi.fn(async () => ({ confirmed: true })) }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [] }) }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))

const { SaleFormPage } = await import('@/features/sales/pages/SaleFormPage')
const { parseApiError } = await import('@/lib/api/errors')


/** Forma de `ItemOut`; el id es el del sobre real para que el 403 marque la línea. */
function pieza(cost: string) {
  return {
    id: LINEA.item_id, code: 'JOA0009-01K', name: 'Pulsera oro', cat1_id: 'c1', cat2_id: 'c2', cat3_id: 'c3', description: null,
    origin: 'purchase', supplier_id: null, source_contract_id: null, cost, sale_price: '400000.00', quantity: '1.000', unit: 'unit',
    unit_abbr: 'und', status: 'available', photos: [], entry_date: '2026-09-20', product_id: null, lot_number: 1,
  }
}

async function montar(cost: string) {
  apiGet.mockResolvedValue({ data: { items: [pieza(cost)] } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <SaleFormPage />
    </QueryClientProvider>,
  )
  const buscador = screen.getByPlaceholderText(/Escanea o escribe código o nombre/i)
  fireEvent.change(buscador, { target: { value: 'JOA0009-01K' } })
  fireEvent.keyDown(buscador, { key: 'Enter' })
  await waitFor(() => expect(screen.queryByText(/El carrito está vacío/i)).toBeNull())
}

beforeEach(() => {
  mutateAsync.mockReset()
  // La venta registrada real (fixture): sin ella la tarjeta de cierre recibe undefined.
  mutateAsync.mockResolvedValue(saleFixtures.sale_bajo_precio_publicado.body)
  apiGet.mockReset()
  permisos = []
})
afterEach(cleanup)

describe('POS — vender por debajo del costo', () => {
  it('avisa en la línea y exige confirmarlo antes de enviar', async () => {
    permisos = ['sales.apply_discount']
    await montar(LINEA.unit_cost)
    expect(screen.queryByText(/por debajo del costo/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar precio de Pulsera oro' }))
    fireEvent.change(screen.getByRole('textbox', { name: /^Precio de Pulsera oro/ }), { target: { value: '250.000' } })
    expect(screen.getByText(/Por debajo del costo \(/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Motivo del descuento/i), { target: { value: 'Liquidación' } })
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar/ }))
    await waitFor(() => expect(screen.getByText(/confirma que quieres venderlos con pérdida/i)).toBeInTheDocument())
    expect(mutateAsync).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText(/Confirmo que vendo por debajo del costo/i))
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar/ }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0]![0].lines[0].unit_price).toBe('250000.00')
  })

  it('el 403 del backend se explica con la pérdida y marca la línea', async () => {
    // El costo que cargó la pantalla no dejaba ver la pérdida (cambió con el carrito armado).
    mutateAsync.mockRejectedValueOnce(parseApiError(403, RECHAZO))
    await montar('100000.00')
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar/ }))
    await waitFor(() => expect(screen.getByText(/la venta perdería/)).toBeInTheDocument())
    expect(screen.getByText(/Por debajo del costo \(/)).toBeInTheDocument()
  })
})
