import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { belowPriceDiscount } from '@/lib/sales/discount'

/**
 * F6-05 del backend (commit ed9ab91, 27/09/2026): una línea con `unit_price`
 * MENOR que el precio publicado del producto es un descuento igual que el
 * `discount_amount`. Exige `sales.apply_discount` (403 con
 * `details.permission`) y motivo (400 con `details.price_discount`).
 *
 * Los sobres son reales: copiados de la respuesta del backend local
 * (TestClient) en `test_sales.py::test_vender_debajo_del_precio_exige_*`.
 */
const SIN_MOTIVO = {
  status: 400,
  body: {
    code: 'BAD_REQUEST',
    message: 'Vender por debajo del precio publicado es un descuento: requiere un motivo.',
    details: { price_discount: '50000.00' },
  },
}

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

/** Forma de `ItemOut` (src/types/api.ts). */
const ANILLO = {
  id: 'a1',
  code: 'JOA0008-01K',
  name: 'Anillo oro 18k',
  cat1_id: 'c1',
  cat2_id: 'c2',
  cat3_id: 'c3',
  description: null,
  origin: 'purchase',
  supplier_id: null,
  source_contract_id: null,
  cost: '100000.00',
  sale_price: '500000.00',
  quantity: '1.000',
  unit: 'unit',
  unit_abbr: 'und',
  status: 'available',
  photos: [],
  entry_date: '2026-09-20',
  product_id: null,
  lot_number: 1,
}

async function montarConAnillo() {
  apiGet.mockResolvedValue({ data: { items: [ANILLO] } })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <SaleFormPage />
    </QueryClientProvider>,
  )
  const buscador = screen.getByPlaceholderText(/artículo por código/i)
  fireEvent.change(buscador, { target: { value: 'JOA0008-01K' } })
  fireEvent.keyDown(buscador, { key: 'Enter' })
  await waitFor(() => expect(screen.queryByText(/El carrito está vacío/i)).toBeNull())
}

beforeEach(() => {
  mutateAsync.mockReset()
  apiGet.mockReset()
  permisos = []
})
afterEach(cleanup)

describe('belowPriceDiscount — lo que se rebaja del precio publicado', () => {
  it('suma (publicado − cobrado) × cantidad solo de las líneas por debajo', () => {
    expect(
      belowPriceDiscount([
        { publishedPrice: '500000.00', unitPrice: '450000.00', quantity: 1 },
        { publishedPrice: '300000.00', unitPrice: '350000.00', quantity: 1 }, // por encima: libre
        { publishedPrice: '19230.00', unitPrice: '19000.00', quantity: '12.5' },
        { publishedPrice: null, unitPrice: '1.00', quantity: 1 }, // sin precio publicado: no hay contra qué
      ]),
    ).toBe('52875.00')
  })

  it('sin rebaja es cero', () => {
    expect(belowPriceDiscount([{ publishedPrice: '500000.00', unitPrice: '500000.00', quantity: 2 }])).toBe('0.00')
  })
})

describe('POS — vender por debajo del precio publicado', () => {
  it('sin sales.apply_discount el precio de la línea no se puede editar', async () => {
    await montarConAnillo()
    expect(screen.queryByLabelText(/Precio de Anillo oro 18k/i)).toBeNull()
  })

  it('con el permiso, bajar el precio pide motivo antes de enviar y avisa que es un descuento', async () => {
    permisos = ['sales.apply_discount']
    await montarConAnillo()
    const precio = screen.getByLabelText(/Precio de Anillo oro 18k/i)
    fireEvent.change(precio, { target: { value: '450.000' } })

    expect(screen.getByText(/por debajo del precio publicado/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Vender/ }))
    await waitFor(() => expect(screen.getByText(/necesita un motivo/i)).toBeInTheDocument())
    expect(mutateAsync).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Motivo del descuento/i), { target: { value: 'Cliente frecuente' } })
    fireEvent.click(screen.getByRole('button', { name: /Vender/ }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    const body = mutateAsync.mock.calls[0]![0]
    expect(body.lines[0].unit_price).toBe('450000.00')
    expect(body.discount_reason).toBe('Cliente frecuente')
    expect(body.discount_amount).toBeNull()
  })

  it('si el backend pide motivo (el precio publicado cambió con el carrito armado), aparece el campo', async () => {
    mutateAsync.mockRejectedValueOnce(parseApiError(SIN_MOTIVO.status, SIN_MOTIVO.body))
    await montarConAnillo()
    fireEvent.click(screen.getByRole('button', { name: /Vender/ }))
    await waitFor(() => expect(screen.getByText(SIN_MOTIVO.body.message)).toBeInTheDocument())
    expect(screen.getByLabelText(/Motivo del descuento/i)).toBeInTheDocument()
  })
})
