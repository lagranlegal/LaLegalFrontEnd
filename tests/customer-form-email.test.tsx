import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * El formulario del cliente y el correo (NOTIFICACIONES §9.2-f y F21-19):
 *
 * - La casilla de autorización expresa viaja solo marcada y con correo.
 * - En la edición, las casillas viajan solo si CAMBIARON: una casilla que
 *   nadie tocó no es una decisión de nadie.
 * - Un correo guardado antes de la validación no congela la ficha.
 */

// jsdom no trae ResizeObserver y el Select/Checkbox de Radix lo usa al montar.
// Local a este archivo para no tocar `setup.ts` (hay otro agente en el repo).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

const createMutate = vi.fn()
const updateMutate = vi.fn()

vi.mock('@/features/customers/api', () => ({
  useCreateCustomer: () => ({ mutateAsync: createMutate, isPending: false }),
  useUpdateCustomer: () => ({ mutateAsync: updateMutate, isPending: false }),
}))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))

const { CustomerFormDialog } = await import('@/features/customers/components/CustomerFormDialog')

/** Forma de `CustomerOut` tal como la devuelve `GET /customers/{id}` (00059). */
const CLIENTE = {
  id: '00000000-0000-0000-0001-0000000fb4a0',
  full_name: 'Juana Prueba',
  doc_type: 'cc',
  doc_number: 'fb4a0-1',
  doc_issue_place: null,
  address: null,
  phone: '3000000000',
  email: 'juana.perez@example.com',
  doc_photos: [],
  doc_photo_url: null,
  status: 'active',
  alert_reason: null,
  notes: null,
  created_at: '2026-09-25T20:30:00Z',
  email_basis: 'contract' as const,
  email_basis_at: '2026-09-25T20:30:00Z',
  email_consent_at: null,
  email_consent_source: null,
  email_opt_out_at: null,
  email_invalid_at: null,
}

beforeEach(() => {
  createMutate.mockReset().mockResolvedValue({})
  updateMutate.mockReset().mockResolvedValue({})
})
afterEach(cleanup)

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('CustomerFormDialog — correo y autorización', () => {
  it('al crear, la casilla está deshabilitada sin correo y viaja marcada con correo', async () => {
    render(<CustomerFormDialog open onOpenChange={() => {}} />)
    const casilla = screen.getByRole('checkbox', { name: /autoriza expresamente/ })
    expect(casilla).toBeDisabled()

    fill('Nombre completo', 'Juana Prueba')
    fill('Número de documento', '123')
    fill('Teléfono', '300')
    fill('Correo', 'juana@example.com')
    await waitFor(() => expect(casilla).toBeEnabled())
    fireEvent.click(casilla)
    fireEvent.click(screen.getByRole('button', { name: 'Crear cliente' }))

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1))
    expect(createMutate.mock.calls[0][0]).toMatchObject({ email: 'juana@example.com', email_consent: true })
    expect(createMutate.mock.calls[0][0]).not.toHaveProperty('email_opt_out')
  })

  it('sin marcar la casilla, crear no manda autorización', async () => {
    render(<CustomerFormDialog open onOpenChange={() => {}} />)
    fill('Nombre completo', 'Juana Prueba')
    fill('Número de documento', '123')
    fill('Teléfono', '300')
    fill('Correo', 'juana@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Crear cliente' }))

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1))
    expect(createMutate.mock.calls[0][0]).not.toHaveProperty('email_consent')
  })

  it('al editar, solo viaja la casilla que cambió', async () => {
    render(<CustomerFormDialog open onOpenChange={() => {}} customer={CLIENTE} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /Pidió no recibir avisos/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1))
    const body = updateMutate.mock.calls[0][0].body
    expect(body.email_opt_out).toBe(true)
    expect(body).not.toHaveProperty('email_consent')
  })

  it('un correo viejo inválido no impide editar el resto de la ficha', async () => {
    render(<CustomerFormDialog open onOpenChange={() => {}} customer={{ ...CLIENTE, email: 'juana@gmial,com' }} />)
    expect(screen.getByText(/El correo guardado no tiene forma de correo/)).toBeInTheDocument()

    fill('Teléfono', '3007777777')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1))
    expect(updateMutate.mock.calls[0][0].body).toMatchObject({ phone: '3007777777', email: 'juana@gmial,com' })
  })

  it('cambiar ese correo por OTRO inválido sí se rechaza', async () => {
    render(<CustomerFormDialog open onOpenChange={() => {}} customer={{ ...CLIENTE, email: 'juana@gmial,com' }} />)
    fill('Correo', 'juana@gmail,com')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Correo inválido')).toBeInTheDocument()
    expect(updateMutate).not.toHaveBeenCalled()
  })
})
