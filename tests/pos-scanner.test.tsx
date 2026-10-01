import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * Rediseño P2, punto de venta (F9-27, F9-33): el escáner nace con foco y lo
 * dice («Listo para escanear»); tras agregar un artículo, el foco vuelve ahí
 * para la siguiente lectura, aunque se haya agregado con un clic en la lista.
 */

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
vi.mock('@/features/sales/api', () => ({ useCreateSale: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/lib/sales/creditNotes', () => ({ useCustomerCreditNotes: () => ({ data: undefined }) }))
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => <input aria-label="Buscar cliente" /> }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => false }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [] }) }))

const { SaleFormPage } = await import('@/features/sales/pages/SaleFormPage')

/** Forma de `ItemOut` (src/types/api.ts, generado del openapi del backend). */
const ANILLO = {
  id: 'a1', code: 'JOA0008-01K', name: 'Anillo oro 18k', cat1_id: 'c1', cat2_id: 'c2', cat3_id: 'c3', description: null, origin: 'purchase',
  supplier_id: null, source_contract_id: null, cost: '100000.00', sale_price: '250000.00', quantity: '1.000', unit: 'unit', unit_abbr: 'und',
  status: 'available', photos: [], entry_date: '2026-09-20', product_id: null, lot_number: 1,
}

function montar() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SaleFormPage />
    </QueryClientProvider>,
  )
  return screen.getByRole('searchbox', { name: 'Escanear o buscar artículo' }) as HTMLInputElement
}

beforeEach(() => apiGet.mockReset())
afterEach(cleanup)

describe('POS — el escáner', () => {
  it('nace con foco y dice que está listo', () => {
    const escaner = montar()
    expect(escaner).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('Listo para escanear')
  })

  it('sin foco no afirma que está listo', () => {
    const escaner = montar()
    fireEvent.blur(escaner)
    expect(screen.queryByText('Listo para escanear')).toBeNull()
  })

  it('tras agregar con un clic en la lista, el foco vuelve al escáner', async () => {
    apiGet.mockResolvedValue({ data: { items: [ANILLO] } })
    const escaner = montar()
    fireEvent.change(escaner, { target: { value: 'Anillo' } })
    const resultado = await screen.findByRole('button', { name: /Anillo oro 18k/ }, { timeout: 2000 })
    resultado.focus()
    fireEvent.click(resultado)
    await waitFor(() => expect(screen.queryByText(/El carrito está vacío/i)).toBeNull())
    expect(escaner).toHaveFocus()
    expect(escaner.value).toBe('')
  })
})
