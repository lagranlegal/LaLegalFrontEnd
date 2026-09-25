import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * Los caminos por los que se llega a `/auth/callback`.
 *
 * El que motivó esto: el `action_link` de GoTrue es un GET de un solo uso, y
 * los generadores de vista previa de WhatsApp/Telegram/Gmail lo queman con
 * solo pedir la URL. La persona llegaba sin sesión, veía el formulario igual,
 * y al guardar recibía "no se pudo guardar la contraseña, intenta de nuevo" —
 * un consejo imposible de seguir. Ver `RUNBOOK_USUARIOS.md` §1.
 *
 * Y el que motivó la segunda vuelta (24/09/2026): la invitación pasa a salir
 * por correo con un enlace `?token_hash=…&type=invite` a esta página. Un GET
 * ya no la quema, pero los escáneres de correo que EJECUTAN la página (Safe
 * Links de Microsoft) sí lo harían si el canje corriera solo al cargar. Por
 * eso el canje espera a que la persona toque «Continuar».
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
vi.mock('@/features/auth/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/auth/api')>()
  return {
    ...original,
    useSetPassword: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
    setPasswordErrorMessage: () => '',
  }
})

const { AuthCallbackPage } = await import('@/features/auth/pages/AuthCallbackPage')

/** Forma real de los errores de `@supabase/auth-js` (`lib/fetch.ts::handleError`). */
const TOKEN_VENCIDO = { name: 'AuthApiError', status: 403, code: 'otp_expired', message: 'Email link is invalid or has expired' }
const SIN_RED = { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }

beforeEach(() => {
  verifyOtp.mockReset()
  getSession.mockReset()
  window.history.replaceState(null, '', '/auth/callback?token_hash=abc123&type=invite')
})

// Sin `globals: true` Testing Library no desmonta solo entre tests.
afterEach(cleanup)

describe('AuthCallbackPage', () => {
  it('NO canjea el token al cargar: un escáner que ejecute la página no lo quema', async () => {
    urlInicial = 'https://app.test/auth/callback?token_hash=abc123&type=invite'

    render(<AuthCallbackPage />)

    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    expect(screen.getByText('Activa tu cuenta')).toBeInTheDocument()
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(getSession).not.toHaveBeenCalled()
  })

  it('una invitación se canjea por POST al tocar «Continuar» y pide la contraseña', async () => {
    urlInicial = 'https://app.test/auth/callback?token_hash=abc123&type=invite'
    verifyOtp.mockResolvedValue({ error: null })

    render(<AuthCallbackPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Crea tu contraseña')).toBeInTheDocument()
    expect(verifyOtp).toHaveBeenCalledTimes(1)
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc123', type: 'invite' })
    // El token es una credencial: no puede quedar en el historial ni en una
    // captura de pantalla que la persona mande pidiendo ayuda.
    expect(window.location.search).toBe('')
  })

  it('un enlace de recuperación usa el mismo camino con su propio tipo', async () => {
    urlInicial = 'https://app.test/auth/callback?token_hash=rec456&type=recovery'
    verifyOtp.mockResolvedValue({ error: null })

    render(<AuthCallbackPage />)
    expect(screen.queryByText('Activa tu cuenta')).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Crea tu contraseña')).toBeInTheDocument()
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'rec456', type: 'recovery' })
  })

  it('un token vencido o ya usado manda a pedir uno nuevo al administrador, sin ofrecer reintentar', async () => {
    urlInicial = 'https://app.test/auth/callback?token_hash=abc123&type=invite'
    verifyOtp.mockResolvedValue({ error: TOKEN_VENCIDO })

    render(<AuthCallbackPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('Este enlace ya se usó o venció')).toBeInTheDocument()
    expect(screen.getByText(/administrador/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Intentar de nuevo' })).not.toBeInTheDocument()
    expect(window.location.search).toBe('')
  })

  it('una falla de red NO se presenta como enlace quemado: el token no se gastó y se puede reintentar', async () => {
    urlInicial = 'https://app.test/auth/callback?token_hash=abc123&type=invite'
    verifyOtp.mockResolvedValueOnce({ error: SIN_RED }).mockResolvedValueOnce({ error: null })

    render(<AuthCallbackPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))

    expect(await screen.findByRole('button', { name: 'Intentar de nuevo' })).toBeInTheDocument()
    expect(screen.queryByText(/ya se usó/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))

    expect(await screen.findByText('Crea tu contraseña')).toBeInTheDocument()
    expect(verifyOtp).toHaveBeenCalledTimes(2)
  })

  it('un enlace que llegó con el error en el fragmento dice lo mismo, sin intentar canjear', async () => {
    urlInicial = 'https://app.test/auth/callback#error=access_denied&error_code=otp_expired'

    render(<AuthCallbackPage />)

    expect(await screen.findByText('Este enlace ya se usó o venció')).toBeInTheDocument()
    expect(screen.getByText(/genere uno nuevo/)).toBeInTheDocument()
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
