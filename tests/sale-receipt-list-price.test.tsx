import { describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import fixtures from './fixtures/backend-f1.json'

// Venta REAL del backend local (F7-08): una pieza publicada en 450.000
// vendida en 400.000 → list_price 450.000, price_discount 50.000.
const venta = fixtures.sale_bajo_precio_publicado.body
const itemId = venta.lines[0]!.item_id

vi.mock('@/lib/auth/me', () => ({
  useMe: () => ({ data: { company: { name: 'ZZ QA', legal_name: 'QA S.A.S.', tax_id: '900123456-7', logo_url: null, signature_url: null, address: 'Calle 1', contact_phone: '300', documents: {} } } }),
}))
vi.mock('@/lib/storage/photos', () => ({ useSignedPhotoUrl: () => ({ data: undefined }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/sales/void', () => ({ useVoidSale: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/components/shared/ReturnFormDialog', () => ({ ReturnFormDialog: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/lib/customers/search', () => ({ useCustomer: () => ({ data: undefined }) }))
vi.mock('@/lib/inventory/items', () => ({
  useItemsByIds: () => ({ data: new Map([[itemId, { id: itemId, name: 'Cadena publicada', code: 'JOA0001', unit: 'unit' }]]) }),
}))
vi.mock('@/lib/sales/returns', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sales/returns')>()),
  useSaleReturns: () => ({ data: [] }),
}))

const { SaleReceiptDialog } = await import('@/components/shared/SaleReceiptDialog')
type SaleProp = Parameters<typeof SaleReceiptDialog>[0]['sale']
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ')

beforeEach(() => cleanup())

describe('venta bajo el precio publicado (F7-08)', () => {
  it('el comprobante impreso muestra el precio publicado tachado, el descuento y el precio final', () => {
    const { baseElement } = render(<SaleReceiptDialog open={false} onOpenChange={() => {}} sale={venta as unknown as SaleProp} />)
    const doc = baseElement.querySelector('[data-print-document]') as HTMLElement
    const publicado = within(doc).getByLabelText('Precio publicado')
    expect(publicado.className).toContain('line-through')
    expect(text(publicado)).toContain('$ 450.000')
    expect(text(doc)).toContain('Descuento − $ 50.000')
    expect(text(doc)).toContain('$ 400.000')
  })

  it('el detalle en pantalla también', () => {
    render(<SaleReceiptDialog open onOpenChange={() => {}} sale={venta as unknown as SaleProp} />)
    const dialog = screen.getByRole('dialog')
    expect(text(within(dialog).getByLabelText('Precio publicado'))).toContain('$ 450.000')
    expect(text(dialog)).toContain('Descuento − $ 50.000')
  })

  it('sin rebaja (o una venta vieja sin list_price) no tacha nada', () => {
    const sinRebaja = { ...venta, lines: [{ ...venta.lines[0]!, list_price: null, price_discount: '0.00' }] }
    const { baseElement } = render(<SaleReceiptDialog open={false} onOpenChange={() => {}} sale={sinRebaja as unknown as SaleProp} />)
    expect(baseElement.querySelector('[aria-label="Precio publicado"]')).toBeNull()
  })
})
