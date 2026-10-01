import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import quotes from './fixtures/backend-quote.json'

/**
 * El «Resumen del préstamo» de Nuevo contrato pide sus cifras a
 * `POST /contracts/quote` (`useLoanQuote`, 01/10/2026): el front ya no
 * calcula el interés. Acá corre el hook DE VERDAD sobre el formulario real;
 * solo el cliente HTTP es falso, y responde con lo capturado del backend
 * (`fixtures/backend-quote.json`).
 */
const post = vi.hoisted(() => vi.fn())
const perms = vi.hoisted(() => ({ list: ['contracts.create'] as string[] }))

vi.mock('@/lib/api/client', async () => {
  const errors = await import('@/lib/api/errors')
  return {
    api: { POST: (...a: unknown[]) => post(...a), GET: vi.fn() },
    unwrap: (p: Promise<unknown>) => p,
    ApiError: errors.ApiError,
    NetworkError: errors.NetworkError,
  }
})
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: 'idle' }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => perms.list.includes(code) }))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { user: { id: 'u1' }, company: { id: 'c1' }, permissions: perms.list } }) }))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/lib/customers/search', () => ({ useCustomerSearch: () => ({ data: [], isFetching: false }) }))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: vi.fn(async () => ({ confirmed: false })) }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [] }) }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))

const { ContractFormPage } = await import('@/features/contracts/pages/ContractFormPage')
const { loanQuoteBody } = await import('@/features/contracts/loanPreview')
const { LOAN_QUOTE_DEBOUNCE_MS } = await import('@/features/contracts/api')
const { parseApiError } = await import('@/lib/api/errors')

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ')
const resumen = () => screen.getByRole('region', { name: 'Resumen del préstamo' })
const quoteCalls = () => post.mock.calls.filter(([path]) => path === '/api/v1/contracts/quote')
const lastBody = () => (quoteCalls().at(-1)?.[1] as { body: Record<string, unknown> }).body

function renderForm() {
  const client = new QueryClient()
  return render(
    <QueryClientProvider client={client}>
      <ContractFormPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  perms.list = ['contracts.create']
  post.mockReset()
})
afterEach(cleanup)

describe('Nuevo contrato: el resumen es la cotización del backend', () => {
  it('pinta las cifras de la cotización: tasa guardada, interés, plazo, fechas, LTV y total', async () => {
    post.mockResolvedValue(quotes.cotizacion_completa.body)
    renderForm()
    fireEvent.change(screen.getByLabelText('Monto del préstamo'), { target: { value: '1234567' } })
    fireEvent.change(screen.getByLabelText('Tasa de interés mensual (%)'), { target: { value: '5,555' } })

    await waitFor(() => expect(lastBody()).toMatchObject({ principal: '1234567.00', interest_rate_pct: '5.555' }))
    await waitFor(() => expect(text(resumen())).toContain('Tasa5,56 % mensual'))
    const r = text(resumen())
    expect(r).toContain('Capital$ 1.234.567')
    expect(r).toContain('Plazo4 meses')
    expect(r).toContain('Interés mensual$ 68.642')
    expect(r).toContain('Primer pago01/11/2026')
    expect(r).toContain('Fin del plazo01/02/2027')
    expect(r).toContain('Avalúo$ 2.000.000')
    expect(r).toContain('Préstamo sobre avalúo61,73 % de 70 %')
    expect(r).toContain('Total a entregar$ 1.234.567')
    expect(text(screen.getByRole('button', { name: /Registrar préstamo/ }))).toBe('Registrar préstamo $ 1.234.567')
  })

  it('una cotización parcial (null en lo que falta) se dice con «—», nunca con un cero', async () => {
    post.mockResolvedValue(quotes.capital_cero_sin_categoria.body)
    renderForm()
    await waitFor(() => expect(text(resumen())).toContain('Tasa5,00 % mensual'))
    const r = text(resumen())
    expect(r).toContain('Capital—')
    expect(r).toContain('PlazoSegún la categoría')
    expect(r).toContain('Interés mensual—')
    expect(r).toContain('Primer pago01/11/2026')
    expect(r).toContain('Fin del plazo—')
    expect(r).toContain('Total a entregar—')
    expect(r).not.toContain('$ 0')
    expect(text(screen.getByRole('button', { name: /Registrar préstamo/ }))).toBe('Registrar préstamo')
  })

  it('un 4xx no rompe el formulario: «—» en lo cotizado, sin reintentos y sin banner de error', async () => {
    const fx = quotes.tasa_invalida_422
    post.mockRejectedValue(parseApiError(fx.status, fx.body))
    renderForm()
    fireEvent.change(screen.getByLabelText('Tasa de interés mensual (%)'), { target: { value: '150' } })
    await waitFor(() => expect(lastBody()).toMatchObject({ interest_rate_pct: '150' }))
    // Más que el debounce y que un reintento con su espera: sigue siendo una sola.
    await act(() => new Promise((resolve) => setTimeout(resolve, LOAN_QUOTE_DEBOUNCE_MS + 200)))
    expect(quoteCalls().filter(([, init]) => (init as { body: { interest_rate_pct: unknown } }).body.interest_rate_pct === '150')).toHaveLength(1)

    const r = text(resumen())
    expect(r).toContain('Tasa—')
    expect(r).toContain('Interés mensual—')
    expect(r).toContain('Total a entregar—')
    expect(r).not.toMatch(/no se pudo/i)
    // El formulario sigue vivo: se puede seguir escribiendo y el botón está.
    fireEvent.change(screen.getByLabelText('Tasa de interés mensual (%)'), { target: { value: '5' } })
    expect(screen.getByLabelText('Tasa de interés mensual (%)')).toHaveValue('5')
    expect(screen.getByRole('button', { name: /Registrar préstamo/ })).toBeEnabled()
  })

  it('debounce: teclear rápido es UNA petición, con lo último que se escribió', async () => {
    post.mockResolvedValue(quotes.cuerpo_vacio.body)
    renderForm()
    // La primera, al abrir el formulario.
    await waitFor(() => expect(quoteCalls()).toHaveLength(1))
    const monto = screen.getByLabelText('Monto del préstamo')
    // Una tecla cada 50 ms: más rápido que el debounce, más lento que un render.
    for (const v of ['5', '50', '500', '5000', '50000', '500000']) {
      fireEvent.change(monto, { target: { value: v } })
      await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    }
    expect(quoteCalls()).toHaveLength(1)
    await waitFor(() => expect(quoteCalls()).toHaveLength(2))
    expect(lastBody()).toMatchObject({ principal: '500000.00' })
    await act(() => new Promise((resolve) => setTimeout(resolve, LOAN_QUOTE_DEBOUNCE_MS + 100)))
    expect(quoteCalls()).toHaveLength(2)
  })

  it('mientras llega la nueva cotización se ven las cifras anteriores, con el aviso de que cambian', async () => {
    post.mockResolvedValueOnce(quotes.cotizacion_completa.body)
    renderForm()
    await waitFor(() => expect(text(resumen())).toContain('Interés mensual$ 68.642'))
    expect(screen.queryByRole('status', { name: 'Actualizando resultados' })).not.toBeInTheDocument()

    post.mockReturnValue(new Promise(() => {}))
    fireEvent.change(screen.getByLabelText('Monto del préstamo'), { target: { value: '900000' } })
    expect(screen.getByRole('status', { name: 'Actualizando resultados' })).toBeInTheDocument()
    await waitFor(() => expect(quoteCalls()).toHaveLength(2))
    expect(text(resumen())).toContain('Interés mensual$ 68.642')
    expect(screen.getByRole('status', { name: 'Actualizando resultados' })).toBeInTheDocument()
  })

  it('sin contracts.create no se cotiza (y no es una falla)', async () => {
    perms.list = []
    renderForm()
    fireEvent.change(screen.getByLabelText('Monto del préstamo'), { target: { value: '500000' } })
    await act(() => new Promise((resolve) => setTimeout(resolve, LOAN_QUOTE_DEBOUNCE_MS + 100)))
    expect(quoteCalls()).toHaveLength(0)
    expect(text(resumen())).toContain('Interés mensual—')
    expect(screen.queryByRole('status', { name: 'Actualizando resultados' })).not.toBeInTheDocument()
  })
})

describe('loanQuoteBody: solo la forma, no la regla', () => {
  const base = { principal: '0.00', interest_rate_pct: '', appraisal_value: '', extension_months: 1, extension_window_days: '', items: [] }

  it('lo que aún no es número va null; la coma decimal se normaliza; de la prenda, solo la categoría', () => {
    expect(
      loanQuoteBody({
        ...base,
        principal: '1234567.00',
        interest_rate_pct: ' 5,555 ',
        appraisal_value: '2000000.00',
        extension_months: 2,
        extension_window_days: '10',
        items: [{ category_id: 'cat-1', description: 'Cadena' } as { category_id: string }, { category_id: '' }],
      }),
    ).toEqual({
      principal: '1234567.00',
      interest_rate_pct: '5.555',
      appraisal_value: '2000000.00',
      extension_months: 2,
      extension_window_days: 10,
      items: [{ category_id: 'cat-1' }, { category_id: null }],
    })
    expect(loanQuoteBody({ ...base, interest_rate_pct: '5,' })).toMatchObject({ interest_rate_pct: null, appraisal_value: null, extension_window_days: null })
    expect(loanQuoteBody({ ...base, interest_rate_pct: '0' })).toMatchObject({ interest_rate_pct: null })
    // Con forma de número va tal cual aunque sea inválido: el backend dice el error.
    expect(loanQuoteBody({ ...base, interest_rate_pct: '150' })).toMatchObject({ interest_rate_pct: '150' })
    expect(loanQuoteBody({ ...base, extension_months: Number.NaN })).toMatchObject({ extension_months: 1 })
  })
})

describe('el interés ya no se calcula en el navegador', () => {
  function archivos(dir: string): string[] {
    return readdirSync(dir).flatMap((n) => {
      const p = join(dir, n)
      return statSync(p).isDirectory() ? archivos(p) : /\.tsx?$/.test(n) ? [p] : []
    })
  }

  it('no queda la función local del interés ni su tasa de vista previa', () => {
    const src = archivos(join(__dirname, '..', 'src')).filter((f) => !f.endsWith(join('types', 'api.ts')))
    const conCalculo = src.filter((f) => /monthlyInterestPreview|previewRate/.test(readFileSync(f, 'utf8')))
    expect(conCalculo).toEqual([])
  })

  it('el resumen y su formulario no hacen cuentas de porcentaje', () => {
    for (const f of ['features/contracts/loanPreview.ts', 'features/contracts/components/LoanSummaryCard.tsx', 'features/contracts/pages/ContractFormPage.tsx']) {
      expect(readFileSync(join(__dirname, '..', 'src', f), 'utf8'), f).not.toMatch(/percentOfMoney|multiplyMoney/)
    }
  })
})
