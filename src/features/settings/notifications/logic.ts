import type { NotificationEventSetting, NotificationSettings, NotificationSettingsUpdateIn } from '@/features/settings/notifications/api'

/**
 * Lo que se edita en el formulario de parámetros. Los interruptores (el
 * general y el de cada evento) NO van acá: se guardan al tocarlos, cada uno
 * con su propio PATCH, porque encender es un acto explícito que se confirma
 * en el momento — no una casilla que viaja escondida con un umbral.
 */
export interface ParamsDraft {
  discount_amount: string
  cash_difference_amount: string
  stale_after_days: string
  limits_enabled: boolean
  max_per_week: string
  max_per_day: string
  weekday_start: string
  weekday_end: string
  saturday_start: string
  saturday_end: string
  sundays_and_holidays: boolean
}

export function draftFromSettings(s: NotificationSettings): ParamsDraft {
  const l = s.customer_contact_limits
  return {
    discount_amount: s.thresholds.discount_amount,
    cash_difference_amount: s.thresholds.cash_difference_amount,
    stale_after_days: String(s.stale_after_days),
    limits_enabled: l.enabled,
    max_per_week: String(l.max_per_week),
    max_per_day: String(l.max_per_day),
    weekday_start: l.weekday_hours[0],
    weekday_end: l.weekday_hours[1],
    saturday_start: l.saturday_hours[0],
    saturday_end: l.saturday_hours[1],
    sundays_and_holidays: l.sundays_and_holidays,
  }
}

/** Mismos rangos que `NotificationSettingsUpdateIn` / `ContactLimitsIn` del backend. */
const INT_RANGES = {
  stale_after_days: [0, 30],
  max_per_week: [0, 50],
  max_per_day: [0, 20],
} as const

export type ParamsErrors = Partial<Record<keyof ParamsDraft, string>>

/**
 * Validación de FORMA, no de negocio (regla 5 del CLAUDE.md): los rangos y
 * «inicio antes que fin» los vuelve a exigir el backend con 422. Se repiten
 * acá solo para que el error salga junto al campo y no como un banner.
 */
export function validateDraft(d: ParamsDraft): ParamsErrors {
  const errors: ParamsErrors = {}
  for (const [key, [min, max]] of Object.entries(INT_RANGES) as [keyof typeof INT_RANGES, readonly [number, number]][]) {
    const raw = d[key].trim()
    if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max) {
      errors[key] = `Un número entero entre ${min} y ${max}.`
    }
  }
  // "HH:MM" con ceros a la izquierda se compara bien como texto, que es
  // justo como lo compara el backend (`start >= end` sobre strings).
  if (d.weekday_start >= d.weekday_end) errors.weekday_end = 'Tiene que ser después de la hora de inicio.'
  if (d.saturday_start >= d.saturday_end) errors.saturday_end = 'Tiene que ser después de la hora de inicio.'
  return errors
}

/**
 * PATCH con SOLO lo que cambió. El backend audita el antes y el después de
 * cada campo que cambia (`update_settings`), así que mandar el formulario
 * entero ensuciaría la auditoría con cambios que nadie hizo. `null` si no hay
 * nada que guardar.
 */
export function buildParamsPatch(server: NotificationSettings, d: ParamsDraft): NotificationSettingsUpdateIn | null {
  const base = draftFromSettings(server)
  const body: NotificationSettingsUpdateIn = {}

  const thresholds: NonNullable<NotificationSettingsUpdateIn['thresholds']> = {}
  // El dinero llega como string decimal y se compara normalizado: "0" y
  // "0.00" son el mismo umbral y no pueden contar como cambio.
  if (!sameMoney(base.discount_amount, d.discount_amount)) thresholds.discount_amount = d.discount_amount || '0'
  if (!sameMoney(base.cash_difference_amount, d.cash_difference_amount)) thresholds.cash_difference_amount = d.cash_difference_amount || '0'
  if (Object.keys(thresholds).length > 0) body.thresholds = thresholds

  const limits: NonNullable<NotificationSettingsUpdateIn['customer_contact_limits']> = {}
  if (base.limits_enabled !== d.limits_enabled) limits.enabled = d.limits_enabled
  if (base.max_per_week !== d.max_per_week.trim()) limits.max_per_week = Number(d.max_per_week)
  if (base.max_per_day !== d.max_per_day.trim()) limits.max_per_day = Number(d.max_per_day)
  if (base.weekday_start !== d.weekday_start || base.weekday_end !== d.weekday_end) {
    limits.weekday_hours = [d.weekday_start, d.weekday_end]
  }
  if (base.saturday_start !== d.saturday_start || base.saturday_end !== d.saturday_end) {
    limits.saturday_hours = [d.saturday_start, d.saturday_end]
  }
  if (base.sundays_and_holidays !== d.sundays_and_holidays) limits.sundays_and_holidays = d.sundays_and_holidays
  if (Object.keys(limits).length > 0) body.customer_contact_limits = limits

  if (base.stale_after_days !== d.stale_after_days.trim()) body.stale_after_days = Number(d.stale_after_days)

  return Object.keys(body).length > 0 ? body : null
}

function sameMoney(a: string, b: string): boolean {
  // Comparación de texto normalizado, sin `parseFloat` (regla 5).
  const norm = (v: string) => {
    const [int = '0', dec = ''] = (v || '0').split('.')
    return `${int.replace(/^0+(?=\d)/, '')}.${dec.padEnd(2, '0').slice(0, 2)}`
  }
  return norm(a) === norm(b)
}

/** El evento que exige leer el texto legal antes de encenderlo (API_GUIDE §13-ter). */
export const AUCTION_READY_CUSTOMER = 'auction_ready_customer'

/**
 * `NOTIFICACIONES.md` §2.2-c, condensado. Tiene que estar en la pantalla y
 * no en una conversación: el interruptor es fácil, la consecuencia no.
 */
export const AUCTION_READY_CUSTOMER_WARNING =
  'Avisar que un bien se va a rematar tiene peso legal en Colombia, y un correo no prueba que el titular se enteró: ' +
  'que el servidor lo haya aceptado no es una constancia de entrega. Además, la mayoría de los clientes no tienen correo, ' +
  'así que el aviso le llegaría a unos pocos y a los demás no. Este aviso no reemplaza lo que diga el contrato firmado. ' +
  'Quien lo encienda está asumiendo que un correo sin prueba de entrega alcanza como aviso de remate: consúltalo con un abogado antes.'

/**
 * Texto de la confirmación al encender el interruptor general. Nombra a
 * quién le va a escribir, y la sorpresa que el diseño dejó anotada: la
 * primera corrida después de encender manda un semanal, sea el día que sea.
 */
export function enableConfirmDescription(s: NotificationSettings): string {
  const parts: string[] = []
  if (s.digest_recipients.length === 0) {
    parts.push(
      'Hoy nadie tiene el permiso «Recibir por correo el resumen diario y semanal», así que el resumen no le llegaría a nadie. Dáselo a un rol en Identidad → Roles.',
    )
  } else {
    const names = s.digest_recipients.map((r) => `${r.full_name} (${r.email})`).join(', ')
    parts.push(`El resumen le va a llegar a: ${names}.`)
  }
  parts.push('El resumen sale con el proceso nocturno, y el primero después de encender es un resumen semanal, sea el día que sea.')
  // Fase 7: encender el interruptor también suelta las alertas inmediatas,
  // que nacen marcadas. Quien confirma tiene que saber que esas salen YA.
  const alertsOn = s.events.some((e) => e.audience === 'company' && e.family === 'alert' && e.enabled)
  if (alertsOn) parts.push(alertRecipientsSummary(s))
  if (!s.provider_configured) {
    parts.push('Ojo: el envío de correos todavía no está configurado en la plataforma. Hasta que lo esté, no sale ninguno.')
  }
  return parts.join(' ')
}

/** Nombre del permiso tal como lo muestra Identidad → Roles (descripción del seed de 00058, abreviada). */
export const ALERTS_PERMISSION_LABEL = '«Recibir por correo las alertas inmediatas»'

/**
 * Quién recibe las alertas A1–A4 (`alert_recipients`, NOTIFICACIONES §19).
 * Dice también la regla que la lista sola no muestra: a quien hizo el acto no
 * le llega la suya.
 */
export function alertRecipientsSummary(s: NotificationSettings): string {
  if (s.alert_recipients.length === 0) {
    return `Las alertas inmediatas no le llegarían a nadie: nadie tiene el permiso ${ALERTS_PERMISSION_LABEL}. Dáselo a un rol en Identidad → Roles.`
  }
  const names = s.alert_recipients.map((r) => `${r.full_name} (${r.email})`).join(', ')
  return `Las alertas inmediatas salen apenas pasa el hecho, a cualquier hora, y le llegan a: ${names} — menos a quien hizo el acto.`
}

export type EventGroupKey = 'digest' | 'alert' | 'customer'

export interface EventGroup {
  key: EventGroupKey
  title: string
  note: string | null
  events: NotificationEventSetting[]
}

/**
 * Los eventos de audiencia `platform` (la invitación) no se configuran por
 * empresa — el backend rechaza el PATCH con `NOTIFICATION_EVENT_NOT_CONFIGURABLE`
 * —, así que ni se muestran.
 */
export function groupEvents(events: NotificationEventSetting[]): EventGroup[] {
  const company = events.filter((e) => e.audience === 'company')
  return [
    {
      key: 'digest',
      title: 'Resumen a la empresa',
      note: null,
      events: company.filter((e) => e.family === 'digest'),
    },
    {
      key: 'alert',
      title: 'Alertas inmediatas',
      // NOTIFICACIONES §2.5 y §19 (fase 7): qué las dispara y quién las
      // recibe. Quiénes son hoy lo lista la pantalla, de `alert_recipients`.
      note:
        'Salen apenas pasa el hecho, a cualquier hora: una venta anulada, un descuento por encima del umbral (en una venta o en un abono), ' +
        `un retiro de capital del dueño y una caja reabierta. Las recibe quien tenga el permiso ${ALERTS_PERMISSION_LABEL} (Identidad → Roles), ` +
        'menos quien hizo el acto: esa persona ya lo sabe.',
      events: company.filter((e) => e.family !== 'digest'),
    },
    {
      key: 'customer',
      title: 'Avisos al cliente',
      note:
        'Todavía no se envían, aunque los enciendas: la app aún no registra con qué base legal aceptó cada cliente recibir correos (Ley 1581), ' +
        'y un aviso sin esa base queda «Suprimido». Están acá para que encenderlos después sea una casilla y no un desarrollo.',
      events: events.filter((e) => e.audience === 'customer'),
    },
  ].filter((g) => g.events.length > 0) as EventGroup[]
}
