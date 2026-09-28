import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * G-01: el formulario de categoría decía que el LTV «solo advierte al crear el
 * contrato — nunca lo impide». Es falso desde 00051 (pasarse del cupo bloquea
 * a quien no tenga `contracts.override_ltv`) y más desde F4-05 del backend
 * (27/09/2026): con LTV el avalúo pasa a ser obligatorio. Quien configura la
 * categoría tiene que saber que está poniendo un tope, no un aviso.
 */
vi.mock('@/features/catalogs/api', () => ({
  useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [] }) }))

const { CategoryFormDialog } = await import('@/features/catalogs/components/CategoryFormDialog')

afterEach(cleanup)

describe('CategoryFormDialog — lo que hace el LTV', () => {
  it('no promete que el LTV «nunca impide» el contrato', () => {
    render(<CategoryFormDialog open onOpenChange={() => {}} />)
    expect(screen.queryByText(/nunca lo impide/i)).toBeNull()
    expect(screen.getByText(/bloquea/i)).toBeInTheDocument()
    expect(screen.getByText(/avalúo es obligatorio/i)).toBeInTheDocument()
  })

  it('un LTV de 1000 se señala junto al campo antes de enviar', async () => {
    render(<CategoryFormDialog open onOpenChange={() => {}} />)
    fireEvent.change(screen.getByLabelText(/LTV máximo/i), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: /Crear|Guardar/i }))
    await waitFor(() => expect(screen.getByText(/mayor que 0 y hasta 100/i)).toBeInTheDocument())
  })
})
