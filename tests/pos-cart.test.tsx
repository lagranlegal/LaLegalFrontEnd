import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Rediseño P2, carrito del punto de venta: «Carrito · N artículos» con
 * «Vaciar», cantidad con −/+ de 40 px donde se puede contar (una pieza única
 * queda en 1, la cantidad nunca pasa del stock) y quitar la línea.
 */

const apiGet = vi.fn()
const confirmMock = vi.fn()

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
vi.mock('@/features/sales/api', () => ({ useCreateSale: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/lib/sales/creditNotes', () => ({ useCustomerCreditNotes: () => ({ data: undefined }) }))
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => <input aria-label="Buscar cliente" /> }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: (...a: unknown[]) => confirmMock(...a) }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => false }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [] }) }))

const { SaleFormPage } = await import('@/features/sales/pages/SaleFormPage')

/** Forma de `ItemOut` (src/types/api.ts, generado del openapi del backend). */
function articulo(over: Record<string, unknown>) {
  return {
    id: 'a1', code: 'JOA0008-01K', name: 'Anillo oro 18k', cat1_id: 'c1', cat2_id: 'c2', cat3_id: 'c3', description: 'usado, buen estado',
    origin: 'purchase', supplier_id: null, source_contract_id: null, cost: '100000.00', sale_price: '250000.00', quantity: '1.000', unit: 'unit',
    unit_abbr: 'und', status: 'available', photos: [], entry_date: '2026-09-20', product_id: null, lot_number: 1, ...over,
  }
}

async function agregar(item: ReturnType<typeof articulo>) {
  apiGet.mockResolvedValue({ data: { items: [item] } })
  const escaner = screen.getByRole('searchbox', { name: 'Escanear o buscar artículo' })
  fireEvent.change(escaner, { target: { value: item.code } })
  fireEvent.keyDown(escaner, { key: 'Enter' })
  await screen.findByText(item.name as string)
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SaleFormPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  apiGet.mockReset()
  confirmMock.mockReset()
})
afterEach(cleanup)

describe('POS — carrito', () => {
  it('cuenta las líneas, muestra código y detalle, y la pieza única queda en 1', async () => {
    montar()
    expect(screen.getByRole('heading', { name: 'Carrito' })).toBeInTheDocument()
    await agregar(articulo({}))
    expect(screen.getByRole('heading', { name: 'Carrito · 1 artículo' })).toBeInTheDocument()
    expect(screen.getByText('JOA0008-01K')).toHaveClass('font-mono')
    expect(screen.getByText('usado, buen estado')).toBeInTheDocument()
    const cantidad = screen.getByRole('group', { name: 'Cantidad de Anillo oro 18k' })
    expect(within(cantidad).getByRole('button', { name: 'Restar' })).toBeDisabled()
    expect(within(cantidad).getByRole('button', { name: 'Sumar' })).toBeDisabled()
    expect(within(cantidad).getByRole('button', { name: 'Sumar' })).toHaveClass('size-10')
  })

  it('con stock, +/− cambian la cantidad sin pasar del disponible y el monto sigue', async () => {
    montar()
    await agregar(articulo({ id: 'a2', code: 'PLA0112-03C', name: 'Cadena plata 925', sale_price: '145000.00', quantity: '2.000' }))
    const cantidad = screen.getByRole('group', { name: 'Cantidad de Cadena plata 925' })
    fireEvent.click(within(cantidad).getByRole('button', { name: 'Sumar' }))
    expect(cantidad).toHaveTextContent('2')
    expect(within(cantidad).getByRole('button', { name: 'Sumar' })).toBeDisabled()
    expect(screen.getAllByText(/290\.000/).length).toBeGreaterThan(0)
    fireEvent.click(within(cantidad).getByRole('button', { name: 'Restar' }))
    expect(cantidad).toHaveTextContent('1')
  })

  it('«Vaciar» pregunta antes, y al confirmar deja el carrito vacío con el foco en el escáner', async () => {
    montar()
    await agregar(articulo({}))
    confirmMock.mockResolvedValueOnce({ confirmed: false })
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar' }))
    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1))
    expect(screen.getByText('Anillo oro 18k')).toBeInTheDocument()

    confirmMock.mockResolvedValueOnce({ confirmed: true })
    fireEvent.click(screen.getByRole('button', { name: 'Vaciar' }))
    await screen.findByText(/El carrito está vacío/i)
    expect(screen.getByRole('searchbox', { name: 'Escanear o buscar artículo' })).toHaveFocus()
  })

  it('quitar una línea la saca del carrito', async () => {
    montar()
    await agregar(articulo({}))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Anillo oro 18k' }))
    expect(screen.getByText(/El carrito está vacío/i)).toBeInTheDocument()
  })
})
