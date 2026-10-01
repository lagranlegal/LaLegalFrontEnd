import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'

/**
 * Issue #4: el motivo de la confirmación y los campos de la devolución usan el
 * campo compartido, y cada control tiene su etiqueta asociada por `id` (en la
 * devolución, motivo, liquidación y notas no la tenían).
 */
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/CustomerPicker', () => ({
  CustomerPicker: ({ id }: { id?: string }) => <input id={id} />,
}))
vi.mock('@/lib/inventory/items', () => ({ useItemsByIds: () => ({ data: new Map() }) }))
vi.mock('@/lib/sales/returns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/sales/returns')>()
  return { ...actual, useSaleReturns: () => ({ data: [] }), useCreateReturn: () => ({ mutateAsync: vi.fn(), isPending: false }) }
})

const { ConfirmDialogHost } = await import('@/components/shared/ConfirmDialog')
const { confirm } = await import('@/components/shared/confirmStore')
const { ReturnFormDialog } = await import('@/components/shared/ReturnFormDialog')

afterEach(cleanup)

describe('confirmación con motivo', () => {
  it('el motivo es un campo con su etiqueta', () => {
    render(<ConfirmDialogHost />)
    act(() => {
      void confirm({ title: 'Anular venta', requireReason: true, reasonLabel: 'Motivo de la anulación' })
    })
    expect(screen.getByRole('textbox', { name: 'Motivo de la anulación' }).tagName).toBe('TEXTAREA')
  })
})

describe('devolución de cliente', () => {
  const venta = {
    id: 'b84f404e-5862-4cf3-a9a1-121843d0d01c',
    number: 7,
    customer_id: null,
    credit_note_redeemed_amount: null,
    lines: [],
  } as unknown as Parameters<typeof ReturnFormDialog>[0]['sale']

  it('motivo, liquidación y notas tienen su etiqueta asociada', () => {
    render(<ReturnFormDialog open onOpenChange={() => {}} sale={venta} />)
    expect(screen.getByRole('combobox', { name: 'Motivo' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Forma de liquidación' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notas (opcional)' }).tagName).toBe('TEXTAREA')
  })
})
