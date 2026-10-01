import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Rediseño P2-a, «Tres opciones con consecuencia»: 1 mes, ponerse al día
 * (preseleccionada con mora) y saldar, cada una diciendo cómo queda el
 * contrato; el resto detrás de «Más meses o abono a capital». El caso es el de
 * la maqueta: $1.000.000 al 5 %, interés pagado hasta el 28/08, dos meses
 * adeudados. La cotización tiene la forma de `PaymentQuoteOut` de los sobres
 * reales de `payoff-minimum-interest.test.tsx`, con los meses de este caso.
 */
const COTIZACION_EN_MORA = {
  months_owed: 2,
  monthly_interest: '50000.00',
  options: [
    { months: 1, interest_amount: '50000.00', total: '50000.00', allows_capital: false },
    { months: 2, interest_amount: '100000.00', total: '100000.00', allows_capital: true },
    { months: 3, interest_amount: '150000.00', total: '150000.00', allows_capital: true },
  ],
  payoff_months: 2,
  payoff_interest: '100000.00',
  payoff_total: '1100000.00',
}

const mutateAsync = vi.fn()
const confirmMock = vi.hoisted(() => vi.fn(async (_opts: unknown) => ({ confirmed: true })))

vi.mock('@/features/contracts/api', () => ({
  usePaymentOptions: () => ({ data: COTIZACION_EN_MORA, isPending: false, isError: false, refetch: vi.fn() }),
  useCreatePayment: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: ReactNode }) => children }))
vi.mock('@/components/shared/AccountPicker', async () => {
  const { useEffect } = await import('react')
  return {
    AccountPicker: ({ onChange }: { onChange: (id: string) => void }) => {
      useEffect(() => onChange('acc-caja'), [onChange])
      return <span>selector de cuenta</span>
    },
  }
})
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [{ id: 'acc-caja', name: 'Caja principal', type: 'cash' }] }) }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: confirmMock }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { PaymentOptionsPanel, paymentConsequence } = await import('@/features/contracts/components/PaymentOptionsPanel')

function renderPanel() {
  return render(<PaymentOptionsPanel contractId="c1" contractNumber={43} customerName="Cliente de Prueba" interestPaidUntil="2026-08-28" status="in_arrears" itemCount={1} />)
}

beforeEach(() => {
  mutateAsync.mockReset()
  mutateAsync.mockResolvedValue({})
  confirmMock.mockClear()
})
afterEach(cleanup)

const sinEspacios = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ')

describe('registrar abono con tres opciones', () => {
  it('con mora, «Ponerse al día · 2 meses» viene marcada y cada opción dice su consecuencia', () => {
    renderPanel()
    expect(screen.getByRole('radio', { name: /Ponerse al día · 2 meses/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /1 mes de interés/ })).not.toBeChecked()
    expect(screen.getByText('sigue en mora, pagado hasta 28/09')).toBeInTheDocument()
    expect(screen.getByText('queda vigente, pagado hasta 28/10')).toBeInTheDocument()
    expect(screen.getByText('capital + intereses, devuelve la prenda')).toBeInTheDocument()
    // Las demás opciones no están a la vista hasta pedirlas.
    expect(screen.queryByRole('radio', { name: /3 meses/ })).toBeNull()
  })

  it('el botón de bloque lleva el monto de la opción elegida', () => {
    renderPanel()
    expect(sinEspacios(screen.getByRole('button', { name: /Registrar abono/ }).textContent)).toBe('Registrar abono $ 100.000')
    fireEvent.click(screen.getByRole('radio', { name: /Saldar el contrato/ }))
    expect(sinEspacios(screen.getByRole('button', { name: /Registrar abono/ }).textContent)).toBe('Registrar abono $ 1.100.000')
  })

  it('ponerse al día manda los meses adeudados, sin capital', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /Registrar abono/ }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0]![0]).toMatchObject({ months_covered: 2, capital_amount: null, payment_method: 'cash', account_id: 'acc-caja' })
  })

  it('saldar manda payoff_months y el capital completo, y lo confirma con el resumen', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('radio', { name: /Saldar el contrato/ }))
    fireEvent.click(screen.getByRole('button', { name: /Registrar abono/ }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0]![0]).toMatchObject({ months_covered: 2, capital_amount: '1000000.00' })
    const { title, summary } = confirmMock.mock.calls[0]![0] as { title: string; summary: { label: string; value: string }[] }
    expect(title).toBe('¿Saldar el contrato?')
    expect(sinEspacios(summary.find((r) => r.label === 'Total')?.value)).toBe('$ 1.100.000')
  })

  it('«Más meses o abono a capital» despliega todos los meses y el capital', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /Más meses o abono a capital/ }))
    fireEvent.click(screen.getByRole('radio', { name: /3 meses/ }))
    fireEvent.change(screen.getByLabelText(/Abono a capital/), { target: { value: '200.000' } })
    expect(sinEspacios(screen.getByRole('button', { name: /Registrar abono/ }).textContent)).toBe('Registrar abono $ 350.000')
  })

  it('Enter en un campo no registra dinero', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: /Más meses o abono a capital/ }))
    // `fireEvent` devuelve false si alguien llamó preventDefault.
    expect(fireEvent.keyDown(screen.getByLabelText(/Abono a capital/), { key: 'Enter' })).toBe(false)
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('medio de pago segmentado y la cuenta en una línea con «Cambiar»', async () => {
    renderPanel()
    expect(screen.getByRole('radio', { name: 'Efectivo' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Transferencia' }))
    expect(screen.getByRole('radio', { name: 'Transferencia' })).toHaveAttribute('aria-checked', 'true')
    expect(sinEspacios((await screen.findByText('Caja principal')).parentElement?.textContent)).toBe('Entra a Caja principal · Cambiar')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cambiar' })))
    expect(screen.getByText('selector de cuenta')).toBeVisible()
  })
})

describe('paymentConsequence', () => {
  it('en prórroga no afirma el estado: dice cuánto queda debiendo', () => {
    expect(paymentConsequence(1, 3, { interestPaidUntil: '2026-08-28', status: 'in_extension' })).toBe('aún debe 2 meses, pagado hasta 28/09')
    expect(paymentConsequence(3, 3, { interestPaidUntil: '2026-08-28', status: 'in_extension' })).toBe('queda vigente, pagado hasta 28/11')
  })
})
