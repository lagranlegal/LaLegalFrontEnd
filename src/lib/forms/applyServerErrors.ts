import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError, type ValidationIssue } from '@/lib/api/errors'

/**
 * Traduce un `msg` de Pydantic a algo que pueda leer quien está usando la app.
 *
 * "Input should be a valid decimal" es correcto y perfectamente inútil para
 * alguien pesando oro en un mostrador. Se traduce por `type`, que es estable,
 * y no por el texto, que cambia entre versiones de Pydantic.
 */
const MENSAJES: Record<string, string> = {
  decimal_parsing: 'Escribe el número con punto decimal (10.5), no con coma.',
  int_parsing: 'Escribe un número entero.',
  float_parsing: 'Escribe un número válido.',
  uuid_parsing: 'Selecciona una opción de la lista.',
  uuid_type: 'Selecciona una opción de la lista.',
  missing: 'Este dato es obligatorio.',
  string_too_short: 'Este dato es obligatorio.',
  greater_than: 'Tiene que ser mayor que cero.',
  date_parsing: 'Escribe una fecha válida.',
}

function mensajeDe(issue: ValidationIssue): string {
  return (issue.type && MENSAJES[issue.type]) || issue.msg
}

/**
 * `loc` de Pydantic → nombre del campo en React Hook Form.
 *
 * `["body", "items", 0, "weight_grams"]` → `items.0.weight_grams`, que es
 * literalmente como se registra ese input. El primer segmento (`body`, `query`
 * o `path`) se descarta: nombra de dónde vino el dato, no qué campo es.
 */
function nombreDeCampo(loc: (string | number)[]): string {
  const partes = loc[0] === 'body' || loc[0] === 'query' || loc[0] === 'path' ? loc.slice(1) : loc
  return partes.join('.')
}

/**
 * Los campos que un `VALIDATION_ERROR` señala, sin efectos secundarios.
 *
 * Existe para poder hacer scroll hasta el primero: `applyServerErrors` los
 * marca con `setError`, pero el `errors` del `formState` todavía es el del
 * render anterior en ese mismo tick, así que leerlo ahí apuntaría al campo
 * equivocado o a ninguno.
 */
export function serverErrorFieldNames(error: unknown): string[] {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_ERROR') return []
  const issues = Array.isArray(error.details?.errors) ? error.details.errors : []
  return issues.map((issue) => (Array.isArray(issue?.loc) ? nombreDeCampo(issue.loc) : '')).filter(Boolean)
}

/**
 * Errores por `code`, nunca por `message` (CLAUDE.md regla 9), aplicados a
 * un form de React Hook Form:
 *
 *  - `VALIDATION_ERROR` (422) → un `setError` por campo desde
 *    `details.errors` — el error vive junto a su input.
 *  - `CONFLICT` (409) → mensaje contextual de la feature, en un campo
 *    específico si se pasa `conflictField`, o como banner si no.
 *  - cualquier otro código → banner genérico con `error.message`.
 *
 * Retorna el string a mostrar en un banner, o `null` **solo si de verdad se
 * marcó algún campo**.
 *
 * ESA ÚLTIMA CONDICIÓN ES EL ARREGLO DE UN BUG REAL (03/09/2026). Esta
 * función leía `details.errors` como `{campo: [mensajes]}` cuando el backend
 * siempre mandó una LISTA de `{loc, msg, type}`. `Object.entries` sobre un
 * array daba `[["0", {…}]]`, `messages[0]` salía `undefined`, no se marcaba
 * ningún campo… y aun así retornaba `null`, o sea "ya lo mostré". Resultado:
 * **todo 422 de la aplicación era invisible**. El síntoma que reportaron:
 * "llenaban todos los datos, le daban crear contrato, aparecía cargando y
 * luego volvía sin crear nada y sin mostrar ningún mensaje". El disparador
 * más común era escribir el peso de una prenda con coma ("10,5").
 *
 * Devolver `null` es una promesa: "el usuario ya está viendo el problema".
 * Solo se puede hacer si se cumplió.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  options?: { conflictField?: Path<T>; conflictMessage?: string },
): string | null {
  if (!(error instanceof ApiError)) {
    return 'Ocurrió un error inesperado. Intenta de nuevo.'
  }

  if (error.code === 'VALIDATION_ERROR') {
    const issues = Array.isArray(error.details?.errors) ? error.details.errors : []
    const marcados: string[] = []
    for (const issue of issues) {
      const campo = Array.isArray(issue?.loc) ? nombreDeCampo(issue.loc) : ''
      if (!campo) continue
      setError(campo as Path<T>, { message: mensajeDe(issue) })
      marcados.push(campo)
    }
    if (marcados.length > 0) return null
    // No se pudo señalar ningún campo: el banner es la única salida que le
    // queda al usuario. Callarse acá es exactamente el bug de arriba.
    const detalle = issues.map(mensajeDe).filter(Boolean).join(' ')
    return detalle ? `${error.message} ${detalle}` : error.message
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
