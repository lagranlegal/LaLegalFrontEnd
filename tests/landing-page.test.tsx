import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'

/**
 * `/` — la landing pública. Lo que cuida este test:
 *
 * - Hay UN solo `<h1>` y las secciones son landmarks con nombre.
 * - Sin sesión, el acceso dice «Iniciar sesión» y va a `/auth/login`; con
 *   sesión, «Ir a mi panel» y va a `/inicio` (la raíz ya no es la app).
 * - Mientras no haya canal de contacto (`DEMO_CONTACT = null`), «Solicitar
 *   demostración» baja a `#demo` y no se inventa ningún correo ni teléfono.
 * - En jsdom no existe IntersectionObserver: nada puede quedar invisible
 *   esperando que la sección «entre en pantalla».
 */

const getSession = vi.fn()

vi.mock('@/lib/auth/supabase', () => ({ supabase: { auth: { getSession: () => getSession() } } }))

// El `<Link>` de verdad necesita un router montado; acá basta con saber a
// dónde apunta.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, className, children }: { to: string; className?: string; children: ReactNode }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))

const { LandingPage } = await import('@/features/landing/pages/LandingPage')

const conSesion = { data: { session: { access_token: 'x' } } }
const sinSesion = { data: { session: null } }

beforeEach(() => {
  getSession.mockReset()
})
afterEach(cleanup)

describe('LandingPage', () => {
  it('tiene un solo h1 y las secciones con nombre', () => {
    getSession.mockResolvedValue(sinSesion)
    render(<LandingPage />)

    const h1s = screen.getAllByRole('heading', { level: 1 })
    expect(h1s).toHaveLength(1)
    expect(h1s[0]).toHaveTextContent('Tu compraventa entera, en orden.')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    for (const name of ['Cómo funciona', 'Para quién', 'Confianza']) {
      expect(screen.getAllByRole('region').some((r) => r.textContent?.includes(name)), name).toBe(true)
    }
    expect(screen.getByRole('region', { name: /Pon tu compraventa en orden/ })).toHaveAttribute('id', 'demo')
    expect(document.title).toBe('Prendo — La plataforma para compraventas')
  })

  it('sin sesión, los accesos llevan al login', async () => {
    getSession.mockResolvedValue(sinSesion)
    render(<LandingPage />)

    await waitFor(() => expect(getSession).toHaveBeenCalled())
    const nav = within(screen.getByRole('banner'))
    expect(nav.getByRole('link', { name: /Iniciar sesión/ })).toHaveAttribute('href', '/auth/login')
    expect(screen.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute('href', '/auth/login')
    expect(screen.queryByRole('link', { name: /Ir a mi panel/ })).not.toBeInTheDocument()
    for (const link of screen.queryAllByRole('link')) {
      expect(link.getAttribute('href')).not.toBe('/inicio')
    }
  })

  it('con sesión, los accesos llevan al panel', async () => {
    getSession.mockResolvedValue(conSesion)
    render(<LandingPage />)

    const cta = await screen.findAllByRole('link', { name: /Ir a mi panel/ })
    expect(cta.length).toBeGreaterThan(0)
    for (const link of cta) expect(link).toHaveAttribute('href', '/inicio')
    expect(screen.queryByRole('link', { name: 'Ya tengo cuenta' })).not.toBeInTheDocument()
    for (const link of screen.queryAllByRole('link')) {
      expect(link.getAttribute('href')).not.toBe('/auth/login')
    }
  })

  it('sin canal de contacto, «Solicitar demostración» baja a #demo', () => {
    getSession.mockResolvedValue(sinSesion)
    render(<LandingPage />)

    const demos = screen.getAllByRole('link', { name: /Solicitar demostración/ })
    expect(demos.length).toBeGreaterThanOrEqual(2)
    for (const link of demos) expect(link).toHaveAttribute('href', '#demo')
    expect(document.body.innerHTML).not.toMatch(/mailto:|wa\.me|tel:/)
    expect(screen.queryByText(/escríbenos directamente/i)).not.toBeInTheDocument()
  })

  it('el menú de celular abre y cierra con aria-expanded', () => {
    getSession.mockResolvedValue(sinSesion)
    render(<LandingPage />)

    const toggle = screen.getByRole('button', { name: 'Abrir menú' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('landing-menu')).not.toBeVisible()
    toggle.click()
    return waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute('aria-expanded', 'true')
      expect(document.getElementById('landing-menu')).toBeVisible()
    })
  })

  it('sin IntersectionObserver, ninguna sección queda escondida', () => {
    getSession.mockResolvedValue(sinSesion)
    const { container } = render(<LandingPage />)

    expect(container.querySelectorAll('[data-in="false"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-in="true"]').length).toBeGreaterThan(0)
  })
})
