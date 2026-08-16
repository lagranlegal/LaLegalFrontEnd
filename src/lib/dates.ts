import { format } from 'date-fns'
import { tz } from '@date-fns/tz'

/**
 * Fechas = zona horaria de la empresa, sin excepciones (docs/ARCHITECTURE.md
 * §7, CLAUDE.md regla 6). El backend ya sufrió el bug de la ventana de 5
 * horas diarias (7pm–medianoche) por calcular "hoy" en UTC — el front no lo
 * repite: toda fecha pasa por este módulo, nunca por `new Date()` pelado,
 * `toISOString().slice(0,10)` o `toLocaleDateString()` sin tz explícita.
 */
export const BOGOTA_TZ = 'America/Bogota'

let activeTimezone: string = BOGOTA_TZ

/**
 * El bootstrap de sesión (`GET /me`) llama esto con `company.timezone` tras
 * cargar — hasta entonces, `BOGOTA_TZ` es el fallback (§7).
 */
export function setActiveTimezone(timezone: string): void {
  activeTimezone = timezone
}

export function getActiveTimezone(): string {
  return activeTimezone
}

/** "Hoy" en la zona de la empresa, como `yyyy-MM-dd` — para comparar contra `session_date`, defaults de filtros, etc. */
export function todayBogota(): string {
  return format(new Date(), 'yyyy-MM-dd', { in: tz(activeTimezone) })
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Fechas-sin-hora de la API (vencimientos, `session_date`: `"2026-08-15"`)
 * se muestran tal cual, SIN pasarlas por `Date` — evita el corrimiento de un
 * día por UTC que un `new Date("2026-08-15")` + formateo local produciría.
 */
export function formatDate(dateOnly: string): string {
  const match = DATE_ONLY_RE.exec(dateOnly)
  if (!match) {
    throw new Error(`formatDate: se esperaba "yyyy-MM-dd", llegó ${JSON.stringify(dateOnly)}`)
  }
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/**
 * Timestamps con hora (`created_at`, `updated_at`…) se convierten a la zona
 * de la empresa y se formatean `dd/MM/yyyy h:mm a`.
 */
export function formatDateTime(timestamp: string | Date): string {
  return format(timestamp, 'dd/MM/yyyy h:mm a', { in: tz(activeTimezone) })
}

/** Solo la hora (`h:mm a`), en la zona de la empresa — ej. "caja abierta desde las 6:30 PM". */
export function formatTime(timestamp: string | Date): string {
  return format(timestamp, 'h:mm a', { in: tz(activeTimezone) })
}
