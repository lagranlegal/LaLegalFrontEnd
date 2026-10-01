import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * Issue #4: los diálogos de cuentas usan el campo compartido. Cada campo tiene
 * su etiqueta por `id` (el «Tipo» de una cuenta ya creada era un párrafo con
 * pinta de campo, sin nada que la etiqueta nombrara), y el aviso de que el
 * traslado excede lo disponible queda enlazado al monto.
 */
const CUENTAS = [
  { id: '7654af51-6f51-4e3e-8857-d33dbd89b2ea', name: 'Caja principal', type: 'cash', reference: null, is_default: true, active: true, opening_balance: '0.00', balance: '100000.00', created_at: '2026-09-29T02:19:55.635133Z' },
  { id: '1b0b7f1e-0f7e-4a39-9a54-3c2f1f0b9d11', name: 'Bancolombia ahorros', type: 'bank', reference: null, is_default: true, active: true, opening_balance: '0.00', balance: '0.00', created_at: '2026-09-29T02:19:55.635133Z' },
]
const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: CUENTAS, isPending: false, error: null }) }))
vi.mock('@/features/accounts/api', () => ({
  useCreateAccount: mutation,
  useUpdateAccount: mutation,
  useCreateTransfer: mutation,
  useSettleAccount: mutation,
}))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))

const { AccountFormDialog } = await import('@/features/accounts/components/AccountFormDialog')
const { TransferDialog } = await import('@/features/accounts/components/TransferDialog')
const { SettleAccountDialog } = await import('@/features/accounts/components/SettleAccountDialog')

type Cuenta = Parameters<typeof AccountFormDialog>[0]['account']

afterEach(cleanup)

describe('cuenta', () => {
  it('al crear: nombre y referencia con su etiqueta', () => {
    render(<AccountFormDialog open onOpenChange={() => {}} />)
    expect(screen.getByRole('textbox', { name: 'Nombre' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Referencia (opcional)' })).toBeInTheDocument()
  })

  it('al editar: el tipo es un campo deshabilitado que la etiqueta nombra', () => {
    render(<AccountFormDialog open onOpenChange={() => {}} account={CUENTAS[1] as Cuenta} />)
    const tipo = screen.getByRole('textbox', { name: 'Tipo' })
    expect(tipo).toBeDisabled()
    expect(tipo).toHaveValue('Banco')
  })
})

describe('traslado', () => {
  it('el monto que excede lo disponible se anuncia con su motivo', () => {
    render(<TransferDialog open onOpenChange={() => {}} defaultFromAccountId={CUENTAS[0].id} />)
    fireEvent.change(screen.getByLabelText('Cuánto'), { target: { value: '200000' } })
    const monto = screen.getByRole('textbox', { name: 'Cuánto', description: 'Es más de lo que hay disponible.' })
    expect(monto.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('textbox', { name: 'Notas (opcional)' })).toBeInTheDocument()
  })
})

describe('liquidación', () => {
  it('las notas tienen su etiqueta', () => {
    const convenio = { ...CUENTAS[1], type: 'settlement', name: 'Sistecrédito', balance: '50000.00' }
    render(<SettleAccountDialog open onOpenChange={() => {}} account={convenio as NonNullable<Cuenta>} />)
    expect(screen.getByRole('textbox', { name: 'Notas (opcional)' })).toBeInTheDocument()
  })
})
