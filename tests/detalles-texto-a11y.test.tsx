import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * Issue #17: detalles de texto y accesibilidad de la auditoría de UI. Uno por
 * casilla; cada uno es chico, pero se lee en todas las pantallas.
 */
const cashbox = vi.hoisted(() => ({ current: { data: null as unknown, isPending: false, error: null as unknown } }))
vi.mock('@/features/cashbox/api', () => ({ useCashboxCurrent: () => cashbox.current }))
vi.mock('@/features/cashbox/components/OpenSessionDialog', () => ({ OpenSessionDialog: () => null }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/lib/dates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dates')>()),
  todayBogota: () => '2026-09-30',
}))

const { AppDialog } = await import('@/components/shared/AppDialog')
const { CashSessionBanner } = await import('@/components/shared/CashSessionBanner')
const { CashClosedNotice } = await import('@/components/shared/CashClosedNotice')
const { groupEvents } = await import('@/features/settings/notifications/logic')

afterEach(() => {
  cleanup()
  cashbox.current = { data: null, isPending: false, error: null }
})

describe('textos', () => {
  it('la X de los diálogos se anuncia «Cerrar», no «Close» (F9-04)', () => {
    render(<AppDialog open onOpenChange={() => {}} title="Nuevo cliente" />)
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
    expect(readFileSync('src/components/ui/dialog.tsx', 'utf8')).not.toMatch(/>Close</)
  })

  it('Notificaciones no muestra el código interno «(R1–R4)»', () => {
    const grupos = groupEvents([{ event_type: 'x', audience: 'customer', description: 'Recordatorio', enabled: true } as never])
    const nota = grupos.find((g) => g.key === 'customer')?.note ?? ''
    expect(nota).toMatch(/recordatorios de cuota, mora y prórroga/)
    expect(nota).not.toMatch(/R1/)
  })

  it('la franja de caja abierta de otro día se lee de corrido, sin el hueco de dos elementos', () => {
    cashbox.current = { data: { session_date: '2026-09-29', opened_at: '2026-09-29T13:00:00Z' }, isPending: false, error: null }
    const { container } = render(<CashSessionBanner />)
    expect(container.textContent).toMatch(/^Caja abierta desde el 29\/09\/2026 a las /)
    // Un solo texto: con dos elementos, el espacio entre flex items se veía doble.
    expect(container.firstElementChild?.children.length).toBe(1)
  })

  it('«Nuevo gasto» con la caja cerrada no promete que por transferencia se puede', () => {
    render(<CashClosedNotice paymentMethod="transfer" anyMethod />)
    expect(screen.getByText('La caja está cerrada')).toBeInTheDocument()
    expect(screen.queryByText(/Por transferencia u otro medio sí se puede/)).toBeNull()
    expect(screen.getByText(/también por transferencia/)).toBeInTheDocument()
  })
})

describe('accesibilidad', () => {
  it('login: el error de credenciales es un alert (F9-62)', () => {
    expect(readFileSync('src/features/auth/pages/LoginPage.tsx', 'utf8')).toMatch(/role="alert"[^>]*>Correo o contraseña incorrectos\./)
  })

  it.each([
    ['src/features/customers/pages/CustomersPage.tsx', 'Buscar clientes'],
    ['src/features/contracts/pages/ContractsListPage.tsx', 'Buscar contratos'],
    ['src/features/inventory/pages/InventoryPage.tsx', 'Buscar productos'],
  ])('%s: el buscador tiene nombre accesible (F9-15)', (ruta, nombre) => {
    expect(readFileSync(ruta, 'utf8')).toContain(`ariaLabel="${nombre}"`)
  })

  it('los filtros de Inventario se nombran («Filtrar por …»), no solo con el valor «Toda categoría» (F9-39)', () => {
    expect(readFileSync('src/features/inventory/pages/InventoryPage.tsx', 'utf8')).toMatch(/aria-label=\{placeholder\.replace\(/)
  })
})
