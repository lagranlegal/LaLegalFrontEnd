import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Rediseño P1, §4 «Confirmación con resumen» (F9-18): antes de mover plata,
 * un diálogo repite a quién, qué, cómo y a dónde, con el total al final sobre
 * el fondo de marca y el monto dentro del botón. La usan el abono (tanda H),
 * el préstamo, la venta, el gasto y el traslado.
 */

const confirmMock = vi.fn()
const mutateAsync = vi.fn()
const transferMutate = vi.fn()
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
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/features/sales/api', () => ({ useCreateSale: () => ({ mutateAsync, isPending: false }) }))
vi.mock('@/features/accounts/api', () => ({ useCreateTransfer: () => ({ mutate: transferMutate, isPending: false }) }))
vi.mock('@/lib/sales/creditNotes', () => ({ useCustomerCreditNotes: () => ({ data: undefined }) }))
vi.mock('@/components/shared/CustomerPicker', () => ({ CustomerPicker: () => <input aria-label="Cliente" /> }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/lib/accounts/list', () => ({
  useAccounts: () => ({
    data: [
      { id: 'a1', name: 'Caja principal', type: 'cash', balance: '1240000.00' },
      { id: 'a2', name: 'Bancolombia', type: 'bank', balance: '500000.00' },
    ],
  }),
}))

const { ConfirmSummary, ConfirmDialogHost } = await import('@/components/shared/ConfirmDialog')
const { useConfirmStore } = await import('@/components/shared/confirmStore')

afterEach(cleanup)
beforeEach(() => {
  confirmMock.mockReset()
  mutateAsync.mockReset()
  transferMutate.mockReset()
  apiGet.mockReset()
})

describe('la pieza compartida', () => {
  it('renglón por dato con divisor, el total al final en el fondo de marca y en negrita', () => {
    const { container } = render(
      <ConfirmSummary
        rows={[
          { label: 'Contrato', value: '#43 · María F. Ruiz' },
          { label: 'Medio', value: null },
          { label: 'Queda', value: 'Al día, pagado hasta 28/10/2026', emphasis: 'after' },
          { label: 'Total', value: '$ 100.000', emphasis: 'total' },
        ]}
      />,
    )
    const dl = container.querySelector('[data-confirm-summary]')!
    expect(dl).toHaveClass('rounded-input', 'border')
    expect(screen.queryByText('Medio')).toBeNull()
    const total = screen.getByText('$ 100.000')
    expect(total).toHaveClass('font-bold', 'text-md', 'tnum')
    expect(total.parentElement).toHaveClass('bg-brand-50')
    expect(screen.getByText('Al día, pagado hasta 28/10/2026')).toHaveClass('text-success')
  })

  it('el botón de confirmar es de bloque, y en tono danger va en relleno rojo', async () => {
    render(<ConfirmDialogHost />)
    act(() => {
      useConfirmStore.setState({ id: 1, options: { title: 'Rematar contrato', tone: 'danger', confirmLabel: 'Rematar contrato' }, resolver: () => {} })
    })
    const boton = await screen.findByRole('button', { name: 'Rematar contrato' })
    expect(boton).toHaveClass('h-13', 'w-full', 'bg-danger-solid')
  })
})

describe('venta', () => {
  async function montarVenta() {
    vi.doMock('@/components/shared/confirmStore', () => ({ confirm: confirmMock }))
    vi.resetModules()
    const { SaleFormPage } = await import('@/features/sales/pages/SaleFormPage')
    apiGet.mockResolvedValue({
      data: {
        items: [
          {
            id: 'i1', code: 'JOA0009-01K', name: 'Pulsera oro', cat1_id: 'c1', cat2_id: 'c2', cat3_id: 'c3', description: null, origin: 'purchase',
            supplier_id: null, source_contract_id: null, cost: '300000.00', sale_price: '400000.00', quantity: '1.000', unit: 'unit', unit_abbr: 'und',
            status: 'available', photos: [], entry_date: '2026-09-20', product_id: null, lot_number: 1,
          },
        ],
      },
    })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SaleFormPage />
      </QueryClientProvider>,
    )
    const buscador = screen.getByPlaceholderText(/Escanea o escribe código o nombre/i)
    fireEvent.change(buscador, { target: { value: 'JOA0009-01K' } })
    fireEvent.keyDown(buscador, { key: 'Enter' })
    await waitFor(() => expect(screen.queryByText(/El carrito está vacío/i)).toBeNull())
  }

  it('pide confirmar con el resumen y no vende si se vuelve', async () => {
    confirmMock.mockResolvedValue({ confirmed: false })
    await montarVenta()
    fireEvent.click(screen.getByRole('button', { name: /Vender/ }))
    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
    const opciones = confirmMock.mock.calls[0]![0]
    expect(opciones.title).toBe('¿Registrar la venta?')
    expect(opciones.confirmLabel).toMatch(/^Vender \$\s400\.000$/)
    const filas = Object.fromEntries(opciones.summary.map((r: { label: string; value: string }) => [r.label, r.value]))
    expect(filas).toMatchObject({ Cliente: 'Consumidor final', Artículos: 'Pulsera oro', 'Medio de pago': 'Efectivo' })
    expect(opciones.summary.at(-1)).toMatchObject({ label: 'Total', emphasis: 'total' })
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('con la confirmación, vende', async () => {
    confirmMock.mockResolvedValue({ confirmed: true })
    mutateAsync.mockResolvedValue({ number: 7 })
    await montarVenta()
    fireEvent.click(screen.getByRole('button', { name: /Vender/ }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
  })
})

describe('traslado', () => {
  it('repite origen, destino y cómo queda el origen; sin confirmar no traslada', async () => {
    vi.doMock('@/components/shared/confirmStore', () => ({ confirm: confirmMock }))
    vi.resetModules()
    const { TransferDialog } = await import('@/features/accounts/components/TransferDialog')
    confirmMock.mockResolvedValue({ confirmed: false })
    render(<TransferDialog open onOpenChange={() => {}} defaultFromAccountId="a1" />)
    // jsdom no trae lo que el select de Radix usa para desplazarse.
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.hasPointerCapture = vi.fn(() => false)
    const origen = screen.getByRole('combobox', { name: 'Sale de' })
    expect(origen).toHaveTextContent('Caja principal')
    fireEvent.click(screen.getByRole('combobox', { name: 'Entra a' }))
    fireEvent.click(await screen.findByRole('option', { name: /Bancolombia/ }))
    fireEvent.change(screen.getByLabelText(/Cuánto/), { target: { value: '200000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Trasladar' }))
    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
    const opciones = confirmMock.mock.calls[0]![0]
    const filas = Object.fromEntries(opciones.summary.map((r: { label: string; value: string }) => [r.label, r.value]))
    expect(filas['Sale de']).toBe('Caja principal')
    expect(filas['Entra a']).toBe('Bancolombia')
    expect(filas['Queda en Caja principal']).toMatch(/1\.040\.000/)
    expect(opciones.confirmLabel).toMatch(/^Trasladar \$\s200\.000$/)
    expect(transferMutate).not.toHaveBeenCalled()
  })
})

describe('préstamo y gasto', () => {
  it.each([
    ['src/features/contracts/pages/ContractFormPage.tsx', '¿Registrar el préstamo?', 'createContract.mutateAsync'],
    ['src/features/cashbox/components/ExpenseFormDialog.tsx', '¿Registrar el gasto?', 'createExpense.mutateAsync'],
  ])('%s confirma con resumen ANTES de mover la plata', (ruta, titulo, mutacion) => {
    const src = readFileSync(resolve(__dirname, '..', ruta), 'utf8')
    const confirma = src.indexOf(`title: '${titulo}'`)
    expect(confirma).toBeGreaterThan(-1)
    expect(src.indexOf('if (!confirmed) return', confirma)).toBeGreaterThan(confirma)
    expect(src.indexOf(mutacion)).toBeGreaterThan(src.indexOf('if (!confirmed) return', confirma))
    expect(src.slice(confirma, src.indexOf(mutacion))).toMatch(/emphasis: 'total'/)
  })
})
