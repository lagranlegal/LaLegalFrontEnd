import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import quotes from './fixtures/backend-quote.json'

/**
 * Rediseño P3 (F9-30): «Nuevo contrato» con el resumen del préstamo al lado,
 * en vivo, y el botón «Registrar préstamo $ X» dentro. El interés mensual es
 * la regla del backend (`rules.monthly_interest`: tasa × capital, centavos
 * ROUND_HALF_UP) y solo aparece cuando se puede calcular igual que allá.
 */
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: 'idle' }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { user: { id: 'u1' }, company: { id: 'c1' }, permissions: [] } }) }))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/lib/customers/search', () => ({ useCustomerSearch: () => ({ data: [], isFetching: false }) }))
const quoteState = vi.hoisted(() => ({ value: { quote: undefined as unknown, error: null as unknown, isUpdating: false } }))
vi.mock('@/features/contracts/api', () => ({
  useCreateContract: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useLoanQuote: () => quoteState.value,
}))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: vi.fn(async () => ({ confirmed: false })) }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [] }) }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))

const { monthlyInterestPreview, previewRate } = await import('@/features/contracts/loanPreview')
const { ContractFormPage } = await import('@/features/contracts/pages/ContractFormPage')
const { LoanSummaryCard } = await import('@/features/contracts/components/LoanSummaryCard')

afterEach(() => {
  cleanup()
  quoteState.value = { quote: undefined, error: null, isUpdating: false }
})
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ')

describe('monthlyInterestPreview: la regla del backend, en centavos', () => {
  it('500.000 al 5 % → 25.000 (el ejemplo de F9-30); la coma decimal se acepta', () => {
    expect(monthlyInterestPreview('500000.00', '5')).toBe('25000.00')
    expect(monthlyInterestPreview('500000.00', '5,5')).toBe('27500.00')
  })

  it('redondea a centavos en la mitad hacia arriba, como `quantize` (ROUND_HALF_UP)', () => {
    // Decimal('1.5') / 100 * Decimal('333333') = 4999.995 → 5000.00
    expect(monthlyInterestPreview('333333.00', '1.5')).toBe('5000.00')
  })

  it('sin tasa válida o sin monto, no hay cifra (no un cero)', () => {
    expect(monthlyInterestPreview('500000.00', '')).toBeNull()
    expect(monthlyInterestPreview('500000.00', '0')).toBeNull()
    expect(monthlyInterestPreview('500000.00', 'abc')).toBeNull()
    expect(monthlyInterestPreview('500000.00', '101')).toBeNull()
    expect(monthlyInterestPreview('0.00', '5')).toBeNull()
    // `numeric(5,2)`: con un tercer decimal la base redondea la tasa; mejor no mostrar.
    expect(monthlyInterestPreview('500000.00', '5,125')).toBeNull()
    expect(previewRate('5,125')).toBeNull()
  })
})

describe('Nuevo contrato: el resumen del préstamo es la cotización', () => {
  it('pinta lo que cotiza el backend y el botón lleva el total a entregar', () => {
    quoteState.value = { quote: quotes.cotizacion_completa.body, error: null, isUpdating: false }
    render(<ContractFormPage />)
    fireEvent.change(screen.getByLabelText('Monto del préstamo'), { target: { value: '1234567' } })
    const resumen = screen.getByRole('region', { name: 'Resumen del préstamo' })
    expect(text(resumen)).toContain('Capital$ 1.234.567')
    expect(text(resumen)).toContain('Tasa5,56 % mensual')
    // 68.641,93 en la API: `Money` muestra pesos, como en el resto de la app.
    expect(text(resumen)).toContain('Interés mensual$ 68.642')
    expect(text(resumen)).toContain('Total a entregar$ 1.234.567')
    expect(text(resumen)).toContain('Sale deEfectivo')
    // El botón de registrar vive dentro del resumen (de bloque, con el total).
    expect(text(within(resumen).getByRole('button', { name: /Registrar préstamo/ }))).toContain('$ 1.234.567')
  })

  it('Enter en un campo no registra el préstamo', () => {
    render(<ContractFormPage />)
    const tasa = screen.getByLabelText('Tasa de interés mensual (%)')
    // `preventImplicitSubmit` cancela el Enter: fireEvent devuelve false.
    expect(fireEvent.keyDown(tasa, { key: 'Enter' })).toBe(false)
  })
})

describe('LoanSummaryCard: lo que trae la cotización', () => {
  const card = (quote: unknown, principal = '1234567.00') =>
    render(
      <LoanSummaryCard principal={principal} quote={quote as never} isUpdating={false} paymentMethodLabel="Efectivo" accountName="Caja principal">
        <button type="submit">Registrar</button>
      </LoanSummaryCard>,
    )

  it('plazo, fechas, avalúo y préstamo sobre avalúo', () => {
    card(quotes.cotizacion_completa.body)
    const resumen = screen.getByRole('region', { name: 'Resumen del préstamo' })
    expect(text(resumen)).toContain('Plazo4 meses')
    expect(text(resumen)).toContain('Primer pago01/11/2026')
    expect(text(resumen)).toContain('Fin del plazo01/02/2027')
    expect(text(resumen)).toContain('Avalúo$ 2.000.000')
    expect(text(resumen)).toContain('Préstamo sobre avalúo61,73 % de 70 %')
    expect(text(resumen)).toContain('Sale deEfectivo · Caja principal')
  })

  it('sin categoría ni avalúo no inventa: el plazo lo dice, el LTV no aparece', () => {
    card(quotes.cuerpo_vacio.body, '0.00')
    const resumen = screen.getByRole('region', { name: 'Resumen del préstamo' })
    expect(text(resumen)).toContain('PlazoSegún la categoría')
    expect(text(resumen)).not.toContain('Avalúo')
    expect(text(resumen)).not.toContain('Préstamo sobre avalúo')
  })
})
