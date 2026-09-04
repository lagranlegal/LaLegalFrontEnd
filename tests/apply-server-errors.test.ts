import { describe, expect, it, vi } from 'vitest'
import { applyServerErrors, serverErrorFieldNames } from '@/lib/forms/applyServerErrors'
import { ApiError } from '@/lib/api/errors'

/**
 * Payload REAL de un 422 del backend, copiado de una respuesta en vivo
 * (`POST /contracts` con el peso escrito "10,5"). El bug que motivó estos
 * tests fue exactamente esto: el código asumía `{campo: [mensajes]}` y el
 * backend siempre mandó una LISTA — así que no marcaba nada, no devolvía
 * banner, y el 422 quedaba invisible.
 */
function error422(errors: unknown) {
  return new ApiError({ code: 'VALIDATION_ERROR', message: 'Los datos enviados no son válidos.', status: 422, details: { errors } as never })
}

describe('applyServerErrors con un 422 real', () => {
  it('marca el campo anidado con el nombre que usa el formulario', () => {
    const setError = vi.fn()
    const banner = applyServerErrors(
      error422([{ type: 'decimal_parsing', loc: ['body', 'items', 0, 'weight_grams'], msg: 'Input should be a valid decimal' }]),
      setError,
    )
    expect(setError).toHaveBeenCalledWith('items.0.weight_grams', expect.anything())
    expect(banner).toBeNull()
  })

  it('traduce el mensaje de Pydantic a algo que se pueda leer', () => {
    const setError = vi.fn()
    applyServerErrors(error422([{ type: 'decimal_parsing', loc: ['body', 'items', 0, 'weight_grams'], msg: 'Input should be a valid decimal' }]), setError)
    expect(setError.mock.calls[0]![1].message).toContain('punto decimal')
  })

  it('NUNCA se queda callado: si no pudo marcar ningún campo, devuelve banner', () => {
    // Devolver `null` es prometer "el usuario ya está viendo el problema".
    // Es la promesa que se incumplía y dejaba el formulario mudo.
    const setError = vi.fn()
    const banner = applyServerErrors(error422([{ msg: 'algo raro' } as never]), setError)
    expect(setError).not.toHaveBeenCalled()
    expect(banner).toBeTruthy()
  })

  it('tampoco se queda callado con un details vacío o de otra forma', () => {
    for (const errors of [[], undefined, { campo: ['viejo formato'] }]) {
      expect(applyServerErrors(error422(errors), vi.fn())).toBeTruthy()
    }
  })

  it('un error que no es de la API igual dice algo', () => {
    expect(applyServerErrors(new Error('boom'), vi.fn())).toBeTruthy()
  })
})

describe('serverErrorFieldNames', () => {
  it('devuelve los campos sin tocar el formulario', () => {
    expect(
      serverErrorFieldNames(
        error422([
          { loc: ['body', 'items', 0, 'weight_grams'], msg: 'x' },
          { loc: ['body', 'principal'], msg: 'y' },
        ]),
      ),
    ).toEqual(['items.0.weight_grams', 'principal'])
  })

  it('ignora errores que no son de validación', () => {
    expect(serverErrorFieldNames(new ApiError({ code: 'CONFLICT', message: 'x', status: 409 }))).toEqual([])
  })
})
