import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * QA F6-03 (confirmado en vivo el 27/09/2026): en el punto de venta, Enter en
 * el buscador de artículos registró la venta del carrito ya armado —sin
 * confirmar, y sin agregar el artículo buscado—. Un lector de código de
 * barras manda Enter tras cada lectura: cada escaneo cobraba el carrito
 * anterior.
 *
 * jsdom no implementa el envío implícito de HTML (Enter → submit), así que
 * lo que se mide es su causa exacta: si el `keydown` de Enter llega al
 * navegador SIN `preventDefault`, el navegador envía el formulario.
 * `fireEvent` devuelve `false` cuando algún handler lo canceló.
 */

const mutateAsync = vi.fn()
const apiGet = vi.fn()

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
vi.mock('@/features/sales/api', () => ({ useCreateSale: () => ({ mutateAsync, isPending: false }) }))
vi.mock('@/lib/sales/creditNotes', () => ({ useCustomerCreditNotes: () => ({ data: undefined }) }))
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => <input aria-label="Cliente" /> }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: ReactNode }) => children }))
// El POS pregunta por `sales.apply_discount` para dejar editar el precio de
// la línea (F6-05); sin este mock, `useMe` leería el `apiGet` de artículos.
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => false }))

const { SaleFormPage } = await import('@/features/sales/pages/SaleFormPage')

/** Forma de `ItemOut` (src/types/api.ts, generado del openapi del backend). */
function articulo(over: Partial<Record<string, unknown>>) {
  return {
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
    sale_price: '250000.00',
    quantity: '1.000',
    unit: 'unit',
    unit_abbr: 'und',
    status: 'available',
    photos: [],
    entry_date: '2026-09-20',
    product_id: null,
    lot_number: 1,
    ...over,
  }
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <SaleFormPage />
    </QueryClientProvider>,
  )
  return screen.getByPlaceholderText(/Escanea o escribe código o nombre/i) as HTMLInputElement
}

beforeEach(() => {
  mutateAsync.mockReset()
  apiGet.mockReset()
})
afterEach(cleanup)

describe('POS — Enter en el buscador nunca cobra', () => {
  it('Enter en el buscador no deja pasar el envío implícito del formulario', () => {
    apiGet.mockResolvedValue({ data: { items: [] } })
    const buscador = montar()
    fireEvent.change(buscador, { target: { value: 'JOA0008' } })

    const noCancelado = fireEvent.keyDown(buscador, { key: 'Enter' })

    expect(noCancelado).toBe(false)
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('Enter con el código completo (lector de barras) agrega el artículo al carrito, sin esperar el debounce', async () => {
    apiGet.mockResolvedValue({ data: { items: [articulo({})] } })
    const buscador = montar()
    fireEvent.change(buscador, { target: { value: 'JOA0008-01K' } })

    fireEvent.keyDown(buscador, { key: 'Enter' })

    // Lo que prueba que entró al CARRITO (y no que solo se pintó la lista
    // de resultados) es que el carrito deja de estar vacío y el buscador se
    // limpia para la siguiente lectura.
    await waitFor(() => expect(screen.queryByText(/El carrito está vacío/i)).toBeNull())
    expect(buscador.value).toBe('')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('Enter con varios resultados y ninguno exacto no elige por el cajero', async () => {
    apiGet.mockResolvedValue({ data: { items: [articulo({ id: 'a1', code: 'JOA0008-01K' }), articulo({ id: 'a2', code: 'JOA0008-02L', name: 'Anillo plata' })] } })
    const buscador = montar()
    fireEvent.change(buscador, { target: { value: 'JOA0008' } })

    fireEvent.keyDown(buscador, { key: 'Enter' })

    await waitFor(() => expect(apiGet).toHaveBeenCalled())
    expect(screen.getByText(/El carrito está vacío/i)).toBeInTheDocument()
  })

  it('Enter en cualquier otro campo del formulario tampoco envía', () => {
    montar()
    const cliente = screen.getByLabelText('Cliente')

    expect(fireEvent.keyDown(cliente, { key: 'Enter' })).toBe(false)
  })
})
