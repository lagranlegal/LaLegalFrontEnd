import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ApiError } from '@/lib/api/errors'

/**
 * F9-47: si falla un endpoint de Reportes, la sección muestra su error con
 * «Reintentar» en vez de desaparecer (el dueño veía un reporte sin la
 * utilidad y sin saberlo). Un 403 sigue ocultándola: no es una falla.
 */
const state = vi.hoisted(() => ({ error: null as unknown, refetch: vi.fn() }))

vi.mock('@/features/reports/api', () => {
  const failing = () => ({ data: undefined, isPending: false, isError: true, error: state.error, refetch: state.refetch })
  return { useProfitSummary: failing, usePawnPerformance: failing }
})

const { PawnCard, ProfitCard } = await import('@/features/reports/components/PerformanceCards')

afterEach(() => {
  cleanup()
  state.refetch.mockClear()
})
const range = { from: '2026-09-01', to: '2026-09-28' }

describe('Reportes — una sección que falla no desaparece', () => {
  it('500: título, error y Reintentar que vuelve a pedir', () => {
    state.error = new ApiError({ status: 500, code: 'UNKNOWN', message: 'x' })
    render(<ProfitCard range={range} />)
    expect(screen.getByText('Utilidad bruta de tienda')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toMatch(/No se pudo cargar/)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(state.refetch).toHaveBeenCalledOnce()
    cleanup()
    render(<PawnCard range={range} />)
    expect(screen.getByText('Rentabilidad del empeño')).toBeInTheDocument()
  })

  it('403: se oculta, sin Reintentar', () => {
    state.error = new ApiError({ status: 403, code: 'PERMISSION_DENIED', message: 'x' })
    const { container } = render(<ProfitCard range={range} />)
    expect(container.textContent).toBe('')
  })
})
