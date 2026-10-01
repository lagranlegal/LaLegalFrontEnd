import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * Issue #4: «Registrar contrato existente» y «Editar contrato» usan el campo
 * compartido. En la importación, los errores de código, monto, saldo, tasa y
 * fecha de inicio se pintaban debajo sin enlazarse al campo; ahora el lector
 * de pantalla dice «inválido» y por qué (la fecha, vía `DatePicker invalid`).
 */
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: 'idle' }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/lib/customers/search', () => ({ useCustomerSearch: () => ({ data: [], isFetching: false }) }))
vi.mock('@/features/contracts/api', () => ({
  useImportContract: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateContract: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))

const { ContractImportPage } = await import('@/features/contracts/pages/ContractImportPage')
const { ContractEditDialog } = await import('@/features/contracts/components/ContractEditDialog')

afterEach(cleanup)
// jsdom no implementa scrollIntoView, y `revealFirstError` lo usa al enviar con errores.
Element.prototype.scrollIntoView = () => {}

describe('contrato existente enviado vacío', () => {
  it('cada error queda enlazado a su campo', async () => {
    render(<ContractImportPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar contrato' }))

    const codigo = await screen.findByRole('textbox', {
      name: 'Código en el sistema anterior',
      description: 'El código del contrato anterior es obligatorio',
    })
    expect(codigo.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('textbox', { name: /Tasa de interés/, description: 'La tasa de interés debe ser mayor a cero' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Monto que se prestó originalmente', description: 'El monto prestado debe ser mayor a cero' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fecha real de inicio del préstamo', description: 'Selecciona la fecha de inicio' })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Meses de interés ya cubiertos' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notas (opcional)' }).tagName).toBe('TEXTAREA')
  })
})

describe('editar contrato', () => {
  it('las notas tienen su etiqueta', () => {
    const contrato = { id: '9d7f3a10-2b4c-4e8a-9f61-0c5d2e7b8a33', appraisal_value: null, notes: null, signed_photo_url: null } as unknown as Parameters<
      typeof ContractEditDialog
    >[0]['contract']
    render(<ContractEditDialog open onOpenChange={() => {}} contract={contrato} />)
    expect(screen.getByRole('textbox', { name: 'Notas' }).tagName).toBe('TEXTAREA')
  })
})
