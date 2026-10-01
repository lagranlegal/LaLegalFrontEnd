import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Issue #4: egreso y transformación usan el campo compartido, y cada control
 * tiene su etiqueta por `id`. En la transformación casi ninguna etiqueta
 * nombraba su campo (nombre, categorías, cantidad, costo del proceso…): un
 * lector de pantalla leía «campo de edición» sin decir cuál.
 */
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: 'idle' }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [], isPending: false }) }))
vi.mock('@/features/inventory/api', () => ({
  useCreateTransformation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateExit: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
// El buscador real pide datos; acá basta con que reciba el `id` de la etiqueta.
vi.mock('@/components/shared/ItemPicker', () => ({ ItemPicker: ({ id }: { id?: string }) => <input id={id} /> }))

const { ExitFormDialog } = await import('@/features/inventory/components/ExitFormDialog')
const { TransformationFormPage } = await import('@/features/inventory/pages/TransformationFormPage')

afterEach(cleanup)

describe('egreso', () => {
  it('tipo, motivo y artículos tienen su etiqueta', () => {
    render(<ExitFormDialog open onOpenChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Tipo de egreso' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Motivo' }).tagName).toBe('TEXTAREA')
    expect(screen.getByRole('textbox', { name: 'Artículos' })).toBeInTheDocument()
  })
})

describe('transformación', () => {
  it('cada campo de la salida y del proceso tiene su etiqueta', () => {
    render(<TransformationFormPage />)
    for (const nombre of ['Cuánto', 'Nombre', 'Cantidad', 'Precio de venta (opcional)', 'Motivo']) {
      expect(screen.getByRole('textbox', { name: nombre })).toBeInTheDocument()
    }
    for (const nombre of ['Categoría', 'Subcategoría', 'Categoría final', 'Unidad']) {
      expect(screen.getByRole('combobox', { name: nombre })).toBeInTheDocument()
    }
  })
})
