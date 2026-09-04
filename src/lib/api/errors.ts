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
  // Se intentó pagar (compra, gasto, desembolso) desde una cuenta POR COBRAR
  // —Sistecrédito, datáfono—, que es plata que todavía te deben y no un saldo
  // disponible. El selector ya no las ofrece al pagar; este código cubre el
  // caso de que llegue igual. Cae al banner genérico: el mensaje del backend
  // ya explica qué elegir en su lugar.
  'ACCOUNT_CANNOT_FUND_PAYMENT',
  // Devolución de cliente (00042-00045). Los tres caen al banner genérico
  // del formulario — el mensaje del backend ya explica qué hacer (usar nota
  // crédito, liquidar la cuenta, o que alguien con el permiso lo registre).
  'SALE_ACCOUNT_NOT_SETTLED',
  'RETURN_TIME_LIMIT_EXCEEDED',
  'CREDIT_NOTE_INSUFFICIENT_BALANCE',
  // Identidad (04/09/2026). Los tres reemplazan errores que se leían como
  // fallas del sistema —un 500 en texto plano y dos 502 "no se pudo invitar en
  // Supabase Auth"— cuando en realidad el admin tenía que hacer otra cosa.
  // Caen al banner genérico: el mensaje del backend ya dice cuál.
  'USER_ALREADY_INVITED',
  'USER_ALREADY_EXISTS',
  'EMAIL_ALREADY_REGISTERED',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

const KNOWN_CODES: ReadonlySet<string> = new Set(API_ERROR_CODES)

/**
 * Un error de validación tal como lo manda el backend, que es el de Pydantic
 * sin transformar (`jsonable_encoder(exc.errors())` en `app/core/errors.py`).
 *
 * OJO CON `loc`: es la RUTA al campo dentro del body, empezando por `"body"`,
 * con enteros para los índices de array:
 *
 *     ["body", "items", 0, "weight_grams"]
 *
 * Quitando el `"body"` y uniendo con puntos queda `items.0.weight_grams`, que
 * es exactamente como se llama ese input en React Hook Form. Por eso
 * `applyServerErrors` puede mapearlos sin ninguna tabla de traducción.
 */
export interface ValidationIssue {
  loc: (string | number)[]
  msg: string
  type?: string
}

export interface ApiErrorDetails {
  /**
   * `VALIDATION_ERROR` (422): la LISTA de problemas de Pydantic.
   *
   * Este tipo decía `Record<string, string[]>` — un objeto campo → mensajes.
   * Nunca fue cierto: el backend siempre mandó una lista. Como nada valida
   * en runtime, TypeScript aceptó la suposición y `applyServerErrors` hacía
   * `Object.entries(...)` sobre un array, sacaba `undefined` de cada entrada
   * y salía sin marcar ningún campo Y sin banner: **cada 422 de la app era
   * invisible**. El botón giraba, volvía a su sitio y no pasaba nada.
   */
  errors?: ValidationIssue[]
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
