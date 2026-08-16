import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/errors'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'

describe('applyServerErrors', () => {
  it('vuelca VALIDATION_ERROR campo a campo y no retorna banner', () => {
    const setError = vi.fn()
    const error = new ApiError({
      code: 'VALIDATION_ERROR',
      message: 'Datos inválidos',
      status: 422,
      details: { errors: { doc_number: ['Ya existe'], phone: ['Formato inválido'] } },
    })

    const banner = applyServerErrors(error, setError)

    expect(banner).toBeNull()
    expect(setError).toHaveBeenCalledWith('doc_number', { message: 'Ya existe' })
    expect(setError).toHaveBeenCalledWith('phone', { message: 'Formato inválido' })
  })

  it('CONFLICT con conflictField setea el campo, no retorna banner', () => {
    const setError = vi.fn()
    const error = new ApiError({ code: 'CONFLICT', message: 'conflicto', status: 409 })

    const banner = applyServerErrors(error, setError, {
      conflictField: 'doc_number',
      conflictMessage: 'Ya existe un cliente con ese documento.',
    })

    expect(banner).toBeNull()
    expect(setError).toHaveBeenCalledWith('doc_number', { message: 'Ya existe un cliente con ese documento.' })
  })

  it('CONFLICT sin conflictField retorna el mensaje como banner', () => {
    const setError = vi.fn()
    const error = new ApiError({ code: 'CONFLICT', message: 'Ya existe una categoría con esa letra.', status: 409 })

    const banner = applyServerErrors(error, setError)

    expect(banner).toBe('Ya existe una categoría con esa letra.')
    expect(setError).not.toHaveBeenCalled()
  })

  it('otros códigos retornan message como banner genérico', () => {
    const setError = vi.fn()
    const error = new ApiError({ code: 'BAD_REQUEST', message: 'Algo salió mal', status: 400 })

    expect(applyServerErrors(error, setError)).toBe('Algo salió mal')
  })

  it('errores que no son ApiError retornan un mensaje genérico', () => {
    const setError = vi.fn()
    expect(applyServerErrors(new Error('boom'), setError)).toBe('Ocurrió un error inesperado. Intenta de nuevo.')
  })
})
