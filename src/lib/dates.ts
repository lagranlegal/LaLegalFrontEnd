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
 * `dd/MM`, sin año — para ejes de gráficas donde la fecha se repite en cada
 * punto y el año es ruido: el rango ya está escrito arriba, en el selector.
 * Mismo tratamiento sin `Date` que `formatDate`, por el mismo motivo.
 */
export function formatDateShort(dateOnly: string): string {
  const match = DATE_ONLY_RE.exec(dateOnly)
  if (!match) {
    throw new Error(`formatDateShort: se esperaba "yyyy-MM-dd", llegó ${JSON.stringify(dateOnly)}`)
  }
  const [, , month, day] = match
  return `${day}/${month}`
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

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  return month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 31)
}

/**
 * Suma meses a una fecha-sin-hora por aritmética de enteros (año/mes/día),
 * nunca por `Date` — evita cualquier riesgo de timezone en algo que es puro
 * calendario. Recorta el día al último válido del mes de destino (ej.
 * `2026-01-31` + 1 mes → `2026-02-28`, no `2026-03-03`).
 *
 * Se construyó para el import de contratos preexistentes (paso 5b,
 * `docs/RECOMENDACIONES.md` §1.6): en vez de dos date pickers libres para
 * `start_date`/`interest_paid_until` (que el backend puede rechazar con
 * `IMPORT_DATES_MISALIGNED` si no caen en un múltiplo entero de meses), el
 * form pide "N meses ya cubiertos" y calcula la segunda fecha con esto —
 * la combinación inválida queda estructuralmente imposible de construir.
 */
export function addMonthsToDateOnly(dateOnly: string, months: number): string {
  const match = DATE_ONLY_RE.exec(dateOnly)
  if (!match) {
    throw new Error(`addMonthsToDateOnly: se esperaba "yyyy-MM-dd", llegó ${JSON.stringify(dateOnly)}`)
  }
  const [, yearStr, monthStr, dayStr] = match
  const totalMonths = Number(yearStr) * 12 + (Number(monthStr) - 1) + months
  const year = Math.floor(totalMonths / 12)
  const month = (totalMonths % 12) + 1
  const day = Math.min(Number(dayStr), daysInMonth(year, month))
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
