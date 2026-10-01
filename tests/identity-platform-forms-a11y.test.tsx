import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * Issue #4: invitar usuario, rol, nueva empresa y extender suscripción usan el
 * campo compartido. Cada error queda enlazado a su campo por
 * `aria-describedby`, incluidos los selects de Radix (rol, plan) y los
 * calendarios (`DatePicker invalid`).
 */
const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false })
vi.mock('@/features/identity/api', () => ({
  useRoles: () => ({ data: [] }),
  useInviteUser: mutation,
  useCreateRole: mutation,
  useRenameRole: mutation,
}))
vi.mock('@/features/platform/api', () => ({
  usePlans: () => ({ data: [] }),
  useCreateCompany: mutation,
  useActivateCompany: mutation,
  useSuspendCompany: mutation,
  useExtendSubscription: mutation,
  useSubscriptionEvents: () => ({ data: undefined, isPending: true, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }),
}))

const { InviteUserDialog } = await import('@/features/identity/components/InviteUserDialog')
const { RoleFormDialog } = await import('@/features/identity/components/RoleFormDialog')
const { CompanyFormDialog } = await import('@/features/platform/components/CompanyFormDialog')
const { CompanyDetailDialog } = await import('@/features/platform/components/CompanyDetailDialog')

afterEach(cleanup)

describe('invitar usuario enviado vacío', () => {
  it('nombre, correo y rol se anuncian con su motivo', async () => {
    render(<InviteUserDialog open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Enviar por correo/ }))
    expect(await screen.findByRole('textbox', { name: 'Nombre completo', description: 'El nombre es obligatorio' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Correo', description: 'El correo es obligatorio' })).toBeInTheDocument()
    const rol = screen.getByRole('combobox', { name: 'Rol', description: 'Elige un rol' })
    expect(rol.getAttribute('aria-invalid')).toBe('true')
  })
})

describe('rol enviado vacío', () => {
  it('el nombre se anuncia con su motivo', async () => {
    render(<RoleFormDialog open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }))
    expect(await screen.findByRole('textbox', { name: 'Nombre', description: 'El nombre es obligatorio' })).toBeInTheDocument()
  })
})

describe('nueva empresa enviada vacía', () => {
  it('plan y fecha también quedan enlazados a su error', async () => {
    render(<CompanyFormDialog open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Crear empresa' }))
    expect(await screen.findByRole('combobox', { name: 'Plan', description: 'Elige un plan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Suscripción vence', description: 'Elige una fecha' })).toBeInTheDocument()
  })
})

describe('extender suscripción sin fecha', () => {
  it('el calendario se anuncia con su motivo', async () => {
    const empresa = {
      id: '0c1f5a2e-7b3d-4e9a-8f60-2d4b6c8e1a37',
      name: 'Empresa de prueba',
      status: 'active',
      subscription_expires_at: null,
      plan_name: 'Básico',
      created_at: '2026-09-01T15:00:00Z',
    } as unknown as Parameters<typeof CompanyDetailDialog>[0]['company']
    render(<CompanyDetailDialog open onOpenChange={() => {}} company={empresa} />)
    fireEvent.click(screen.getByRole('button', { name: 'Extender suscripción' }))
    expect(await screen.findByRole('button', { name: 'Nueva fecha de expiración', description: 'Elige una fecha' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Notas (opcional)' }).tagName).toBe('TEXTAREA')
  })
})
