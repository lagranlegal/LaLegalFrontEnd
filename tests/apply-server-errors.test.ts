import { describe, expect, it, vi } from 'vitest'
import { applyServerErrors, serverErrorFieldNames } from '@/lib/forms/applyServerErrors'
import { ApiError, parseApiError } from '@/lib/api/errors'

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
      { fields: ['items.*.weight_grams'] },
    )
    expect(setError).toHaveBeenCalledWith('items.0.weight_grams', expect.anything())
    expect(banner).toBeNull()
  })

  it('traduce el mensaje de Pydantic a algo que se pueda leer', () => {
    const setError = vi.fn()
    applyServerErrors(error422([{ type: 'decimal_parsing', loc: ['body', 'items', 0, 'weight_grams'], msg: 'Input should be a valid decimal' }]), setError, {
      fields: ['items.*.weight_grams'],
    })
    expect(setError.mock.calls[0]![1].message).toContain('punto decimal')
  })

  it('NUNCA se queda callado: si no pudo marcar ningún campo, devuelve banner', () => {
    // Devolver `null` es prometer "el usuario ya está viendo el problema".
    // Es la promesa que se incumplía y dejaba el formulario mudo.
    const setError = vi.fn()
    const banner = applyServerErrors(error422([{ msg: 'algo raro' } as never]), setError, { fields: [] })
    expect(setError).not.toHaveBeenCalled()
    expect(banner).toBeTruthy()
  })

  it('tampoco se queda callado con un details vacío o de otra forma', () => {
    for (const errors of [[], undefined, { campo: ['viejo formato'] }]) {
      expect(applyServerErrors(error422(errors), vi.fn(), { fields: [] })).toBeTruthy()
    }
  })

  it('un error que no es de la API igual dice algo', () => {
    expect(applyServerErrors(new Error('boom'), vi.fn(), { fields: [] })).toBeTruthy()
  })
})

/**
 * QA 03 H-03 (sistémico): el formulario daba el 422 por mostrado si marcó
 * ALGÚN campo, aunque ese campo no pinte su error. Crear un contrato con
 * `extension_months: 0` marcaba `extension_months`, que el formulario no
 * pinta: sin banner, sin mensaje, el botón "no hacía nada".
 *
 * Cuerpo copiado LITERAL de la respuesta del handler real
 * (`backend-starter/app/core/errors.py::handle_validation_error`) con el
 * schema real (`ContractCreateIn`), generado con TestClient el 27/09/2026 —
 * incluye `input` y `ctx`, que un fixture de memoria no tendría.
 */
const CONTRATO_422 = {
  code: 'VALIDATION_ERROR',
  message: 'Los datos enviados no son válidos.',
  details: {
    errors: [
      { type: 'decimal_parsing', loc: ['body', 'items', 0, 'weight_grams'], msg: 'Input should be a valid decimal', input: '10,5' },
      { type: 'greater_than_equal', loc: ['body', 'extension_months'], msg: 'Input should be greater than or equal to 1', input: 0, ctx: { ge: 1 } },
    ],
  },
}

describe('un error de servidor en un campo que el formulario no pinta', () => {
  const real = () => parseApiError(422, CONTRATO_422)

  it('cae al mensaje general en vez de perderse', () => {
    const setError = vi.fn()
    const banner = applyServerErrors(real(), setError, { fields: ['principal', 'items.*.weight_grams'] })

    // El peso SÍ se pinta junto a su campo…
    expect(setError).toHaveBeenCalledWith('items.0.weight_grams', expect.anything())
    // …y el plazo de prórroga, que no tiene dónde pintarse, va al banner.
    expect(banner).toContain('Input should be greater than or equal to 1')
    expect(setError).not.toHaveBeenCalledWith('extension_months', expect.anything())
  })

  it('si el formulario pinta todos los campos señalados, no hace falta banner', () => {
    const banner = applyServerErrors(real(), vi.fn(), { fields: ['extension_months', 'items.*.weight_grams'] })
    expect(banner).toBeNull()
  })

  it('el comodín solo cubre un índice de lista, no cualquier ruta', () => {
    const setError = vi.fn()
    const banner = applyServerErrors(real(), setError, { fields: ['*', 'items.*'] })
    expect(setError).not.toHaveBeenCalled()
    expect(banner).toBeTruthy()
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
