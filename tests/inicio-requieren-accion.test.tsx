import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-p2c.json'
import type { ContractAttention } from '@/features/dashboard/api'

/**
 * «Requieren acción» (rediseño P2-c) contra la respuesta REAL de
 * `/contracts/attention`. La pastilla sale de `reason_code`, no de `status`:
 * el #6 vence hoy y su status ya es `in_arrears`, pero dice «Vigente».
 */
const ATTENTION = fixtures.attention.body as ContractAttention
const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const { AttentionCard } = await import('@/features/dashboard/components/AttentionCard')

function renderCard(data: ContractAttention | undefined, extra: { isPending?: boolean; error?: unknown } = {}) {
  return render(<AttentionCard data={data} isPending={extra.isPending ?? false} error={extra.error ?? null} onRetry={() => {}} />)
}

/** Las filas de la tabla de escritorio (la de celular repite los datos en tarjetas). */
function filas() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1)
}

afterEach(() => {
  cleanup()
  navigate.mockReset()
})

describe('Requieren acción', () => {
  it('una fila por contrato: número, cliente con subleyenda, estado por motivo y lo que debe hoy', () => {
    renderCard(ATTENTION)
    const texto = filas().map((f) => [...f.children].map((c) => (c.textContent ?? '').replace(/\s+/g, ' ')))
    expect(texto).toEqual([
      ['#1', 'Cliente Empresa A attentionprórroga vencida 01/07', 'Listo para remate', '$ 1.400.000'],
      ['#2', 'Cliente Empresa A attention39 días de atraso', 'En mora', '$ 32.000'],
      ['#3', 'Cliente Empresa A attention9 días de atraso', 'En mora', '$ 15.000'],
      ['#4', 'Cliente Empresa A attentionvence 24/10', 'Prórroga', '$ 60.000'],
      ['#6', 'Cliente Empresa A attentionvence hoy', 'Vigente', '$ 25.000'],
    ])
  })

  it('«Debe hoy» alineado a la derecha, encabezado incluido', () => {
    renderCard(ATTENTION)
    expect(screen.getByRole('columnheader', { name: 'Debe hoy' })).toHaveClass('text-right')
  })

  it('la fila abre el contrato con el mouse y con el teclado', () => {
    renderCard(ATTENTION)
    const [primera, segunda] = filas()
    fireEvent.click(primera!)
    expect(navigate).toHaveBeenLastCalledWith({ to: '/contratos/$contractId', params: { contractId: ATTENTION.items[0]!.contract_id } })
    expect(segunda).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(segunda!, { key: 'Enter' })
    expect(navigate).toHaveBeenLastCalledWith({ to: '/contratos/$contractId', params: { contractId: ATTENTION.items[1]!.contract_id } })
  })

  it('«Ver todos» lleva a /contratos y dice cuántos hay cuando la lista está topada', () => {
    renderCard({ ...ATTENTION, items: ATTENTION.items.slice(0, 2) })
    expect(screen.getByRole('link', { name: 'Ver todos (5)' }).getAttribute('href')).toBe('/contratos')
  })

  it('vacío: un EmptyState amable, sin tabla', () => {
    renderCard({ ...ATTENTION, items: [], items_total: 0 })
    expect(screen.getByText('Nada pendiente por hoy')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})
