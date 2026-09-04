import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Los tres caminos por los que se llega a `/auth/callback`.
 *
 * El que motivó esto: el `action_link` de GoTrue es un GET de un solo uso, y
 * los generadores de vista previa de WhatsApp/Telegram/Gmail lo queman con
 * solo pedir la URL. La persona llegaba sin sesión, veía el formulario igual,
 * y al guardar recibía "no se pudo guardar la contraseña, intenta de nuevo" —
 * un consejo imposible de seguir. Ver `RUNBOOK_USUARIOS.md` §1.
 */

const verifyOtp = vi.fn()
const getSession = vi.fn()
let urlInicial = ''

vi.mock('@/lib/auth/supabase', () => ({
  get initialUrl() {
    return urlInicial
  },
  supabase: { auth: { verifyOtp: (...args: unknown[]) => verifyOtp(...args), getSession: () => getSession() } },
}))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@/features/auth/api', () => ({
  useSetPassword: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  setPasswordErrorMessage: () => '',
}))

const { AuthCallbackPage } = await import('@/features/auth/pages/AuthCallbackPage')

beforeEach(() => {
  verifyOtp.mockReset()
  getSession.mockReset()
  window.history.replaceState(null, '', '/auth/callback')
})

describe('AuthCallbackPage', () => {
  it('canjea el token_hash por POST (no por el GET que queman los crawlers)', async () => {
    urlInicial = 'https://app.test/auth/callback?token_hash=abc123&type=invite'
    verifyOtp.mockResolvedValue({ error: null })

    render(<AuthCallbackPage />)

    expect(await screen.findByText('Crea tu contraseña')).toBeInTheDocument()
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'invite' })
    // El token es una credencial: no puede quedar en el historial ni en una
    // captura de pantalla que la persona mande pidiendo ayuda.
    expect(window.location.search).toBe('')
  })

  it('un enlace ya quemado NO manda a reintentar: manda a pedir uno nuevo', async () => {
    urlInicial = 'https://app.test/auth/callback#error=access_denied&error_code=otp_expired'

    render(<AuthCallbackPage />)

    expect(await screen.findByText('Este enlace ya se usó')).toBeInTheDocument()
    expect(screen.getByText(/genere uno nuevo/)).toBeInTheDocument()
    // Ni siquiera se intenta canjear nada: el error ya venía en la URL.
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('sigue funcionando con los enlaces viejos, que traen la sesión en el fragmento', async () => {
    urlInicial = 'https://app.test/auth/callback'
    getSession.mockResolvedValue({ data: { session: { access_token: 'x' } } })

    render(<AuthCallbackPage />)

    expect(await screen.findByText('Crea tu contraseña')).toBeInTheDocument()
  })

  it('sin token y sin sesión, lo dice en vez de pedir una contraseña que no puede guardar', async () => {
    urlInicial = 'https://app.test/auth/callback'
    getSession.mockResolvedValue({ data: { session: null } })

    render(<AuthCallbackPage />)

    expect(await screen.findByText('Link inválido o expirado')).toBeInTheDocument()
  })
})
