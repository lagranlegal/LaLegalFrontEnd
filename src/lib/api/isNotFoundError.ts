import { ApiError } from '@/lib/api/client'

/**
 * ¿El registro no existe (o no es de esta empresa)? `NOT_FOUND`, 404
 * (`app/core/errors.py::NotFoundError`). Reintentar no lo arregla: la
 * pantalla ofrece volver, no «Reintentar» (F9-58).
 */
export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'NOT_FOUND'
}
