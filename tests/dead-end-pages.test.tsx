import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

/** F9-61: 404 y suscripción vencida tienen salida. */
const navigate = vi.hoisted(() => vi.fn())
const logout = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))
vi.mock('@/features/auth/api', () => ({ useLogout: () => ({ mutateAsync: logout, isPending: false }) }))

const { NotFoundPage } = await import('@/app/pages/NotFoundPage')
const { SubscriptionBlockedPage } = await import('@/app/pages/SubscriptionBlockedPage')

afterEach(cleanup)

describe('páginas sin salida', () => {
  it('404 lleva al inicio', () => {
    render(<NotFoundPage />)
    expect(screen.getByRole('link', { name: 'Ir al inicio' }).getAttribute('href')).toBe('/inicio')
  })

  it('suscripción vencida: cerrar sesión y volver a intentar', async () => {
    render(<SubscriptionBlockedPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/auth/login' }))
    expect(logout).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /volver a intentar/ }))
    expect(navigate).toHaveBeenCalledWith({ to: '/inicio' })
  })
})
