import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Issue #5 (F9-25): al enviar con errores, el foco tiene que ir al PRIMER
 * error del formulario, sea input, select o buscador. En «Nuevo contrato»
 * vacío saltaba a «Tasa» (el tercero) y no a «Cliente»; en «Nuevo ingreso», a
 * «Nombre» y no a «Proveedor». La causa: React Hook Form enfoca su propio
 * primer error DESPUÉS de `onInvalid`, y pisaba lo que `revealFirstError`
 * había elegido por posición.
 */
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: 'idle' }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { user: { id: 'u1' }, company: { id: 'c1' }, permissions: [] } }) }))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/lib/catalogs/suppliers', () => ({ useSuppliers: () => ({ data: [] }) }))
vi.mock('@/lib/customers/search', () => ({ useCustomerSearch: () => ({ data: [], isFetching: false }) }))
vi.mock('@/lib/inventory/productSearch', () => ({ useProductSearch: () => ({ data: [], isFetching: false }) }))
vi.mock('@/features/contracts/api', () => ({ useCreateContract: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/features/inventory/api', () => ({ useCreateEntry: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))

const { revealFirstError } = await import('@/lib/forms/revealFirstError')
const { ContractFormPage } = await import('@/features/contracts/pages/ContractFormPage')
const { EntryFormPage } = await import('@/features/inventory/pages/EntryFormPage')

beforeEach(() => {
  // jsdom no implementa scrollIntoView ni calcula posiciones: el orden del
  // documento hace de posición vertical, que es lo que mide `revealFirstError`.
  Element.prototype.scrollIntoView = () => {}
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const todos = Array.from(document.querySelectorAll('*'))
    return { top: todos.indexOf(this) } as DOMRect
  }
})
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('revealFirstError', () => {
  it('encuentra un select de Radix por el campo que controla (data-field)', () => {
    document.body.innerHTML = '<button type="button" data-field="items.0.category_id">Selecciona…</button>'
    expect(revealFirstError(['items.0.category_id'])).toBe(true)
    expect(document.activeElement?.getAttribute('data-field')).toBe('items.0.category_id')
  })
})

describe('foco al primer error', () => {
  it('Nuevo contrato vacío: el buscador de cliente, no la tasa', async () => {
    render(<ContractFormPage />)
    fireEvent.click(screen.getByRole('button', { name: /Crear contrato/ }))
    await screen.findByText('Selecciona un cliente')
    await waitFor(() => expect(document.activeElement?.id).toBe('customer-picker'))
  })

  it('Nuevo contrato: la categoría de la prenda (un select) se puede señalar como error', async () => {
    render(<ContractFormPage />)
    const trigger = document.querySelector<HTMLElement>('[data-field="items.0.category_id"]')
    expect(trigger).not.toBeNull()
    // Está más arriba que la descripción de la misma prenda: gana ella.
    expect(revealFirstError(['items.0.description', 'items.0.category_id'])).toBe(true)
    expect(document.activeElement).toBe(trigger)
  })

  it('Nuevo ingreso de compra vacío: el proveedor (un select), no el nombre del artículo', async () => {
    render(<EntryFormPage />)
    fireEvent.click(screen.getByRole('button', { name: /Registrar ingreso|Registrar/ }))
    await screen.findAllByText(/proveedor/i)
    await waitFor(() => expect(document.activeElement?.id).toBe('supplier_id'))
  })
})
