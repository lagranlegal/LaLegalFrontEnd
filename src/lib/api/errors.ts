/**
 * Errores por `code`, nunca por `message` (docs/ARCHITECTURE.md §6).
 * El backend responde el envelope uniforme `{code, message, details}` en
 * todo 4xx/409/402; `parseApiError` lo normaliza a `ApiError` tipado.
 *
 * El comportamiento por código (qué modal/toast dispara cada uno) vive en
 * los componentes que consuman estos errores — este módulo solo detecta y
 * tipa el código, no reacciona por sí mismo.
 */
import { formatCOP, sumMoney } from '@/lib/money'
import { describeMissing } from '@/lib/documents/templateRequirements'

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
  // Se intentó REABRIR una sesión que ya está abierta: un doble clic, o una
  // segunda pestaña que todavía mostraba la caja cerrada (F21-34). Hasta el
  // 25/09/2026 el backend mandaba `CONFLICT` a secas y la pantalla decía
  // «No se pudo reabrir la caja. Intenta de nuevo.» — mandaba a repetir algo
  // que ya estaba hecho. No confundir con `CASH_SESSION_ALREADY_OPEN`, que al
  // reabrir significa OTRA sesión abierta. `details: {session_id, status}`.
  'CASH_SESSION_NOT_CLOSED',
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
  // F21-36: la venta se pagó (toda o en parte) con una nota crédito. Anularla
  // sacaba del cajón el total entero, incluida la parte de la nota —que
  // nunca entró—, y la nota seguía gastada. Mismo molde que el anterior: cae
  // al toast con el mensaje del backend, que nombra la nota y la salida
  // (registrar una devolución liquidada en nota crédito); `details` trae
  // `{credit_note_id, credit_note_number, redeemed_amount}`.
  'SALE_PAID_WITH_CREDIT_NOTE',
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
  // Configuración de avisos por correo (00058). La pantalla solo manda los
  // códigos que el propio `GET /notifications/settings` le devolvió y nunca
  // los de audiencia `platform`, así que los dos solo llegan si el catálogo
  // del backend cambió entre la carga y el guardado. Caen al banner genérico
  // con el mensaje del backend; `details` trae los códigos culpables.
  'NOTIFICATION_EVENT_UNKNOWN',
  'NOTIFICATION_EVENT_NOT_CONFIGURABLE',
  // Enlace de baja del correo al cliente (00059, NOTIFICACIONES §17): firma
  // mala, cliente o empresa inexistente, o la plataforma sin secreto. Un solo
  // código a propósito. Lo lee SOLO la página pública `/baja/$token`, que no
  // tiene sesión: el mensaje del backend ya le dice a la persona qué hacer.
  'UNSUBSCRIBE_LINK_INVALID',
  // Límite de tasa del mismo endpoint público (25/09/2026, NOTIFICACIONES
  // §17-bis): 60 por minuto por IP o 10 cada 10 minutos por token. `details`
  // trae `retry_after_seconds`. Sin trato propio a propósito: la página de
  // baja ya muestra el mensaje del backend («espere un momento…») y, en la
  // carga, su botón «Reintentar» — que es justo lo que hay que hacer.
  'RATE_LIMITED',
  // Auditoría 27/09/2026 del backend (e030188..5bef3ce). Todos traen un
  // mensaje del backend ya escrito para quien opera; dos se completan con su
  // `details` en `userMessage` (ver abajo).
  //
  // Quien gestiona usuarios o roles solo reparte permisos que él mismo tiene
  // (F3-02). 403, pero NO es `PERMISSION_DENIED`: no hay que refrescar `/me`,
  // el rol de uno está bien. `details.missing_permissions` = los que faltan.
  'ROLE_EXCEEDS_ACTOR_PERMISSIONS',
  // Nadie se cambia su propio rol (403). La ficha propia ya no ofrece el
  // selector; esto cubre la carrera.
  'CANNOT_CHANGE_OWN_ROLE',
  // Categoría con `max_ltv_pct` y sin avalúo, sin `contracts.override_ltv`
  // (422, F4-05). El formulario lo pide antes de enviar.
  'CONTRACT_APPRAISAL_REQUIRED',
  // Saldar dentro del primer mes cobra un mes de interés (422, F4-11).
  // `details: {months_required, payoff_interest, payoff_total}`.
  'PAYMENT_MINIMUM_INTEREST_REQUIRED',
  // Segundo pago de una compra ya pagada (409): no es un conflicto genérico,
  // es "ya está hecho".
  'PURCHASE_ALREADY_PAID',
  // Nombres repetidos que antes eran `CONFLICT` o un 500 (409). Los cuatro se
  // señalan en el campo `name` del formulario (`applyServerErrors`).
  'ROLE_NAME_TAKEN',
  'ACCOUNT_NAME_TAKEN',
  'EXPENSE_CATEGORY_NAME_TAKEN',
  'CATEGORY_NAME_TAKEN',
  // Tanda F1 del backend (9cb3324..f03b2f2, 28/09/2026).
  //
  // Reportes por período con un rango al revés (422). El selector de fechas
  // ya no deja armarlo; esto cubre lo que llegue igual.
  'INVALID_DATE_RANGE',
  // `/reports/profit` y `/reports/pawn-performance` topan el rango en 366
  // días (422, `details.max_days`). La pantalla avisa antes de pedir.
  'DATE_RANGE_TOO_LONG',
  // Una línea por debajo del COSTO de su lote sin `sales.apply_discount`
  // (403, pero NO `PERMISSION_DENIED`: el rol está bien, lo que pasa es que
  // la venta pierde plata). `details.below_cost_lines` = [{item_id,
  // unit_cost, unit_price, quantity, loss}].
  'SALE_BELOW_COST_REQUIRES_PERMISSION',
  // Tope por empresa de invitaciones Y enlaces de acceso (429, backend
  // 6cb2368): las dos rutas comparten el cupo, así que «genera el enlace» NO
  // es una salida — también cuenta. `details.retry_after_seconds` dice cuánto
  // esperar, y eso es lo que se agrega al mensaje.
  'INVITATIONS_RATE_LIMITED',
  // Plantillas de documentos (backend 93f95e0, auditoría de QA F8-01/02/03).
  // Con el backend anterior no llegan nunca; mapearlos no cambia nada ahí.
  //
  // Activar —o guardar la que YA está activa— con un cuerpo que no imprime
  // nada (409). Antes solo se validaba al activar, y un PATCH vaciaba la
  // activa con 200.
  'TEMPLATE_IS_EMPTY',
  // Borrar la plantilla activa (409): hay que activar otra o volver al
  // documento de fábrica primero.
  'TEMPLATE_IS_ACTIVE',
  // El cuerpo no es un documento del editor (422, `details.field = 'body'`).
  'TEMPLATE_BODY_INVALID',
  // Un contrato sin nombre del cliente, tabla de prendas o firma del cliente
  // (409). `details.missing` = claves de `lib/documents/templateRequirements`.
  'TEMPLATE_MISSING_REQUIRED_FIELDS',
  // Límites de avisos al cliente por debajo del piso de la Ley 2300 (422,
  // backend d185e38, F8-05). `details.fields` = los campos que aflojan el
  // piso; `details.floor` = el piso vigente, con la forma de
  // `customer_contact_limits`.
  'CONTACT_LIMITS_BELOW_LEGAL_FLOOR',
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
  const conDetalle = messageWithDetails(error)
  if (conDetalle) return conDetalle
  return FRONT_MESSAGES[error.code] ?? error.message
}

/** Cuántos permisos se nombran antes de resumir con «y N más». */
const MAX_PERMISOS_NOMBRADOS = 5

/**
 * Los códigos cuyo `message` del backend es correcto pero incompleto: la
 * cifra o la lista que responde "¿y entonces qué?" viene en `details`. Se
 * AGREGA al texto del backend, no se reemplaza.
 */
function messageWithDetails(error: ApiError): string | null {
  const details = error.details ?? {}
  if (error.code === 'ROLE_EXCEEDS_ACTOR_PERMISSIONS') {
    const faltan = Array.isArray(details.missing_permissions) ? details.missing_permissions.filter((p): p is string => typeof p === 'string') : []
    if (faltan.length === 0) return null
    const nombrados = faltan.slice(0, MAX_PERMISOS_NOMBRADOS).join(', ')
    const resto = faltan.length - MAX_PERMISOS_NOMBRADOS
    return `${error.message} Te ${faltan.length === 1 ? 'falta' : 'faltan'}: ${nombrados}${resto > 0 ? ` y ${resto} más` : ''}.`
  }
  if (error.code === 'SALE_BELOW_COST_REQUIRES_PERMISSION') {
    const lineas = belowCostLines(error)
    if (lineas.length === 0) return null
    const perdida = lineas.reduce((acc, l) => sumMoney(acc, l.loss), '0.00')
    return `${error.message} ${lineas.length === 1 ? 'Una línea queda' : `${lineas.length} líneas quedan`} por debajo del costo: la venta perdería ${formatCOP(perdida)}. Sube el precio o pídele a alguien con permiso de descuentos que la registre.`
  }
  if (error.code === 'INVITATIONS_RATE_LIMITED') {
    const segundos = details.retry_after_seconds
    const espera = typeof segundos === 'number' && segundos > 0 ? ` Podrás volver a hacerlo en unos ${Math.ceil(segundos / 60)} minuto(s).` : ' Intenta más tarde.'
    return `Llegaste al límite de invitaciones y enlaces de acceso por hora de la empresa (generar el enlace también cuenta).${espera}`
  }
  if (error.code === 'TEMPLATE_MISSING_REQUIRED_FIELDS') {
    // El texto del backend usa sus propias etiquetas («el campo "Nombre del
    // cliente"»); se arma con las del editor, que es lo que la persona ve.
    const faltan = Array.isArray(details.missing) ? describeMissing(details.missing) : ''
    if (!faltan) return null
    return `A esta plantilla le falta ${faltan}. Un contrato de empeño tiene que decir a quién se le prestó, sobre qué prendas y llevar la firma del cliente.`
  }
  if (error.code === 'PAYMENT_MINIMUM_INTEREST_REQUIRED') {
    const total = details.payoff_total
    const interes = details.payoff_interest
    if (typeof total !== 'string' || typeof interes !== 'string') return null
    return `${error.message} Para saldarlo hoy son ${formatCOP(total)} (incluye ${formatCOP(interes)} de interés).`
  }
  return null
}

export interface BelowCostLine {
  item_id: string
  unit_cost: string
  unit_price: string
  quantity: string
  loss: string
}

/** Las líneas bajo costo de un `SALE_BELOW_COST_REQUIRES_PERMISSION`; `[]` si no es ese código o no las trae. */
export function belowCostLines(error: ApiError): BelowCostLine[] {
  if (error.code !== 'SALE_BELOW_COST_REQUIRES_PERMISSION') return []
  const raw = error.details?.below_cost_lines
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (l): l is BelowCostLine => typeof l === 'object' && l !== null && typeof (l as BelowCostLine).item_id === 'string' && typeof (l as BelowCostLine).loss === 'string',
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
