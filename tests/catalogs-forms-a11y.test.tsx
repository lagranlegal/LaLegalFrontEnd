import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * Issue #4: categoría y proveedor usan el campo compartido. El error de cada
 * campo se pintaba debajo, pero el lector de pantalla no lo asociaba al campo;
 * ahora queda en `aria-describedby`.
 */
vi.mock('@/features/catalogs/api', () => ({
  useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateSupplier: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSupplier: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [] }) }))

const { CategoryFormDialog } = await import('@/features/catalogs/components/CategoryFormDialog')
const { SupplierFormDialog } = await import('@/features/catalogs/components/SupplierFormDialog')

afterEach(cleanup)

describe('categoría enviada vacía', () => {
  it('el nombre se anuncia con su motivo', async () => {
    render(<CategoryFormDialog open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Crear|Guardar/i }))
    const nombre = await screen.findByRole('textbox', { name: 'Nombre', description: 'El nombre es obligatorio' })
    expect(nombre.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('textbox', { name: 'Letra de código' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Plazo (meses)' })).toBeInTheDocument()
  })
})

describe('proveedor enviado vacío', () => {
  it('el nombre se anuncia con su motivo y los demás campos tienen su etiqueta', async () => {
    render(<SupplierFormDialog open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Crear proveedor' }))
    const nombre = await screen.findByRole('textbox', { name: 'Nombre', description: 'El nombre es obligatorio' })
    expect(nombre.getAttribute('aria-invalid')).toBe('true')
    for (const etiqueta of ['Número de documento', 'Teléfono', 'Correo', 'Dirección']) {
      expect(screen.getByRole('textbox', { name: etiqueta })).toBeInTheDocument()
    }
  })
})
