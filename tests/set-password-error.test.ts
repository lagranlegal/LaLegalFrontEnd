import { describe, expect, it } from 'vitest'
import { setPasswordErrorMessage } from '@/features/auth/api'

describe('setPasswordErrorMessage', () => {
  it('un enlace muerto NO dice "intenta de nuevo": dice que pida uno nuevo', () => {
    // Es el caso que motivó esto: reintentar con la sesión del enlace ya
    // caída falla siempre, así que el mensaje viejo mandaba a la persona a
    // repetir una acción que no podía funcionar.
    const msg = setPasswordErrorMessage({ code: 'session_not_found', message: 'Session from session_id claim in JWT does not exist' })
    expect(msg).toContain('genere uno nuevo')
    expect(msg).not.toContain('Intenta de nuevo')
  })

  it('trata bad_jwt, 401 y 403 como el mismo problema de enlace', () => {
    for (const error of [{ code: 'bad_jwt' }, { status: 401 }, { status: 403 }]) {
      expect(setPasswordErrorMessage(error)).toContain('enlace ya no es válido')
    }
  })

  it('distingue contraseña repetida, débil y exceso de intentos', () => {
    expect(setPasswordErrorMessage({ code: 'same_password' })).toContain('distinta')
    expect(setPasswordErrorMessage({ code: 'weak_password' })).toContain('débil')
    expect(setPasswordErrorMessage({ status: 429 })).toContain('Espera unos minutos')
  })

  it('sin conexión lo dice, en vez de culpar a la contraseña', () => {
    expect(setPasswordErrorMessage(new TypeError('Failed to fetch'))).toContain('conexión')
  })

  it('un error desconocido MUESTRA el detalle en vez de esconderlo', () => {
    // Esconder el mensaje real fue lo que dejó a todo el mundo sin saber qué
    // pasaba durante horas.
    expect(setPasswordErrorMessage({ message: 'algo raro del servidor' })).toContain('algo raro del servidor')
  })

  it('si de verdad no hay nada que mostrar, cae al mensaje genérico', () => {
    expect(setPasswordErrorMessage(null)).toBe('No se pudo guardar la contraseña. Intenta de nuevo.')
  })
})
