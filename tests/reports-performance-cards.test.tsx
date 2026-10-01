import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import fixtures from './fixtures/backend-f1.json'

// Respuestas reales del backend local (tanda F1), ver `_origen` del fixture.
const PROFIT = fixtures.profit_descuentos.body
// Un descuento de interés sobre la respuesta real: la única de pawn-performance
// capturada no tenía descuento. Se ajustan los tres campos juntos, como los
// arma el backend (`interest_revenue = interest_collected − interest_discounts`).
const PAWN = { ...fixtures.pawn_performance.body, interest_collected: '50000.00', interest_discounts: '8000.00', interest_revenue: '42000.00', net_yield_on_current_portfolio_pct: '5.25' }

vi.mock('@/features/reports/api', () => ({
  useProfitSummary: () => ({ data: PROFIT, isPending: false, isError: false }),
  usePawnPerformance: () => ({ data: PAWN, isPending: false, isError: false }),
}))

const { PawnCard, ProfitCard } = await import('@/features/reports/components/PerformanceCards')

afterEach(cleanup)
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ')
const range = { from: '2026-09-28', to: '2026-09-28' }

describe('tarjetas de rentabilidad (F7-06, F7-08)', () => {
  it('«Intereses cobrados» del empeño es el interés NETO, como en el estado de resultados', () => {
    render(<PawnCard range={range} />)
    const label = screen.getByText('Intereses cobrados')
    expect(text(label.parentElement)).toContain('$ 42.000')
    // Rediseño P3: el % en es-CO, «5,25 %» (F9-21).
    expect(screen.getByText('5,25 %', { exact: false })).toBeTruthy()
  })

  it('«descuentos aplicados» incluye la venta bajo el precio publicado (total_discounts)', () => {
    render(<ProfitCard range={range} />)
    expect(text(screen.getByText(/descuentos aplicados/))).toContain('$ 105.000')
  })
})
