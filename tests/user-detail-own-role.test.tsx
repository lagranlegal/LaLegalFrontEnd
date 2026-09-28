import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { User } from '@/features/identity/api'

/**
 * G-03: la ficha del PROPIO usuario ofrecía el selector de rol, y el backend
 * lo rechaza siempre desde la auditoría 27/09/2026 (403
 * `CANNOT_CHANGE_OWN_ROLE`: «No puedes cambiar tu propio rol. Pídeselo a otra
 * persona que gestione usuarios.»). Ofrecer una acción que siempre falla
 * enseña que los errores son normales — mismo criterio que ya se aplicó a
 * «desactivarse a sí mismo».
 */
const mutacion = () => ({ mutateAsync: vi.fn(), isPending: false })
vi.mock('@/features/identity/api', () => ({
  useRoles: () => ({ data: [{ id: 'r-admin', name: 'Administrador' }, { id: 'r-caja', name: 'Cajero' }] }),
  useUpdateUserRole: mutacion,
  useDeactivateUser: mutacion,
  useReactivateUser: mutacion,
  useRecoveryLink: mutacion,
}))

const { UserDetailDialog } = await import('@/features/identity/components/UserDetailDialog')

const YO = {
  id: 'u1',
  full_name: 'Mateo',
  email: 'mateo@example.com',
  role_id: 'r-admin',
  status: 'active',
  created_at: '2026-09-01T12:00:00Z',
} as unknown as User

afterEach(cleanup)

describe('UserDetailDialog — el rol propio', () => {
  it('en la ficha propia no hay selector de rol, y se explica por qué', () => {
    render(<UserDetailDialog open onOpenChange={() => {}} user={YO} isSelf />)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByText('Administrador')).toBeInTheDocument()
    expect(screen.getByText(/No puedes cambiar tu propio rol/i)).toBeInTheDocument()
  })

  it('en la ficha de otra persona el selector sigue', () => {
    render(<UserDetailDialog open onOpenChange={() => {}} user={YO} isSelf={false} />)
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
