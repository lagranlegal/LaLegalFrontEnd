import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * F4-11 del backend (commit 2918272, 27/09/2026): saldar un contrato causa
 * como mínimo UN mes de interés. `GET /payment-options` trae `payoff_months`,
 * `payoff_interest` y `payoff_total`; saldar con menos meses responde 422
 * `PAYMENT_MINIMUM_INTEREST_REQUIRED`.
 *
 * El caso que rompía: contrato de $1.000.000 al 5 % saldado dentro del primer
 * mes. `months_owed` es 0, así que la pantalla mostraba el abono solo a
 * capital y mandaba `months_covered: 0`.
 *
 * Sobres REALES, copiados de la respuesta del backend local (TestClient) en
 * `test_contracts.py::test_saldar_dentro_del_primer_mes_cobra_un_mes`.
 */
const COTIZACION_PRIMER_MES = {
  months_owed: 0,
  monthly_interest: '50000.00',
  options: [],
  payoff_months: 1,
  payoff_interest: '50000.00',
  payoff_total: '1050000.00',
}

const mutateAsync = vi.fn()
const refetch = vi.fn()

vi.mock('@/features/contracts/api', () => ({
  usePaymentOptions: () => ({ data: COTIZACION_PRIMER_MES, isPending: false, isError: false, refetch }),
  useCreatePayment: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: ReactNode }) => children }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: vi.fn(async () => ({ confirmed: true })) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { PaymentOptionsPanel } = await import('@/features/contracts/components/PaymentOptionsPanel')

beforeEach(() => {
  mutateAsync.mockReset()
  mutateAsync.mockResolvedValue({})
})
afterEach(cleanup)

describe('saldar dentro del primer mes', () => {
  it('abonar TODO el capital manda el mes mínimo y muestra el total real', async () => {
    render(<PaymentOptionsPanel contractId="c1" />)
    fireEvent.change(screen.getByLabelText(/Abono a capital/i), { target: { value: '1.000.000' } })

    // El total que ve el cajero es el que va a cobrar: capital + un mes.
    expect(screen.getByText(/mínimo un mes de interés/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /1\.050\.000/ })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /1\.050\.000/ }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0]![0]).toMatchObject({ months_covered: 1, capital_amount: '1000000.00' })
  })

  it('«Saldar el contrato» llena el capital completo', () => {
    render(<PaymentOptionsPanel contractId="c1" />)
    fireEvent.click(screen.getByRole('button', { name: /Saldar el contrato/i }))
    expect((screen.getByLabelText(/Abono a capital/i) as HTMLInputElement).value).toBe('1.000.000')
  })

  it('un abono parcial a capital sigue sin cubrir meses', async () => {
    render(<PaymentOptionsPanel contractId="c1" />)
    fireEvent.change(screen.getByLabelText(/Abono a capital/i), { target: { value: '300.000' } })
    expect(screen.queryByText(/mínimo un mes de interés/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Registrar abono/i }))
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0]![0]).toMatchObject({ months_covered: 0, capital_amount: '300000.00' })
  })
})
