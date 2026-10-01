import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * F9-18: la confirmación del abono es el último control antes de mover plata
 * y solo decía «1 mes de interés.». Ahora repite contrato, cliente, qué se
 * paga, total, medio de pago y cuenta de destino.
 */

const confirmMock = vi.hoisted(() => vi.fn(async (_opts: unknown) => ({ confirmed: false })))

vi.mock('@/features/contracts/api', () => ({
  usePaymentOptions: () => ({
    data: {
      months_owed: 1,
      monthly_interest: '50000.00',
      options: [{ months: 1, interest_amount: '50000.00', total: '50000.00', allows_capital: true }],
      payoff_months: 1,
      payoff_interest: '50000.00',
      payoff_total: '1050000.00',
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCreatePayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: ReactNode }) => children }))
// El selector real se reemplaza por uno que ya eligió la cuenta, como hace la
// preselección de la predeterminada.
vi.mock('@/components/shared/AccountPicker', async () => {
  const { useEffect } = await import('react')
  return {
    AccountPicker: ({ onChange }: { onChange: (id: string) => void }) => {
      useEffect(() => onChange('acc-caja'), [onChange])
      return null
    },
  }
})
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [{ id: 'acc-caja', name: 'Caja principal', type: 'cash' }] }) }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/confirmStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/shared/confirmStore')>()),
  confirm: confirmMock,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { PaymentOptionsPanel } = await import('@/features/contracts/components/PaymentOptionsPanel')

afterEach(() => {
  cleanup()
  confirmMock.mockClear()
})

describe('confirmación del abono con resumen', () => {
  it('repite contrato, cliente, meses, total, medio y cuenta', async () => {
    render(<PaymentOptionsPanel contractId="c1" contractNumber={6} customerName="Cliente de Prueba" />)
    // Rediseño P2-a: con un mes adeudado, «Ponerse al día · 1 mes» viene
    // preseleccionada; el botón ya trae el monto.
    expect(screen.getByRole('radio', { name: /Ponerse al día · 1 mes/ })).toBeChecked()
    fireEvent.click(await screen.findByRole('button', { name: /Registrar abono/ }))
    await waitFor(() => expect(confirmMock).toHaveBeenCalled())
    const { summary } = confirmMock.mock.calls[0]![0] as { summary: { label: string; value: string }[] }
    const filas = Object.fromEntries(summary.map((r) => [r.label, r.value]))
    expect(filas).toMatchObject({
      Contrato: '#6',
      Cliente: 'Cliente de Prueba',
      Paga: '1 mes de interés',
      'Medio de pago': 'Efectivo',
      'Entra a': 'Caja principal',
    })
    expect(filas.Total).toMatch(/50\.000/)
  })
})

describe('ConfirmDialog pinta el resumen', () => {
  it('un renglón por dato, y omite los vacíos', async () => {
    const { ConfirmDialogHost } = await import('@/components/shared/ConfirmDialog')
    const { useConfirmStore } = await import('@/components/shared/confirmStore')
    render(<ConfirmDialogHost />)
    act(() => {
      useConfirmStore.setState({
        id: 1,
        options: { title: 'Registrar abono', summary: [{ label: 'Contrato', value: '#6' }, { label: 'Entra a', value: null }] },
        resolver: () => {},
      })
    })
    expect(await screen.findByText('#6')).toBeInTheDocument()
    expect(screen.getByText('Contrato')).toBeInTheDocument()
    expect(screen.queryByText('Entra a')).toBeNull()
  })
})
