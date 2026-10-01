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
const { ErrorPage } = await import('@/app/pages/ErrorPage')

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

  it('las tres páginas llevan la marca, el titular en Archivo y una acción primaria (rediseño P3)', () => {
    const reset = vi.fn()
    const pages = [<NotFoundPage key="404" />, <SubscriptionBlockedPage key="bloqueo" />, <ErrorPage key="error" error={new Error('Failed to fetch')} reset={reset} info={undefined as never} />]
    for (const page of pages) {
      const { unmount, container } = render(page)
      expect(screen.getByText('Prendo')).toHaveClass('font-display')
      expect(screen.getByRole('heading', { level: 1 })).toHaveClass('font-display')
      // Un solo primario: el de bloque; lo demás, terciario.
      expect(container.querySelectorAll('.h-13')).toHaveLength(1)
      unmount()
    }
  })

  it('el error general dice qué hacer y deja el mensaje técnico chico, para soporte', () => {
    const reset = vi.fn()
    render(<ErrorPage error={new Error('Failed to fetch')} reset={reset} info={undefined as never} />)
    expect(screen.getByRole('heading', { name: 'No se pudo cargar Prendo' })).toBeInTheDocument()
    expect(screen.getByText('Detalle: Failed to fetch')).toHaveClass('text-xs')
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(reset).toHaveBeenCalled()
  })
})
