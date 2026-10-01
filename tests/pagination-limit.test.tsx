import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { fetchAllPages, isPageLimitError, PageLimitError } from '@/lib/api/pagination'

/**
 * Issue #11: `fetchAllPages` dejaba de pedir al llegar a `maxPages` y
 * devolvía lo que llevaba, sin avisar: un reporte de una empresa con mucho
 * histórico salía incompleto y nadie lo sabía.
 */
describe('fetchAllPages nunca corta en silencio', () => {
  it('si al tope todavía hay next_cursor, lanza PageLimitError (no devuelve lo parcial)', async () => {
    const fetchPage = vi.fn(async (cursor: string | undefined) => ({ items: [cursor ?? 'p0', 'x'], next_cursor: `c${Number((cursor ?? 'c0').slice(1)) + 1}` }))
    const promesa = fetchAllPages(fetchPage, 3)
    await expect(promesa).rejects.toBeInstanceOf(PageLimitError)
    const error = await promesa.catch((e: unknown) => e)
    expect(isPageLimitError(error)).toBe(true)
    expect((error as PageLimitError).code).toBe('PAGE_LIMIT_REACHED')
    expect((error as PageLimitError).fetched).toBe(6)
    expect((error as PageLimitError).message).toMatch(/más de 6 registros.*Acorta el rango/)
    // No pide una página de más: el tope sigue siendo un tope.
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('exactamente en el tope, sin más páginas, devuelve todo', async () => {
    const pages = [
      { items: [1, 2], next_cursor: 'a' },
      { items: [3], next_cursor: 'b' },
      { items: [4], next_cursor: null },
    ]
    let i = 0
    await expect(fetchAllPages(async () => pages[i++]!, 3)).resolves.toEqual([1, 2, 3, 4])
  })

  it('una sola página sin cursor', async () => {
    await expect(fetchAllPages(async () => ({ items: ['a'] }))).resolves.toEqual(['a'])
  })
})

// --- Reportes: el corte se ve en pantalla -----------------------------------

const limitError = new PageLimitError(5000, 50)
vi.mock('@/features/reports/api', () => {
  const ok = (data: unknown) => () => ({ data, isPending: false, isError: false, error: null, refetch: vi.fn() })
  return {
    MAX_RANGE_DAYS: 90,
    useClosingsBreakdown: ok({ lines: [], sales_flow: null }),
    useClosingsInRange: ok([]),
    useCarteraActual: ok(undefined),
    useExpensesByCategory: ok([]),
    useIncomeStatement: ok(undefined),
    useMonthlySeries: ok(undefined),
    useItemSales: () => ({ data: undefined, isPending: false, isError: true, error: limitError }),
    useProfitSummary: ok(undefined),
    usePawnPerformance: ok(undefined),
    usePayables: ok(undefined),
    useInventoryValuation: ok(undefined),
    useStaleInventory: ok(undefined),
  }
})
vi.mock('@/features/cashbox/api', () => ({ useExpenseCategories: () => ({ data: [] }) }))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => true }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: unknown }) => children }))

afterEach(cleanup)

describe('Reportes con el ranking truncado (issue #11)', () => {
  it('«Lo más vendido» dice que no está completo en vez de mostrar un ranking parcial', async () => {
    const { ReportesPage } = await import('@/features/reports/pages/ReportesPage')
    render(<ReportesPage />)
    const aviso = screen.getByRole('alert')
    expect(aviso.textContent).toMatch(/más de 5\.000 registros/)
    expect(aviso.textContent).toMatch(/Acorta el rango/)
    expect(screen.queryByText('Prendas más vendidas')).toBeNull()
  })
})
