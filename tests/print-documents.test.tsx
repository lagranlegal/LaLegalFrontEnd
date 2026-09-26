import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * Imprimir un documento imprime SOLO el documento.
 *
 * El dueño lo reportó así: «al imprimir el comprobante de una venta me
 * aparecen todas las ventas, incluyendo el botón de exportar Excel». El
 * `PrintLayout` vivía dentro del árbol de la página y dependía de que CADA
 * página envolviera su contenido en `print:hidden`: el detalle de contrato y
 * la caja lo hacían, la lista de Ventas y la ficha del cliente no. Ahora el
 * documento se monta en un portal, hijo directo de `<body>`, y una sola regla
 * de `globals.css` oculta todo lo demás al imprimir — ninguna página tiene
 * que acordarse de nada.
 */

vi.mock('@/lib/auth/me', () => ({
  useMe: () => ({
    data: {
      company: {
        name: 'ZZ QA',
        legal_name: 'QA Compraventa S.A.S.',
        tax_id: '900123456-7',
        logo_url: null,
        signature_url: null,
        address: null,
        contact_phone: null,
        documents: {},
      },
    },
  }),
}))
vi.mock('@/lib/storage/photos', () => ({
  useSignedPhotoUrl: (path: string | null) => ({ data: path ? `https://firmas.test/${path}` : undefined }),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/sales/void', () => ({ useVoidSale: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: React.ReactNode }) => children }))
vi.mock('@/components/shared/ReturnFormDialog', () => ({ ReturnFormDialog: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/lib/customers/search', () => ({
  useCustomer: () => ({ data: { full_name: 'Mateo Prueba', doc_type: 'cc', doc_number: '9000000001' } }),
}))
vi.mock('@/lib/inventory/items', () => ({
  useItemsByIds: () => ({ data: new Map([['it-1', { id: 'it-1', name: 'Pieza para idempotencia', code: 'JOA0003-02P', unit: 'unit' }]]) }),
}))
vi.mock('@/lib/sales/returns', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sales/returns')>()),
  useSaleReturns: () => ({ data: [] }),
}))

const { PrintLayout } = await import('@/components/shared/PrintLayout')
const { SaleReceiptDialog } = await import('@/components/shared/SaleReceiptDialog')
const { PrintSignature } = await import('@/components/shared/PrintBlocks')

beforeEach(() => cleanup())

describe('PrintLayout', () => {
  it('se monta fuera del árbol de la página, como hijo directo de <body>', () => {
    const { container } = render(
      <div>
        <p>Tabla de ventas</p>
        <PrintLayout title="Comprobante de venta" number={10}>
          <p>cuerpo del documento</p>
        </PrintLayout>
      </div>,
    )
    const doc = document.querySelector('[data-print-document]')
    expect(doc).not.toBeNull()
    expect(doc!.parentElement).toBe(document.body)
    expect(container.contains(doc)).toBe(false)
    expect(doc).toHaveTextContent('cuerpo del documento')
    expect(doc).toHaveTextContent('QA Compraventa S.A.S.')
    expect(doc).toHaveTextContent('NIT 900123456-7')
  })

  it('la vista previa en pantalla se queda en su lugar (no es un documento a imprimir)', () => {
    const { container } = render(
      <PrintLayout title="Contrato de empeño" screenPreview>
        <p>vista previa</p>
      </PrintLayout>,
    )
    expect(container).toHaveTextContent('vista previa')
    expect(document.querySelector('[data-print-document]')).toBeNull()
  })

  it('globals.css oculta al imprimir todo lo que no sea el documento', () => {
    const css = readFileSync(resolve(__dirname, '../src/styles/globals.css'), 'utf8')
    expect(css).toMatch(/body:has\(> \[data-print-document\]\) > :not\(\[data-print-document\]\)/)
  })
})

describe('PrintSignature', () => {
  it('con firma cargada, la imagen va sobre la línea con texto alternativo', () => {
    render(<PrintSignature label="Firma de la empresa" imagePath="empresa/company/signature/f.webp" />)
    const img = screen.getByRole('img', { name: 'Firma de la empresa' })
    expect(img).toHaveAttribute('src', 'https://firmas.test/empresa/company/signature/f.webp')
    expect(img.className).toMatch(/object-contain/)
  })

  it('sin firma, queda el espacio en blanco para firmar a mano', () => {
    render(<PrintSignature label="Firma del cliente" detail="CC 1010101010" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByTestId('signature-space')).toBeInTheDocument()
    expect(screen.getByText('Firma del cliente')).toBeInTheDocument()
    expect(screen.getByText('CC 1010101010')).toBeInTheDocument()
  })
})

describe('comprobante de venta impreso', () => {
  // Forma de `SaleOut` (src/types/api.ts); montos como los manda el backend.
  const venta = {
    id: '11111111-1111-1111-1111-111111111111',
    number: 14,
    status: 'voided',
    payment_method: 'cash',
    sold_at: '2026-09-23T15:04:05Z',
    total: '90000.00',
    discount_amount: '10000.00',
    credit_note_redeemed_amount: '40000.00',
    returned_amount: '0.00',
    customer_id: '22222222-2222-2222-2222-222222222222',
    void_reason: 'error de digitación',
    account_id: null,
    created_at: '2026-09-23T15:04:05Z',
    lines: [{ id: 'l-1', item_id: 'it-1', quantity: '1', unit_price: '100000.00', unit_cost: '0', subtotal: '100000.00' }],
  } as unknown as Parameters<typeof SaleReceiptDialog>[0]['sale']

  it('va en su propio documento, con nombre, número, anulación, descuento y nota crédito', () => {
    const { baseElement } = render(<SaleReceiptDialog open={false} onOpenChange={() => {}} sale={venta} />)
    const doc = baseElement.querySelector('[data-print-document]') as HTMLElement
    expect(doc.parentElement).toBe(document.body)
    expect(doc).toHaveTextContent('Comprobante de venta')
    expect(doc).toHaveTextContent('Nº 14')
    expect(doc).toHaveTextContent('Venta anulada')
    expect(doc).toHaveTextContent('Motivo: error de digitación')
    expect(doc).toHaveTextContent('Mateo Prueba')
    expect(doc).toHaveTextContent('Pieza para idempotencia')
    expect(doc).toHaveTextContent(/Descuento\s*−\s*\$\s*10\.000/)
    expect(doc).toHaveTextContent(/Pagado con nota crédito\s*\$\s*40\.000/)
    expect(doc).toHaveTextContent(/Total\s*\$\s*90\.000/)
  })
})
