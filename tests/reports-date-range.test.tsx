import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import fixtures from './fixtures/backend-f1.json'
import { MAX_PROFIT_RANGE_DAYS, reportRangeProblem } from '@/features/reports/aggregate'

let pawnError: unknown = null
vi.mock('@/features/reports/api', () => ({
  useProfitSummary: () => ({ data: undefined, isPending: true, isError: false, error: null }),
  usePawnPerformance: () => ({ data: undefined, isPending: false, isError: pawnError !== null, error: pawnError }),
}))
const { PawnCard, ProfitCard } = await import('@/features/reports/components/PerformanceCards')
const { parseApiError } = await import('@/lib/api/errors')

afterEach(cleanup)

describe('rango de fechas de los reportes (INVALID_DATE_RANGE / DATE_RANGE_TOO_LONG)', () => {
  it('reportRangeProblem es el espejo de _validate_range del backend', () => {
    expect(reportRangeProblem({ from: '2026-08-10', to: '2026-08-01' })).toMatch(/posterior/)
    // El backend compara la DIFERENCIA de días contra 366.
    expect(reportRangeProblem({ from: '2024-01-01', to: '2025-01-01' }, MAX_PROFIT_RANGE_DAYS)).toBeNull()
    expect(reportRangeProblem({ from: '2024-01-01', to: '2025-01-02' }, MAX_PROFIT_RANGE_DAYS)).toMatch(/366 días/)
    // El rango real que el backend rechazó con DATE_RANGE_TOO_LONG.
    const largo = fixtures.error_rango_largo.body.details
    expect(reportRangeProblem({ from: largo.from_date, to: largo.to_date }, MAX_PROFIT_RANGE_DAYS)).not.toBeNull()
  })

  it('la tarjeta dice por qué no hay datos en vez de desaparecer', () => {
    render(<ProfitCard range={{ from: '2020-01-01', to: '2026-01-01' }} />)
    expect(screen.getByRole('status').textContent).toMatch(/hasta 366 días/)
  })

  it('si el backend responde 422, se muestra su mensaje', () => {
    pawnError = parseApiError(422, fixtures.error_rango_invertido.body)
    render(<PawnCard range={{ from: '2026-08-01', to: '2026-08-10' }} />)
    expect(screen.getByRole('status').textContent).toBe(fixtures.error_rango_invertido.body.message)
  })
})
