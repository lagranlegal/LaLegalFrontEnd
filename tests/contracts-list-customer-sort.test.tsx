import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import fixtures from './fixtures/backend-p2d.json'
import type { ContractListItem } from '@/features/contracts/api'

/**
 * Rediseño P2-d (issue #10): la lista de contratos dice de quién es cada uno
 * (nombre + documento, del mismo `GET /contracts`), los montos van a la
 * derecha, la fila se abre con el teclado y el orden vive en `?orden=`.
 * Ítems: respuesta real del backend local (`backend-p2d.json`).
 */
const listado = fixtures.contratos_listado.body.items as ContractListItem[]

const url = vi.hoisted(() => ({
  search: {} as Record<string, unknown>,
  navigations: [] as Array<{ to?: string; params?: unknown; search?: unknown; replace?: boolean }>,
  listCalls: [] as Array<[string, string]>,
  searchCalls: [] as Array<[string, string]>,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => (opts: (typeof url.navigations)[number]) => {
    url.navigations.push(opts)
  },
  useSearch: () => url.search,
}))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => false }))
vi.mock('@/features/customers/api', () => ({ fetchAllCustomers: vi.fn() }))
vi.mock('@/lib/customers/search', () => ({ useCustomer: () => ({ data: undefined }) }))
vi.mock('@/features/contracts/api', () => ({
  fetchAllContracts: vi.fn(),
  useContractsList: (status: string, sort: string) => (
    url.listCalls.push([status, sort]),
    { data: { pages: [{ items: listado, next_cursor: null }] }, isPending: false, isError: false, refetch: vi.fn(), hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }
  ),
  useContractSearch: (q: string, sort: string) => (url.searchCalls.push([q, sort]), { data: [], isPending: false, isError: false, refetch: vi.fn() }),
  useReadyForAuction: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
}))

const { ContractsListPage } = await import('@/features/contracts/pages/ContractsListPage')

beforeAll(() => {
  // Radix Select usa APIs de puntero y scroll que jsdom no trae.
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(() => {
  cleanup()
  url.search = {}
  url.navigations = []
  url.listCalls = []
  url.searchCalls = []
})

function applySearch(nav: (typeof url.navigations)[number], prev: Record<string, unknown>) {
  const reducer = nav.search as (p: Record<string, unknown>) => Record<string, unknown>
  return reducer(prev)
}

describe('lista de contratos — columna Cliente', () => {
  it('cada fila dice el nombre y, debajo, el documento del cliente', () => {
    render(<ContractsListPage />)
    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Cliente' })).toBeInTheDocument()
    for (const item of listado) {
      const row = within(table).getByText(item.customer_name).closest('tr')!
      expect(within(row).getByText(item.customer_document)).toBeInTheDocument()
    }
  })

  it('Capital y Saldo en cartera van a la derecha, encabezado y celda', () => {
    render(<ContractsListPage />)
    const table = screen.getByRole('table')
    for (const name of ['Capital', 'Saldo en cartera']) {
      expect(within(table).getByRole('columnheader', { name })).toHaveClass('text-right')
    }
    const firstRow = within(table).getAllByRole('row')[1]!
    const cells = within(firstRow).getAllByRole('cell')
    expect(cells[2]).toHaveClass('text-right')
    expect(cells[2]!.querySelector('.tnum')).not.toBeNull()
  })

  it('la fila se abre con Enter desde el teclado', () => {
    render(<ContractsListPage />)
    const row = within(screen.getByRole('table')).getByText(listado[0]!.customer_name).closest('tr')!
    expect(row).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(url.navigations.at(-1)).toMatchObject({ to: '/contratos/$contractId', params: { contractId: listado[0]!.id } })
  })
})

describe('lista de contratos — orden en la URL', () => {
  it('sin `?orden=` pide lo más urgente primero', () => {
    render(<ContractsListPage />)
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveTextContent('Más urgente')
    expect(url.listCalls.at(-1)).toEqual(['', 'next_due_asc'])
  })

  it('`?orden=numero_desc&estado=in_arrears` pide ese orden con ese estado', () => {
    url.search = { estado: 'in_arrears', orden: 'numero_desc' }
    render(<ContractsListPage />)
    expect(screen.getByRole('combobox', { name: 'Ordenar por' })).toHaveTextContent('Número ↓')
    expect(url.listCalls.at(-1)).toEqual(['in_arrears', 'number_desc'])
  })

  it('elegir «Cliente A–Z» escribe `?orden=cliente` sin perder el estado, y reemplaza la entrada del historial', async () => {
    url.search = { estado: 'active' }
    render(<ContractsListPage />)
    const trigger = screen.getByRole('combobox', { name: 'Ordenar por' })
    await act(async () => {
      fireEvent.keyDown(trigger, { key: 'Enter' })
    })
    const option = await screen.findByRole('option', { name: 'Cliente A–Z' })
    await act(async () => {
      fireEvent.keyDown(option, { key: 'Enter' })
    })
    const nav = url.navigations.at(-1)!
    expect(nav).toMatchObject({ to: '/contratos', replace: true })
    expect(applySearch(nav, { estado: 'active' })).toEqual({ estado: 'active', orden: 'cliente' })
  })

  it('volver a «Más urgente» borra `orden` de la URL (es el default)', async () => {
    url.search = { orden: 'cliente', estado: 'active' }
    render(<ContractsListPage />)
    await act(async () => {
      fireEvent.keyDown(screen.getByRole('combobox', { name: 'Ordenar por' }), { key: 'Enter' })
    })
    const option = await screen.findByRole('option', { name: 'Más urgente' })
    await act(async () => {
      fireEvent.keyDown(option, { key: 'Enter' })
    })
    expect(applySearch(url.navigations.at(-1)!, { orden: 'cliente', estado: 'active' })).toEqual({ estado: 'active' })
  })

  it('cambiar de estado conserva el orden', () => {
    url.search = { orden: 'cliente' }
    render(<ContractsListPage />)
    fireEvent.click(screen.getByRole('button', { name: 'En mora' }))
    expect(applySearch(url.navigations.at(-1)!, { orden: 'cliente' })).toEqual({ orden: 'cliente', estado: 'in_arrears' })
  })

  it('el buscador usa el mismo orden', () => {
    url.search = { orden: 'numero_asc' }
    render(<ContractsListPage />)
    expect(url.searchCalls.at(-1)).toEqual(['', 'number_asc'])
  })
})
