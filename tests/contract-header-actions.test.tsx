import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * Rediseño P2-a: el encabezado del contrato deja «Imprimir» a la vista y el
 * resto (paz y salvo, editar, rematar) detrás de «Más», sin perder ninguna
 * acción ni su permiso.
 */
const perms = vi.hoisted(() => ({ current: new Set<string>() }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => perms.current.has(code) }))

const { ContractHeaderActions } = await import('@/features/contracts/components/ContractHeaderActions')

afterEach(cleanup)

const base = {
  printLoading: false,
  onPrint: vi.fn(),
  settlementAvailable: false,
  settlementLoading: false,
  onPrintSettlement: vi.fn(),
  onEdit: vi.fn(),
  canAuction: false,
  auctionPending: false,
  onAuction: vi.fn(),
}

function openMenu() {
  fireEvent.keyDown(screen.getByRole('button', { name: /Más/ }), { key: 'Enter' })
}

describe('acciones del encabezado del contrato', () => {
  it('sin permisos ni acciones extra, solo «Imprimir»', () => {
    perms.current = new Set()
    render(<ContractHeaderActions {...base} />)
    expect(screen.getByRole('button', { name: /Imprimir/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Más/ })).toBeNull()
  })

  it('«Más» agrupa editar, paz y salvo y rematar, cada uno con su condición', async () => {
    perms.current = new Set(['contracts.edit', 'contracts.auction'])
    render(<ContractHeaderActions {...base} settlementAvailable canAuction />)
    openMenu()
    expect(await screen.findByRole('menuitem', { name: 'Editar' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Imprimir paz y salvo' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Rematar contrato' })).toBeInTheDocument()
  })

  it('rematar exige el permiso además de estar listo para remate', async () => {
    perms.current = new Set(['contracts.edit'])
    render(<ContractHeaderActions {...base} canAuction />)
    openMenu()
    await screen.findByRole('menuitem', { name: 'Editar' })
    expect(screen.queryByRole('menuitem', { name: /Rematar/ })).toBeNull()
  })
})
