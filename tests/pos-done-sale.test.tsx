import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-f1.json'

/**
 * Rediseño P2 (F9-33 · H-32): al cobrar, el POS no vuelve a la lista; dice
 * «Venta #N registrada», el cambio entregado y el cliente, y ofrece imprimir
 * el comprobante o empezar otra venta. La respuesta del POST es real
 * (tests/fixtures/backend-f1.json, `sale_bajo_precio_publicado`).
 */
const VENTA = fixtures.sale_bajo_precio_publicado.body

const mutateAsync = vi.fn()
const apiGet = vi.fn()
const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
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
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => <input aria-label="Buscar cliente" /> }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: vi.fn(async () => ({ confirmed: true })) }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => false }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [] }) }))
// El comprobante de siempre; acá basta saber que se monta con la venta cobrada.
vi.mock('@/components/shared/SaleReceiptDialog', () => ({
  SaleReceiptDialog: ({ sale }: { sale: { number: number } }) => <div data-testid="comprobante">comprobante #{sale.number}</div>,
}))

const { SaleFormPage } = await import('@/features/sales/pages/SaleFormPage')

/** Forma de `ItemOut`; el id y el precio son los de la venta real. */
function pieza(id: string, code: string, name: string) {
  return {
    id, code, name, cat1_id: 'c1', cat2_id: 'c2', cat3_id: 'c3', description: null, origin: 'purchase', supplier_id: null, source_contract_id: null,
    cost: '300000.00', sale_price: '400000.00', quantity: '1.000', unit: 'unit', unit_abbr: 'und', status: 'available', photos: [],
    entry_date: '2026-09-20', product_id: null, lot_number: 1,
  }
}

async function escanear(item: ReturnType<typeof pieza>) {
  apiGet.mockResolvedValue({ data: { items: [item] } })
  const escaner = screen.getByRole('searchbox', { name: 'Escanear o buscar artículo' })
  fireEvent.change(escaner, { target: { value: item.code } })
  fireEvent.keyDown(escaner, { key: 'Enter' })
  await screen.findByText(item.name)
}

async function cobrarVenta() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SaleFormPage />
    </QueryClientProvider>,
  )
  await escanear(pieza(VENTA.lines[0]!.item_id, 'JOA0009-01K', 'Pulsera oro'))
  fireEvent.change(screen.getByLabelText('Recibido en efectivo'), { target: { value: '500.000' } })
  fireEvent.click(screen.getByRole('button', { name: /^Cobrar/ }))
  await screen.findByRole('heading', { name: `Venta #${VENTA.number} registrada` })
}

beforeEach(() => {
  mutateAsync.mockReset().mockResolvedValue(VENTA)
  apiGet.mockReset()
  navigate.mockReset()
})
afterEach(cleanup)

describe('POS — así termina una venta', () => {
  it('muestra la venta, el cambio entregado y el cliente, sin volver a la lista', async () => {
    await cobrarVenta()
    expect(screen.getByText(/Cambio entregado/)).toHaveTextContent(/Cambio entregado \$\s100\.000 · Consumidor final/)
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByTestId('comprobante')).toHaveTextContent(`comprobante #${VENTA.number}`)
    // La venta cobrada ya no está en pantalla: ni carrito ni columna de cobro.
    expect(screen.queryByRole('button', { name: /^Cobrar/ })).toBeNull()
    expect(screen.queryByText('Pulsera oro')).toBeNull()
  })

  it('«Imprimir comprobante» imprime; «Nueva venta» deja el carrito vacío con el foco en el escáner', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    await cobrarVenta()
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir comprobante' }))
    expect(print).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Nueva venta' }))
    expect(screen.queryByText(/registrada/)).toBeNull()
    expect(screen.getByText(/El carrito está vacío/i)).toBeInTheDocument()
    expect(screen.getByText('Consumidor final')).toBeInTheDocument()
    expect(screen.getByLabelText('Recibido en efectivo')).toHaveValue('')
    expect(screen.getByRole('searchbox', { name: 'Escanear o buscar artículo' })).toHaveFocus()
    print.mockRestore()
  })

  it('escanear después de cobrar ya empieza la venta siguiente', async () => {
    await cobrarVenta()
    await escanear(pieza('otra', 'REL0031-01A', 'Reloj Casio MTP-1302'))
    expect(screen.queryByText(/registrada/)).toBeNull()
    await waitFor(() => expect(screen.getByRole('button', { name: /^Cobrar/ })).toHaveTextContent(/400\.000/))
  })

  it('sin efectivo escrito, el cierre dice el total y el medio', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SaleFormPage />
      </QueryClientProvider>,
    )
    await escanear(pieza(VENTA.lines[0]!.item_id, 'JOA0009-01K', 'Pulsera oro'))
    fireEvent.click(screen.getByRole('button', { name: /^Cobrar/ }))
    await screen.findByRole('heading', { name: `Venta #${VENTA.number} registrada` })
    expect(screen.getByText(/· Efectivo/)).toHaveTextContent(/\$\s400\.000 · Efectivo · Consumidor final/)
  })
})
