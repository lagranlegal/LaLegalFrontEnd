/**
 * Errores por `code`, nunca por `message` (docs/ARCHITECTURE.md §6).
 * El backend responde el envelope uniforme `{code, message, details}` en
 * todo 4xx/409/402; `parseApiError` lo normaliza a `ApiError` tipado.
 *
 * El comportamiento por código (qué modal/toast dispara cada uno) vive en
 * los componentes que consuman estos errores — este módulo solo detecta y
 * tipa el código, no reacciona por sí mismo.
 */

export const API_ERROR_CODES = [
  'UNAUTHORIZED',
  'PERMISSION_DENIED',
  'SUBSCRIPTION_EXPIRED',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'CASH_SESSION_NOT_OPEN',
  'CASH_SESSION_ALREADY_OPEN',
  'ALREADY_CLOSED_TODAY',
  'PAYMENT_PARTIAL_INTEREST_REJECTED',
  'CONTRACT_CLOSED',
  'CONTRACT_NOT_READY_FOR_AUCTION',
  'LAST_ADMIN_SAFEGUARD',
  'IDEMPOTENCY_KEY_REQUIRED',
  'CONFLICT',
  'BAD_REQUEST',
  // Import de contratos preexistentes (paso 5b, docs/RECOMENDACIONES.md §1.6)
  'CONTRACT_LEGACY_CODE_EXISTS',
  'IMPORT_CAPITAL_EXCEEDS_PRINCIPAL',
  'IMPORT_DATES_MISALIGNED',
  // Invitar usuario (paso 8): el backend envuelve cualquier fallo de
  // Supabase Auth Admin en este código con 502 — sin modal específico, cae
  // al banner genérico con `error.message` (ya trae el mensaje real en
  // español).
  'AUTH_ADMIN_ERROR',
  // Caso aparte de AUTH_ADMIN_ERROR y no un 502: Supabase limitó el envío de
  // correos. No hay nada roto, hay que esperar — decirle "no se pudo
  // invitar" al admin lo manda a buscar un problema que no existe.
  'INVITE_RATE_LIMITED',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

const KNOWN_CODES: ReadonlySet<string> = new Set(API_ERROR_CODES)

export interface ApiErrorDetails {
  /** `VALIDATION_ERROR`: errores por campo para RHF `setError` (422). */
  errors?: Record<string, string[]>
  [key: string]: unknown
}

/** Error de respuesta del backend, con `code` tipado del envelope uniforme. */
export class ApiError extends Error {
  readonly code: ApiErrorCode | 'UNKNOWN'
  readonly status: number
  readonly details?: ApiErrorDetails

  constructor(params: { code: ApiErrorCode | 'UNKNOWN'; message: string; status: number; details?: ApiErrorDetails }) {
    super(params.message)
    this.name = 'ApiError'
    this.code = params.code
    this.status = params.status
    this.details = params.details
  }
}

/**
 * La request no llegó a completarse (sin conexión, timeout, CORS…) — se
 * distingue de `ApiError` porque no trae `code` del backend. Las mutaciones
 * de dinero reintentan con la MISMA Idempotency-Key ante esto (§6).
 */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('No se pudo conectar con el servidor.')
    this.name = 'NetworkError'
    this.cause = cause
  }
}

function isErrorEnvelope(body: unknown): body is { code: string; message: string; details?: ApiErrorDetails } {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).code === 'string' &&
    typeof (body as Record<string, unknown>).message === 'string'
  )
}

export function parseApiError(status: number, body: unknown): ApiError {
  if (isErrorEnvelope(body)) {
    return new ApiError({
      code: KNOWN_CODES.has(body.code) ? (body.code as ApiErrorCode) : 'UNKNOWN',
      message: body.message,
      status,
      details: body.details,
    })
  }
  return new ApiError({ code: 'UNKNOWN', message: `Ocurrió un error inesperado (${status}).`, status })
}
