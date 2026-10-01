import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-p2c.json'
import type { ContractAttention } from '@/features/dashboard/api'

/**
 * «Para hoy» del Inicio (rediseño P2-c), contra la respuesta REAL de
 * `GET /contracts/attention`: 1 listo para remate, 2 en mora, 1 vence hoy.
 * Cada tarjeta abre la lista filtrada; con 0, en calma, sin rojo.
 */
const ATTENTION = fixtures.attention.body as ContractAttention
const permisos = vi.hoisted(() => ({ list: ['contracts.view', 'contracts.auction'] as string[] }))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, search, children, className }: { to: string; search?: Record<string, string>; children: ReactNode; className?: string }) => (
    <a href={search && Object.keys(search).length ? `${to}?${new URLSearchParams(search)}` : to} className={className}>
      {children}
    </a>
  ),
}))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => permisos.list.includes(code) }))

const { TodayTasks } = await import('@/features/dashboard/components/TodayTasks')
const { ApiError } = await import('@/lib/api/errors')
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

function renderTasks(data: ContractAttention | undefined, extra: { isPending?: boolean; error?: unknown } = {}) {
  return render(<TodayTasks data={data} isPending={extra.isPending ?? false} error={extra.error ?? null} onRetry={() => {}} />)
}

afterEach(() => {
  cleanup()
  permisos.list = ['contracts.view', 'contracts.auction']
})

describe('Para hoy', () => {
  it('tres tarjetas con el conteo y el monto del backend, en orden de urgencia', () => {
    renderTasks(ATTENTION)
    const [remate, mora, hoy] = screen.getAllByRole('link')
    expect(text(remate!)).toBe('1 listo para remate prórroga vencida el 01/07')
    expect(text(mora!)).toBe('2 en mora $ 47.000 en intereses atrasados')
    expect(text(hoy!)).toBe('1 vence hoy $ 25.000 por cobrar')
  })

  it('cada una abre la lista de contratos filtrada; «vencen hoy», la lista entera', () => {
    renderTasks(ATTENTION)
    const [remate, mora, hoy] = screen.getAllByRole('link')
    expect(remate!.getAttribute('href')).toBe('/contratos?estado=ready_for_auction')
    expect(mora!.getAttribute('href')).toBe('/contratos?estado=in_arrears')
    expect(hoy!.getAttribute('href')).toBe('/contratos')
  })

  it('sin `contracts.auction` (Asesor), remate abre «Prórroga», donde sí ve esos contratos', () => {
    permisos.list = ['contracts.view']
    renderTasks(ATTENTION)
    expect(screen.getAllByRole('link')[0]!.getAttribute('href')).toBe('/contratos?estado=in_extension')
  })

  it('listo para remate: borde rojo e ícono rojo sólido cuando hay', () => {
    renderTasks(ATTENTION)
    const remate = screen.getAllByRole('link')[0]!
    expect(remate).toHaveClass('border-danger')
    expect(remate.querySelector('span')).toHaveClass('bg-danger-solid', 'text-on-danger-solid')
  })

  it('con 0, las tarjetas van en calma: sin rojo y sin cifras inventadas', () => {
    renderTasks({
      ...ATTENTION,
      ready_for_auction: { count: 0, earliest_expired_on: null },
      in_arrears: { count: 0, overdue_interest_total: '0.00' },
      due_today: { count: 0, amount_total: '0.00' },
      items_total: 0,
      items: [],
    })
    const links = screen.getAllByRole('link')
    for (const link of links) {
      expect(link.className).not.toMatch(/danger/)
      expect(link.querySelector('span')!.className).not.toMatch(/danger|info/)
    }
    expect(text(links[0]!)).toBe('0 listos para remate ninguna prórroga vencida')
    expect(text(links[1]!)).toBe('0 en mora ningún contrato atrasado')
    expect(text(links[2]!)).toBe('0 vencen hoy nada por cobrar hoy')
  })

  it('un 403 no es una falla: la sección no afirma nada', () => {
    const { container } = renderTasks(undefined, { error: new ApiError({ status: 403, code: 'PERMISSION_DENIED', message: 'x' }) })
    expect(container.textContent).toBe('')
  })

  it('otro error dice que no cargó y ofrece reintentar', () => {
    renderTasks(undefined, { error: new Error('red') })
    expect(screen.getByText(/No se pudo cargar lo que hay para hoy/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
