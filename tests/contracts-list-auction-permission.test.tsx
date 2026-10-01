import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * `GET /contracts/ready-for-auction` exige `contracts.auction`. Sin ese
 * permiso, Contratos no muestra la pestaña «Listos para remate» ni pide la
 * lista: antes cada Asesor que abría la página dejaba un 403 en la consola
 * (smoke del 30/09 sobre la tanda I).
 */
const perms = vi.hoisted(() => ({ auction: false }))
const ready = vi.hoisted(() => ({ calls: [] as Array<{ enabled?: boolean } | undefined> }))
const url = vi.hoisted(() => ({ search: {} as { estado?: string }, listCalls: [] as string[] }))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn(), useSearch: () => url.search }))
vi.mock('@/lib/permissions/usePermission', () => ({
  usePermission: (p: string) => (p === 'contracts.auction' ? perms.auction : true),
}))
vi.mock('@/features/customers/api', () => ({ fetchAllCustomers: vi.fn() }))
vi.mock('@/features/contracts/api', () => ({
  fetchAllContracts: vi.fn(),
  useContractsList: (status: string) => (url.listCalls.push(status), { data: { pages: [] }, isPending: false, isError: false, refetch: vi.fn(), hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }),
  useContractSearch: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
  useReadyForAuction: (opts?: { enabled?: boolean }) => {
    ready.calls.push(opts)
    return { data: [], isPending: false, isError: false, refetch: vi.fn() }
  },
}))

const { ContractsListPage } = await import('@/features/contracts/pages/ContractsListPage')

afterEach(() => {
  cleanup()
  ready.calls = []
  url.search = {}
  url.listCalls = []
})

describe('Contratos y el permiso de remate', () => {
  it('sin contracts.auction no hay pestaña «Listos para remate» ni se pide la lista', () => {
    perms.auction = false
    render(<ContractsListPage />)
    expect(screen.queryByRole('button', { name: 'Listos para remate' })).toBeNull()
    expect(ready.calls.length).toBeGreaterThan(0)
    expect(ready.calls.every((c) => c?.enabled === false)).toBe(true)
  })

  it('con contracts.auction la pestaña está, y la lista se pide solo al abrirla', () => {
    perms.auction = true
    render(<ContractsListPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Listos para remate' }))
    expect(ready.calls[0]?.enabled).toBe(false)
    expect(ready.calls.at(-1)?.enabled).toBe(true)
  })
})

describe('Contratos filtrado desde la URL (tarjetas «Para hoy» del Inicio)', () => {
  it('`?estado=in_arrears` abre la lista en «En mora»', () => {
    perms.auction = false
    url.search = { estado: 'in_arrears' }
    render(<ContractsListPage />)
    expect(screen.getByRole('button', { name: 'En mora' })).toHaveAttribute('aria-pressed', 'true')
    expect(url.listCalls.at(-1)).toBe('in_arrears')
  })

  it('`?estado=ready_for_auction` sin `contracts.auction` cae en «Todos» y no pide un estado que no existe', () => {
    perms.auction = false
    url.search = { estado: 'ready_for_auction' }
    render(<ContractsListPage />)
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    expect(url.listCalls).not.toContain('ready_for_auction')
  })
})
