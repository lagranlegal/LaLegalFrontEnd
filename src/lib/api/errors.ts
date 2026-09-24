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
  // OJO CON EL NOMBRE: hasta el 23/09/2026 acá decía `ALREADY_CLOSED_TODAY`,
  // que el backend NO emite nunca — el suyo es
  // `CASH_SESSION_ALREADY_CLOSED_TODAY` (`cashbox/service.py::open_session`).
  // Como `parseApiError` solo tipa lo que está en `KNOWN_CODES`, el caso real
  // caía a `UNKNOWN` y ninguna rama de UI podía reaccionar (F20-01). Es el
  // mismo bug que dejó once días sin operar a una empresa con
  // `CASH_SESSION_NOT_OPEN`: un código es un contrato entre dos capas y nadie
  // lo compila.
  'CASH_SESSION_ALREADY_CLOSED_TODAY',
  'PAYMENT_PARTIAL_INTEREST_REJECTED',
  'CONTRACT_CLOSED',
  'CONTRACT_NOT_READY_FOR_AUCTION',
  'LAST_ADMIN_SAFEGUARD',
  'IDEMPOTENCY_KEY_REQUIRED',
  // El reintento llegó con la MISMA `Idempotency-Key` mientras la petición
  // original seguía en vuelo (409, `app/core/errors.py::handle_integrity_error`).
  // Es el doble clic en "Vender", no una falla: la primera va a terminar
  // bien. El mensaje del backend ya está escrito para mostrador ("No la
  // repitas: consulta el resultado en unos segundos"), así que cae al banner
  // genérico con `error.message` — lo que faltaba era tiparlo (F20-02).
  'IDEMPOTENCY_IN_PROGRESS',
  // La empresa tiene más de una caja registradora activa y multi-caja no
  // existe todavía (409). Hoy no se llega acá por la API —ningún endpoint
  // crea registradoras—, pero si aparece, el mensaje del backend nombra el
  // problema y el banner genérico lo muestra en vez de "error inesperado"
  // (F20-03).
  'MULTIPLE_REGISTERS_NOT_SUPPORTED',
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
  // Caso aparte de AUTH_ADMIN_ERROR y no un 502 (429): se agotó la cuota de
  // correos. No hay nada roto, hay que esperar — decirle "no se pudo
  // invitar" al admin lo manda a buscar un problema que no existe. Único
  // código con mensaje propio del front (ver `FRONT_MESSAGES`): el del
  // backend nombra a Supabase, y quien administra una compraventa no tiene
  // por qué saber qué es eso (F21-06).
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
  // Anular una venta que YA tiene devoluciones (F21-31). No es "ya está
  // anulada": la venta sigue viva y lo devuelto ya se liquidó con el
  // cliente, así que anular pagaría dos veces y repondría dos veces el
  // stock. Cae al toast con el mensaje del backend, que nombra la salida
  // (registrar una devolución por lo que falta); `details` trae
  // `{return_count, return_numbers, return_ids}` para poder decir «esta
  // venta tiene la devolución Nº 4».
  'SALE_HAS_RETURNS',
  // Identidad (04/09/2026). Los tres reemplazan errores que se leían como
  // fallas del sistema —un 500 en texto plano y dos 502 "no se pudo invitar en
  // Supabase Auth"— cuando en realidad el admin tenía que hacer otra cosa.
  // Caen al banner genérico: el mensaje del backend ya dice cuál.
  'USER_ALREADY_INVITED',
  'USER_ALREADY_EXISTS',
  'EMAIL_ALREADY_REGISTERED',
  'AUTH_ACCOUNT_MISSING',
  'CANNOT_DEACTIVATE_SELF',
  // Caja: el saldo del cajón es de la CUENTA, no del turno (00048).
  // El conteo de apertura no cuadra y no vino motivo. Mismo rigor y misma
  // razón que el descuadre de cierre: es la misma clase de hecho. El diálogo
  // de abrir caja lo pide ANTES de enviar, así que este código solo llega si
  // alguien pega contra la API directo.
  'CASH_OPENING_DIFFERENCE_UNJUSTIFIED',
  // Se eligió una caja fuerte (`vault`) como cuenta de una operación de
  // negocio (00049). No es un punto de cobro: entra y sale solo por
  // traslado. El `AccountPicker` no la ofrece; esto cubre el caso de que
  // llegue igual.
  'ACCOUNT_NOT_OPERATIONAL',
  // Segunda cuenta de efectivo (00049). Con un solo turno, dos cajones
  // hacen el arqueo incuadrable. El formulario ya deja de ofrecer "Efectivo"
  // cuando existe una; el mensaje del backend explica las dos salidas
  // (trasladar, o crear una caja fuerte).
  'CASH_ACCOUNT_ALREADY_EXISTS',
  // Ampliar el préstamo (00051, ../backend-starter/docs/RECARGOS.md). Los
  // tres los muestra el panel ANTES de dejar intentar —`GET
  // /extension-options` los devuelve como `blocked_reason`— así que como
  // error solo aparecen en una carrera: alguien abonó o el día cambió entre
  // que se pintó la card y se confirmó.
  'EXTENSION_WINDOW_CLOSED',
  'CONTRACT_INTEREST_OVERDUE',
  'CONTRACT_WITHOUT_APPRAISAL',
  // Se intentó abonar sobre un contrato que ya fue REEMPLAZADO por una
  // ampliación (`superseded`). Aparte de `CONTRACT_CLOSED` a propósito: ahí
  // el documento terminó y no hay nada que hacer, acá la deuda solo se mudó
  // de documento. Cae al banner genérico porque el mensaje del backend ya
  // nombra el contrato sucesor, y `details` lo trae para enlazarlo:
  // `{successor_contract_id, successor_number}`.
  'CONTRACT_SUPERSEDED',
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

/**
 * Los poquísimos códigos cuyo `message` del backend NO se puede pintar tal
 * cual. La regla del proyecto sigue siendo mostrar el texto del backend —lo
 * escribe quien conoce la regla de negocio y nombra la salida—; esto es la
 * excepción, no una capa de traducción paralela. Agregar una entrada acá
 * exige una razón: hoy la única es que el mensaje filtra un detalle de
 * infraestructura.
 *
 * Y el reemplazo tiene que nombrar la acción que queda, no solo tapar la
 * palabra: "espera unos minutos" **o** "genera el enlace", que es el camino
 * que existe en el mismo diálogo y no consume cuota de correos.
 */
const FRONT_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  INVITE_RATE_LIMITED:
    'Se agotó por ahora la cuota de correos de invitación. Espera unos minutos y envíala de nuevo, o usa «Generar enlace» y pásaselo tú por un medio privado: ese camino no manda correo.',
}

/**
 * El texto que se le muestra a la persona para un error del backend.
 *
 * Por defecto es `error.message` —la regla 9 de CLAUDE.md al pie de la
 * letra—, salvo los códigos de `FRONT_MESSAGES`. Todo banner/toast que hoy
 * hace `error.message` debería pasar por acá; así el día que otro mensaje
 * haya que reescribirlo se hace en un solo lugar y no en catorce diálogos.
 */
export function userMessage(error: ApiError): string {
  if (error.code === 'UNKNOWN') return error.message
  return FRONT_MESSAGES[error.code] ?? error.message
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
