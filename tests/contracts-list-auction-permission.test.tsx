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

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/lib/permissions/usePermission', () => ({
  usePermission: (p: string) => (p === 'contracts.auction' ? perms.auction : true),
}))
vi.mock('@/features/customers/api', () => ({ fetchAllCustomers: vi.fn() }))
vi.mock('@/features/contracts/api', () => ({
  fetchAllContracts: vi.fn(),
  useContractsList: () => ({ data: { pages: [] }, isPending: false, isError: false, refetch: vi.fn(), hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }),
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
