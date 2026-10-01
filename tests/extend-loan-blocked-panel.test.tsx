import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * F9-17: con la ventana de ampliación vencida, el panel mostraba en grande
 * «Puede retirar hasta $ 1.100.000», plata que no se puede usar. Bloqueado,
 * muestra el motivo en su lugar. Rediseño P2-a: tampoco el cupo como dato
 * chico — una cifra de plata que no se puede usar no va (como la maqueta).
 */
const cupo = vi.hoisted(() => ({
  current: { ceiling: '2000000.00', available: '1100000.00', window_ends_on: '2026-09-19', is_open: false, blocked_reason: 'EXTENSION_WINDOW_CLOSED' as string | null },
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/features/contracts/api', () => ({
  useExtensionOptions: () => ({ data: cupo.current, isPending: false }),
  useExtendLoan: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useContractChain: () => ({ data: undefined }),
}))
vi.mock('@/components/shared/Can', () => ({ Can: ({ children }: { children: ReactNode }) => children }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => false }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))

const { ExtendLoanPanel } = await import('@/features/contracts/components/ExtendLoanPanel')

const contract = {
  id: 'c1',
  capital_balance: '900000.00',
  interest_paid_until: '2026-09-01',
  interest_rate_pct: '5.00',
  extension_interest_policy: 'keep_anchor',
  parent_contract_id: null,
} as unknown as Parameters<typeof ExtendLoanPanel>[0]['contract']

afterEach(cleanup)

describe('panel de ampliación', () => {
  it('bloqueado: el motivo en lugar de «Puede retirar hasta» y sin formulario', () => {
    render(<ExtendLoanPanel contract={contract} />)
    expect(screen.queryByText('Puede retirar hasta')).toBeNull()
    expect(screen.queryByLabelText('Monto a entregar')).toBeNull()
    expect(screen.queryByText(/Cupo sobre el avalúo/)).toBeNull()
    expect(screen.queryByText(/1\.100\.000/)).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent(/Ya no se puede ampliar\. El plazo para ampliar este préstamo venció el 19\/09\/2026/)
  })

  it('en mora: «No disponible mientras esté en mora» y la salida', () => {
    cupo.current = { ...cupo.current, blocked_reason: 'CONTRACT_INTEREST_OVERDUE' }
    render(<ExtendLoanPanel contract={contract} />)
    expect(screen.getByRole('status')).toHaveTextContent('No disponible mientras esté en mora. Ponlo al día para ver cuánto puede retirar.')
  })

  it('abierto: la cifra grande y el formulario siguen', () => {
    cupo.current = { ...cupo.current, is_open: true, blocked_reason: null, window_ends_on: '2026-10-19' }
    render(<ExtendLoanPanel contract={contract} />)
    expect(screen.getByText('Puede retirar hasta')).toBeInTheDocument()
    expect(screen.getByLabelText('Monto a entregar')).toBeInTheDocument()
  })
})
