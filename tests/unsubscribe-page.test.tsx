import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * `/baja/$token` — el enlace «Darse de baja» de los correos al cliente
 * (`../backend-starter/docs/NOTIFICACIONES.md` §17).
 *
 * La regla que esta página existe para cumplir: **abrirla no da de baja.**
 * Los escáneres de correo y las vistas previas abren cada enlace solos, y
 * algunos ejecutan el JavaScript (el caso de `/auth/callback`, 24/09/2026).
 * Por eso el primer test cuenta los POST al montar: cero.
 *
 * LOS SOBRES SON REALES: copiados de las respuestas del backend local
 * (`uvicorn` contra la base local, 25/09/2026) para
 * `GET`/`POST /api/v1/public/unsubscribe/{token}`, no escritos de memoria.
 */

const SUSCRITO = { company_name: 'ZZ Baja local', email_hint: 'j•••@example.com', unsubscribed_at: null }
const DADO_DE_BAJA = {
  company_name: 'ZZ Baja local',
  email_hint: 'j•••@example.com',
  unsubscribed_at: '2026-09-25T07:23:26.084057Z',
}
const ENLACE_INVALIDO = {
  code: 'UNSUBSCRIBE_LINK_INVALID',
  message: 'Este enlace de baja no es válido. Si quiere dejar de recibir avisos, comuníquese con la compraventa.',
  details: {},
}

const TOKEN = 'AQAAAAAAAAAAAAAAAAAPtKAAAAAAAAAAAAABAAAAD7Sg.t0pjygMdXQkB6WztWyXBjQ'

type Raw = { data?: unknown; error?: unknown; response: Response }
const GET = vi.fn<(path: string, init: unknown) => Promise<Raw>>()
const POST = vi.fn<(path: string, init: unknown) => Promise<Raw>>()

vi.mock('@/lib/auth/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }))
vi.mock('@tanstack/react-router', () => ({ useParams: () => ({ token: TOKEN }) }))
vi.mock('@/lib/api/client', async () => {
  const errors = await import('@/lib/api/errors')
  return {
    api: { GET: (p: string, i: unknown) => GET(p, i), POST: (p: string, i: unknown) => POST(p, i) },
    // El `unwrap` de verdad, sin la red: mismo parseo del sobre de error.
    unwrap: async (promise: Promise<Raw>) => {
      const result = await promise
      if (result.error !== undefined) throw errors.parseApiError(result.response.status, result.error)
      return result.data
    },
    ApiError: errors.ApiError,
    NetworkError: errors.NetworkError,
  }
})

const { UnsubscribePage } = await import('@/features/unsubscribe/pages/UnsubscribePage')

const ok = (data: unknown): Raw => ({ data, response: new Response(null, { status: 200 }) })
const fail = (status: number, error: unknown): Raw => ({ error, response: new Response(null, { status }) })

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  GET.mockReset()
  POST.mockReset()
})
afterEach(cleanup)

describe('UnsubscribePage', () => {
  it('abrir el enlace NO da de baja: solo lee y espera un clic', async () => {
    GET.mockResolvedValue(ok(SUSCRITO))

    render(<UnsubscribePage />, { wrapper })

    expect(await screen.findByRole('button', { name: 'Dejar de recibir avisos' })).toBeInTheDocument()
    expect(screen.getByText('ZZ Baja local')).toBeInTheDocument()
    expect(screen.getByText('j•••@example.com')).toBeInTheDocument()
    expect(GET).toHaveBeenCalledWith('/api/v1/public/unsubscribe/{token}', { params: { path: { token: TOKEN } } })
    expect(POST).not.toHaveBeenCalled()
  })

  it('la baja es el POST del botón, y la página confirma con la fecha', async () => {
    GET.mockResolvedValue(ok(SUSCRITO))
    POST.mockResolvedValue(ok(DADO_DE_BAJA))

    render(<UnsubscribePage />, { wrapper })
    fireEvent.click(await screen.findByRole('button', { name: 'Dejar de recibir avisos' }))

    expect(await screen.findByText('Ya no recibirá avisos por correo')).toBeInTheDocument()
    expect(POST).toHaveBeenCalledTimes(1)
    expect(POST).toHaveBeenCalledWith('/api/v1/public/unsubscribe/{token}', { params: { path: { token: TOKEN } } })
    // Fecha en la zona de la empresa (default Bogotá: 07:23 UTC = 2:23 AM).
    expect(screen.getByText(/25\/09\/2026 2:23 AM/)).toBeInTheDocument()
  })

  it('si ya se había dado de baja, lo dice sin ofrecer el botón otra vez', async () => {
    GET.mockResolvedValue(ok(DADO_DE_BAJA))

    render(<UnsubscribePage />, { wrapper })

    expect(await screen.findByText('Ya no recibirá avisos por correo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dejar de recibir avisos' })).not.toBeInTheDocument()
  })

  it('un enlace inválido muestra el mensaje del backend y no ofrece reintentar', async () => {
    GET.mockResolvedValue(fail(404, ENLACE_INVALIDO))

    render(<UnsubscribePage />, { wrapper })

    expect(await screen.findByText('Enlace no válido')).toBeInTheDocument()
    expect(screen.getByText(ENLACE_INVALIDO.message)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(POST).not.toHaveBeenCalled()
  })

  it('sin conexión ofrece reintentar', async () => {
    GET.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    GET.mockResolvedValueOnce(ok(SUSCRITO))

    render(<UnsubscribePage />, { wrapper })
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('button', { name: 'Dejar de recibir avisos' })).toBeInTheDocument()
  })
})
