import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import fixtures from './fixtures/backend-f1.json'
import type { CapitalPosition } from '@/features/capital/api'

vi.mock('@/features/capital/api', () => ({}))
vi.mock('@/features/capital/components/CapitalMovementDialog', () => ({ CapitalMovementDialog: () => null }))
const { PositionCard } = await import('@/features/capital/pages/CapitalPage')
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ')

afterEach(cleanup)

describe('capital/position — pasivos y patrimonio neto (F7-13)', () => {
  it('muestra cuentas por pagar, notas crédito, total de pasivos y patrimonio neto', () => {
    // Respuesta real del backend local: 500.000 de activos y 500.000 de pasivos.
    render(<PositionCard position={fixtures.capital_position_pasivos.body as CapitalPosition} />)
    expect(text(screen.getByText('Cuentas por pagar').parentElement)).toContain('$ 200.000')
    expect(text(screen.getByText('Notas crédito por redimir').parentElement)).toContain('$ 300.000')
    expect(text(screen.getByText('Total pasivos').parentElement)).toContain('$ 500.000')
    expect(text(screen.getByText('Patrimonio neto').parentElement)).toContain('$ 0')
  })
})
