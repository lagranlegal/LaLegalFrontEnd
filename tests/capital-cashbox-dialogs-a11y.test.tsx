import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * Issue #4: el motivo del aporte/retiro y la justificación del descuadre usan
 * el campo compartido. La justificación faltante se anunciaba solo como texto
 * rojo; ahora el campo queda inválido y el lector de pantalla dice por qué.
 */
const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: [], isPending: false, error: null }) }))
vi.mock('@/features/capital/api', () => ({ useCreateContribution: mutation, useCreateWithdrawal: mutation }))
vi.mock('@/features/cashbox/api', () => ({
  useSessionReport: () => ({ data: { expected_cash: '100000.00' }, isPending: false, isError: false, refetch: vi.fn() }),
  useCloseSession: mutation,
}))
vi.mock('@/features/cashbox/components/SessionReportPanel', () => ({ SessionReportPanel: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))

const { CapitalMovementDialog } = await import('@/features/capital/components/CapitalMovementDialog')
const { CloseSessionDialog } = await import('@/features/cashbox/components/CloseSessionDialog')

afterEach(cleanup)

describe('aporte y retiro', () => {
  it('el motivo tiene su etiqueta', () => {
    render(<CapitalMovementDialog open onOpenChange={() => {}} direction="withdrawal" />)
    expect(screen.getByRole('textbox', { name: 'Motivo' })).toBeInTheDocument()
  })
})

describe('cierre de caja', () => {
  it('con descuadre, la justificación faltante se anuncia con su motivo', () => {
    const sesion = { id: '3f1c8a52-6c0e-4b44-9d0b-6e0f5a3d2c11' } as Parameters<typeof CloseSessionDialog>[0]['session']
    render(<CloseSessionDialog open onOpenChange={() => {}} session={sesion} />)
    const justificacion = screen.getByRole('textbox', {
      name: 'Justificación del descuadre',
      description: 'Obligatoria mientras haya diferencia, sin excepción.',
    })
    expect(justificacion.getAttribute('aria-invalid')).toBe('true')

    fireEvent.change(justificacion, { target: { value: 'Faltó un billete' } })
    expect(justificacion.hasAttribute('aria-invalid')).toBe(false)
    expect(justificacion.hasAttribute('aria-describedby')).toBe(false)
  })
})
