import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import p2d from './fixtures/backend-p2d.json'
import g2 from './fixtures/backend-g2.json'
import type { Customer } from '@/features/customers/api'
import type { ContractSummary } from '@/features/customers/history'

/**
 * Rediseño P3 — Clientes. La lista con la forma de la de contratos (nombre +
 * documento, fila con teclado, «Activo» y no «Vigente») y la ficha con el
 * encabezado del contrato (acciones en «Más») y los contratos con su estado
 * efectivo y el dinero a la derecha. Clientes y contratos: respuestas reales
 * del backend local (`backend-p2d.json`, `backend-g2.json`); el contrato
 * «listo para remate» es el real con la prórroga vencida, porque el listado
 * real no traía ninguno.
 */
const clientes = p2d.clientes_q.body.items as Customer[]
const juana = g2.cliente_con_consentimiento.body as Customer
const contratoReal = p2d.contratos_listado.body.items[0] as unknown as ContractSummary
const contratoPorRematar: ContractSummary = { ...contratoReal, id: 'remate', number: 9, status: 'in_extension', extension_ends_at: '2026-01-01' }

const state = vi.hoisted(() => ({
  navigations: [] as Array<{ to?: string; params?: unknown }>,
  canEdit: true,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => (opts: (typeof state.navigations)[number]) => {
    state.navigations.push(opts)
  },
  useParams: () => ({ customerId: juana.id }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => state.canEdit }))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: React.ReactNode }) => (state.canEdit ? children : null) }))
vi.mock('@/features/customers/components/CustomerFormDialog', () => ({ CustomerFormDialog: () => null }))
vi.mock('@/components/shared/SaleReceiptDialog', () => ({ SaleReceiptDialog: () => null }))
vi.mock('@/components/shared/PhotoThumbnail', () => ({ PhotoThumbnail: () => null }))
vi.mock('@/features/customers/api', () => ({
  useCustomersList: () => ({
    data: { pages: [{ items: [...clientes, juana], next_cursor: null }] },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }),
}))
vi.mock('@/lib/customers/search', () => ({ useCustomer: () => ({ data: juana, isPending: false, isError: false, refetch: vi.fn() }) }))
const emptyInfinite = { data: { pages: [{ items: [], next_cursor: null }] }, isPending: false, isError: false, refetch: vi.fn(), hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }
vi.mock('@/features/customers/history', () => ({
  useCustomerContracts: () => ({ data: [contratoReal, contratoPorRematar], isPending: false, isError: false, refetch: vi.fn() }),
  useCustomerSales: () => emptyInfinite,
}))
vi.mock('@/lib/sales/creditNotes', () => ({ useCustomerCreditNotes: () => emptyInfinite }))

const { CustomersPage } = await import('@/features/customers/pages/CustomersPage')
const { CustomerDetailPage } = await import('@/features/customers/pages/CustomerDetailPage')

afterEach(() => {
  cleanup()
  state.navigations = []
  state.canEdit = true
})

describe('lista de clientes', () => {
  it('cada fila dice el nombre y, debajo, el documento con su tipo', () => {
    render(<CustomersPage />)
    const table = screen.getByRole('table')
    const row = within(table).getByText(clientes[0]!.full_name).closest('tr')!
    expect(within(row).getByText(`CC ${clientes[0]!.doc_number}`)).toHaveClass('tnum')
  })

  it('el estado del cliente dice «Activo», no «Vigente» (F9-42)', () => {
    render(<CustomersPage />)
    const table = screen.getByRole('table')
    expect(within(table).getAllByText('Activo').length).toBeGreaterThan(0)
    expect(within(table).queryByText('Vigente')).toBeNull()
  })

  it('la fila se abre con Enter y lleva a la ficha', () => {
    render(<CustomersPage />)
    const row = within(screen.getByRole('table')).getByText(juana.full_name).closest('tr')!
    expect(row).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(state.navigations.at(-1)).toMatchObject({ to: '/clientes/$customerId', params: { customerId: juana.id } })
  })

  it('el buscador tiene nombre accesible', () => {
    render(<CustomersPage />)
    expect(screen.getByRole('searchbox', { name: 'Buscar clientes' })).toBeInTheDocument()
  })
})

describe('ficha del cliente', () => {
  it('el nombre es el título y debajo van documento y teléfono', () => {
    render(<CustomerDetailPage />)
    const h1 = screen.getByRole('heading', { level: 1, name: juana.full_name })
    expect(h1).toHaveClass('font-display')
    const header = h1.parentElement!
    expect(within(header).getByText(`Cédula de ciudadanía ${juana.doc_number}`)).toBeInTheDocument()
    expect(within(header).getByText('Activo')).toBeInTheDocument()
  })

  it('las acciones van en «Más» y sin permiso el menú no aparece', () => {
    const { unmount } = render(<CustomerDetailPage />)
    expect(screen.getByRole('button', { name: /Más/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    unmount()
    state.canEdit = false
    render(<CustomerDetailPage />)
    expect(screen.queryByRole('button', { name: /Más/ })).toBeNull()
  })

  it('los contratos muestran su estado efectivo y el dinero a la derecha', () => {
    render(<CustomerDetailPage />)
    const table = screen.getAllByRole('table')[0]!
    expect(within(table).getByText('Listo para remate')).toBeInTheDocument()
    expect(within(table).getByText('Vigente')).toBeInTheDocument()
    for (const name of ['Capital', 'Saldo']) {
      expect(within(table).getByRole('columnheader', { name })).toHaveClass('text-right')
    }
  })

  it('la fila de un contrato se abre con Enter', () => {
    render(<CustomerDetailPage />)
    const table = screen.getAllByRole('table')[0]!
    const row = within(table).getAllByRole('row')[1]!
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(state.navigations.at(-1)).toMatchObject({ to: '/contratos/$contractId', params: { contractId: contratoReal.id } })
  })
})

describe('«Nuevo cliente» a 360 px (F9-41)', () => {
  it('las grillas de documento y contacto son de una columna bajo 480 px', async () => {
    const { readFileSync } = await import('node:fs')
    const source = readFileSync('src/features/customers/components/CustomerFormDialog.tsx', 'utf8')
    const grids = source.match(/className="grid [^"]*"/g) ?? []
    expect(grids.length).toBeGreaterThanOrEqual(2)
    for (const grid of grids) {
      expect(grid).toContain('grid-cols-1')
      expect(grid).toContain('min-[480px]:grid-cols-2')
    }
  })
})
