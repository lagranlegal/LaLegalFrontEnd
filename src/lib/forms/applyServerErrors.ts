import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/lib/api/client'

/**
 * Errores por `code`, nunca por `message` (CLAUDE.md regla 9), aplicados a
 * un form de React Hook Form:
 *
 *  - `VALIDATION_ERROR` (422) → un `setError` por campo desde
 *    `details.errors` — nada de banner genérico, el error vive junto al
 *    input.
 *  - `CONFLICT` (409) → mensaje contextual de la feature (ej. "Ya existe un
 *    cliente con ese documento"), en un campo específico si se pasa
 *    `conflictField`, o como banner si no.
 *  - cualquier otro código → banner genérico con `error.message`.
 *
 * Retorna el string a mostrar en un banner, o `null` si ya se resolvió con
 * `setError` de campo.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options?: { conflictField?: Path<T>; conflictMessage?: string },
): string | null {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Intenta de nuevo.'
  }

  if (error.code === 'VALIDATION_ERROR' && error.details?.errors) {
    for (const [field, messages] of Object.entries(error.details.errors)) {
      if (messages[0]) {
        setError(field as Path<T>, { message: messages[0] })
      }
    }
    return null
  }

  if (error.code === 'CONFLICT') {
    const message = options?.conflictMessage ?? error.message
    if (options?.conflictField) {
      setError(options.conflictField, { message })
      return null
    }
    return message
  }

  return error.message
}
