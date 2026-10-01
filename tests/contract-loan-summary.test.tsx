import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-g2.json'

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
vi.mock('@/features/contracts/api', () => ({ useCreateContract: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: vi.fn(async () => ({ confirmed: false })) }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [] }) }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))

const { monthlyInterestPreview, previewRate } = await import('@/features/contracts/loanPreview')
const { ContractFormPage } = await import('@/features/contracts/pages/ContractFormPage')
const { LoanSummaryCard } = await import('@/features/contracts/components/LoanSummaryCard')
const { evaluarLtv, resolveMaxLtvPct } = await import('@/features/contracts/ltv')
const { resolveInheritedParams } = await import('@/features/catalogs/inheritance')

afterEach(cleanup)
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

describe('Nuevo contrato: el resumen del préstamo en vivo', () => {
  it('capital, tasa e interés se actualizan al escribir, y el botón lleva el monto', () => {
    render(<ContractFormPage />)
    const resumen = screen.getByRole('region', { name: 'Resumen del préstamo' })
    expect(text(resumen)).toContain('Interés mensual—')
    expect(screen.getByRole('button', { name: /Registrar préstamo/ })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Monto del préstamo'), { target: { value: '500000' } })
    fireEvent.change(screen.getByLabelText('Tasa de interés mensual (%)'), { target: { value: '5' } })

    expect(text(resumen)).toContain('Capital$ 500.000')
    expect(text(resumen)).toContain('Tasa5,00 % mensual')
    expect(text(resumen)).toContain('Interés mensual$ 25.000')
    expect(text(resumen)).toContain('Total a entregar$ 500.000')
    expect(text(resumen)).toContain('Sale deEfectivo')
    // El botón de registrar vive dentro del resumen (de bloque, con el monto).
    expect(text(within(resumen).getByRole('button', { name: /Registrar préstamo/ }))).toContain('$ 500.000')
  })

  it('Enter en un campo no registra el préstamo', () => {
    render(<ContractFormPage />)
    const tasa = screen.getByLabelText('Tasa de interés mensual (%)')
    // `preventImplicitSubmit` cancela el Enter: fireEvent devuelve false.
    expect(fireEvent.keyDown(tasa, { key: 'Enter' })).toBe(false)
  })
})

describe('LoanSummaryCard: plazo y LTV solo con lo que se sabe', () => {
  // El árbol real L1 → L2 → L3 del backend, con plazo y LTV puestos en la
  // raíz (los fixtures los traen vacíos): la hoja los hereda.
  const arbol = [
    { ...fixtures.categoria_arbol_0.body, default_term_months: 4, max_ltv_pct: '70.00' },
    fixtures.categoria_arbol_1.body,
    fixtures.categoria_arbol_2.body,
  ]
  const hoja = fixtures.categoria_arbol_2.body.id

  it('el plazo heredado de la categoría y el préstamo sobre el avalúo', () => {
    const term = resolveInheritedParams(arbol, hoja).default_term_months
    const ltv = evaluarLtv({ principal: '700000.00', appraisalValue: '1000000.00', maxLtvPct: resolveMaxLtvPct(arbol, hoja) })
    render(
      <LoanSummaryCard principal="700000.00" rate="5" termMonths={term} monthlyInterest="35000.00" appraisalValue="1000000.00" ltv={ltv} paymentMethodLabel="Efectivo" accountName="Caja principal">
        <button type="submit">Registrar</button>
      </LoanSummaryCard>,
    )
    const resumen = screen.getByRole('region', { name: 'Resumen del préstamo' })
    expect(text(resumen)).toContain('Plazo4 meses')
    expect(text(resumen)).toContain('Avalúo$ 1.000.000')
    expect(text(resumen)).toContain('Préstamo sobre avalúo70 % de 70 %')
    expect(text(resumen)).toContain('Sale deEfectivo · Caja principal')
  })

  it('sin categoría ni avalúo no inventa: el plazo lo dice, el LTV no aparece', () => {
    render(
      <LoanSummaryCard principal="0.00" rate={null} termMonths={null} monthlyInterest={null} appraisalValue="" ltv={{ kind: 'sin-datos' }} paymentMethodLabel="Efectivo" accountName={undefined}>
        <button type="submit">Registrar</button>
      </LoanSummaryCard>,
    )
    const resumen = screen.getByRole('region', { name: 'Resumen del préstamo' })
    expect(text(resumen)).toContain('PlazoSegún la categoría')
    expect(text(resumen)).not.toContain('Avalúo')
    expect(text(resumen)).not.toContain('Préstamo sobre avalúo')
  })
})
