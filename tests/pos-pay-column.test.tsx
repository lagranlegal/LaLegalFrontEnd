import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Rediseño P2, columna de cobro del punto de venta (F9-32, F9-34): medio
 * segmentado, descuento plegado, «Recibido en efectivo» con montos rápidos,
 * el cambio en grande y el monto dentro de «Cobrar».
 */

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
vi.mock('@/features/sales/api', () => ({ useCreateSale: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/lib/sales/creditNotes', () => ({ useCustomerCreditNotes: () => ({ data: undefined }) }))
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => <input aria-label="Buscar cliente" /> }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => permisos.includes(code) }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [] }) }))

const { SaleFormPage } = await import('@/features/sales/pages/SaleFormPage')

/** Forma de `ItemOut`; los montos de la maqueta (1.155.000 en tres piezas). */
function articulo(id: string, code: string, name: string, sale_price: string) {
  return {
    id, code, name, cat1_id: 'c1', cat2_id: 'c2', cat3_id: 'c3', description: null, origin: 'purchase', supplier_id: null, source_contract_id: null,
    cost: '50000.00', sale_price, quantity: '1.000', unit: 'unit', unit_abbr: 'und', status: 'available', photos: [], entry_date: '2026-09-20',
    product_id: null, lot_number: 1,
  }
}
const MAQUETA = [
  articulo('a1', 'JOC0007-01R', 'Anillo oro 18k con circón', '890000.00'),
  articulo('a2', 'PLA0112-03C', 'Cadena plata 925 tejido lazo', '145000.00'),
  articulo('a3', 'REL0031-01A', 'Reloj Casio MTP-1302', '120000.00'),
]

async function montarConCarrito(items = MAQUETA) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SaleFormPage />
    </QueryClientProvider>,
  )
  const escaner = screen.getByRole('searchbox', { name: 'Escanear o buscar artículo' })
  for (const item of items) {
    apiGet.mockResolvedValue({ data: { items: [item] } })
    fireEvent.change(escaner, { target: { value: item.code } })
    fireEvent.keyDown(escaner, { key: 'Enter' })
    await screen.findByText(item.name)
  }
}

const cobrar = () => screen.getByRole('button', { name: /^Cobrar/ })

beforeEach(() => {
  apiGet.mockReset()
  permisos = []
})
afterEach(cleanup)

describe('POS — columna de cobro', () => {
  it('el botón lleva el total, y los montos rápidos son «Exacto» y los dos billetes redondos de la maqueta', async () => {
    await montarConCarrito()
    expect(cobrar()).toHaveTextContent(/Cobrar\s*\$\s1\.155\.000/)
    expect(cobrar()).toHaveClass('h-13', 'w-full')
    for (const nombre of ['Exacto', /^\$\s1\.200\.000$/, /^\$\s1\.500\.000$/]) expect(screen.getByRole('button', { name: nombre })).toBeInTheDocument()
  })

  it('tocar un monto rápido lo pone en «Recibido», lo marca y muestra el cambio en grande', async () => {
    await montarConCarrito()
    fireEvent.click(screen.getByRole('button', { name: /^\$\s1\.200\.000$/ }))
    expect(screen.getByLabelText('Recibido en efectivo')).toHaveValue('1.200.000')
    expect(screen.getByRole('button', { name: /^\$\s1\.200\.000$/ })).toHaveAttribute('aria-pressed', 'true')
    const cambio = screen.getByText('Cambio a devolver').nextElementSibling!
    expect(cambio).toHaveTextContent(/\$\s45\.000/)
    expect(cambio).toHaveClass('text-3xl', 'font-bold')

    fireEvent.click(screen.getByRole('button', { name: 'Exacto' }))
    expect(screen.getByLabelText('Recibido en efectivo')).toHaveValue('1.155.000')
    expect(screen.getByText('Cambio a devolver').nextElementSibling).toHaveTextContent(/\$\s0$/)
  })

  it('si lo recibido no alcanza, dice cuánto falta', async () => {
    await montarConCarrito()
    fireEvent.change(screen.getByLabelText('Recibido en efectivo'), { target: { value: '1.000.000' } })
    expect(screen.getByText('Falta para completar').nextElementSibling).toHaveTextContent(/\$\s155\.000/)
  })

  it('montos chicos: 23.000 ofrece 50.000 y 100.000', async () => {
    await montarConCarrito([articulo('b1', 'BIS0001-01A', 'Topos de fantasía', '23000.00')])
    expect(screen.getByRole('button', { name: /^\$\s50\.000$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^\$\s100\.000$/ })).toBeInTheDocument()
  })

  it('medio segmentado: con transferencia no hay efectivo ni cambio', async () => {
    await montarConCarrito()
    const medio = screen.getByRole('radiogroup', { name: 'Medio de pago' })
    expect(screen.getByRole('radio', { name: 'Efectivo' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Efectivo' })).toHaveClass('min-h-11', 'bg-foreground')
    fireEvent.click(screen.getByRole('radio', { name: 'Transferencia' }))
    expect(screen.getByRole('radio', { name: 'Transferencia' })).toHaveAttribute('aria-checked', 'true')
    expect(medio).toBeInTheDocument()
    expect(screen.queryByLabelText('Recibido en efectivo')).toBeNull()
    expect(screen.queryByText('Cambio a devolver')).toBeNull()
  })

  it('el cliente arranca en «Consumidor final» y «Cambiar» abre el buscador', async () => {
    await montarConCarrito([])
    expect(screen.getByText('Consumidor final')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Elegir cliente' }))
    expect(screen.getByLabelText('Buscar cliente')).toBeInTheDocument()
  })

  it('el descuento va plegado hasta que se pide, y solo con el permiso', async () => {
    await montarConCarrito([])
    expect(screen.queryByRole('button', { name: 'Agregar' })).toBeNull()
    cleanup()
    permisos = ['sales.apply_discount']
    await montarConCarrito([MAQUETA[0]!])
    expect(screen.queryByLabelText('Descuento')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    fireEvent.change(screen.getByLabelText('Descuento'), { target: { value: '90.000' } })
    expect(cobrar()).toHaveTextContent(/\$\s800\.000/)
    expect(screen.getByLabelText(/Motivo del descuento/)).toBeInTheDocument()
  })

  it('dice que Enter no cobra', async () => {
    await montarConCarrito([])
    expect(screen.getByText('Enter no cobra: el cobro se confirma con el botón.')).toBeInTheDocument()
  })
})

describe('la confirmación antes de cobrar', () => {
  it('se apaga desde UNA sola constante', () => {
    const fuente = readFileSync('src/features/sales/pages/SaleFormPage.tsx', 'utf8')
    expect(fuente.match(/export const CONFIRM_BEFORE_CHARGE = (true|false)/g)).toHaveLength(1)
    expect(fuente.match(/await confirm\(\{\s*title: '¿Registrar la venta\?'/g)).toHaveLength(1)
    const guarda = fuente.indexOf('if (CONFIRM_BEFORE_CHARGE)')
    expect(guarda).toBeGreaterThan(-1)
    expect(fuente.indexOf("title: '¿Registrar la venta?'")).toBeGreaterThan(guarda)
  })
})
