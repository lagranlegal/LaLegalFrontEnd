import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * El precio de venta OPCIONAL del ingreso y de la transformación usaba
 * `MoneyInput` sin `optional` y con `value || '0.00'`: tocarlo y borrarlo lo
 * dejaba en "0.00" y el campo mostraba un 0 que nadie escribió — el mismo
 * caso que 2d405cd arregló en el avalúo y en el conteo de caja. Vacío
 * significa "todavía no sé en cuánto se vende" (queda en borrador).
 */
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: 'idle' }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [], isPending: false }) }))
vi.mock('@/lib/catalogs/suppliers', () => ({ useSuppliers: () => ({ data: [], isPending: false }) }))
vi.mock('@/lib/inventory/productSearch', () => ({ useProductSearch: () => ({ data: [], isFetching: false }) }))
vi.mock('@/features/inventory/api', () => ({
  useCreateTransformation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateEntry: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))
vi.mock('@/components/shared/ItemPicker', () => ({ ItemPicker: () => null }))

const { TransformationFormPage } = await import('@/features/inventory/pages/TransformationFormPage')
const { EntryFormPage } = await import('@/features/inventory/pages/EntryFormPage')

afterEach(cleanup)

function tocarYBorrar(campo: HTMLInputElement) {
  fireEvent.change(campo, { target: { value: '250.000' } })
  expect(campo.value).toBe('250.000')
  fireEvent.change(campo, { target: { value: '' } })
}

describe('precio de venta opcional', () => {
  it('transformación: vacío arranca vacío y borrado queda vacío', () => {
    render(<TransformationFormPage />)
    const campo = screen.getAllByLabelText(/Precio de venta/i)[0] as HTMLInputElement
    expect(campo.value).toBe('')
    tocarYBorrar(campo)
    expect(campo.value).toBe('')
  })

  it('ingreso: vacío arranca vacío y borrado queda vacío', () => {
    render(<EntryFormPage />)
    const campo = screen.getAllByLabelText(/Precio de venta/i)[0] as HTMLInputElement
    expect(campo.value).toBe('')
    tocarYBorrar(campo)
    expect(campo.value).toBe('')
  })
})
