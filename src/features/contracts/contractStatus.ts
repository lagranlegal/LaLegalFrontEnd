import { addMonthsToDateOnly, formatDate, formatDateTime, todayBogota } from '@/lib/dates'
import { formatCOP } from '@/lib/money'
import type { Contract } from '@/features/contracts/api'

/**
 * `"ready_for_auction"` NO es un valor real de `ContractOut.status` — el
 * backend solo persiste `active|in_arrears|in_extension|auctioned|paid`
 * (confirmado contra `docs/pending/API_GUIDE.md` §7). "Listo para remate" es
 * un CONTRATO EN `in_extension` cuya prórroga (`extension_ends_at`) ya
 * venció — se consulta con el endpoint dedicado `GET
 * /contracts/ready-for-auction`, nunca con `GET /contracts?status=...`.
 *
 * **Bug real corregido acá:** tanto `ContractDetailPage` (condición del
 * botón "Rematar") como `ContractsListPage` (tab "Listos para remate", que
 * mandaba `status=ready_for_auction` a `GET /contracts` — un valor que ese
 * filtro nunca va a encontrar) asumían `status === 'ready_for_auction'`
 * como si fuera un estado real. Como TypeScript tipa `status` como `string`
 * pelado (sin enum), nunca lo iba a atrapar — solo se encontró probando
 * contra un contrato real en `in_extension` vencido.
 */
export function isReadyForAuction(contract: Pick<Contract, 'status' | 'extension_ends_at'>): boolean {
  if (contract.status !== 'in_extension' || !contract.extension_ends_at) return false
  return contract.extension_ends_at < todayBogota()
}

/** Para `StatusBadge`: muestra "Listo para remate" en vez de "Prórroga" una vez vencida — mismo criterio visual que ya esperaba `STATUS_LABELS`. */
export function effectiveContractStatus(contract: Pick<Contract, 'status' | 'extension_ends_at'>): string {
  return isReadyForAuction(contract) ? 'ready_for_auction' : contract.status
}

/** El tono de la tarjeta de estado: el mismo semántico que la pastilla del estado. */
export type HeroTone = 'danger' | 'warning' | 'success' | 'info' | 'neutral'

export interface HeroFigure {
  label: string
  value: string
  /** La cifra que se pregunta primero («Para ponerse al día»). */
  big?: boolean
}

export interface HeroPoint {
  label: string
  date: string
  /** `done`: cubierto por lo pagado; `now`: hoy; `pending`: lo que falta. */
  state: 'done' | 'now' | 'pending'
}

export interface StatusHero {
  /** El estado efectivo (`ready_for_auction` incluido): decide el ícono. */
  status: string
  tone: HeroTone
  title: string
  detail: string | null
  figures: HeroFigure[]
  /** Puntos en orden de fecha; `null` en un contrato cerrado. */
  timeline: HeroPoint[] | null
  /** Un tramo entre cada par de puntos: `late` es lo adeudado (se pinta con el tono). */
  segments: ('done' | 'late' | 'pending')[]
}

type HeroContract = Pick<Contract, 'status' | 'extension_ends_at' | 'interest_paid_until' | 'start_date' | 'due_date'>
type HeroQuote = { months_owed: number; payoff_total: string; options: { months: number; interest_amount: string }[] }

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})/

function daysBetween(from: string, to: string): number {
  const a = DATE_ONLY.exec(from)
  const b = DATE_ONLY.exec(to)
  if (!a || !b) return 0
  const ms = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3])) - Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]))
  return Math.round(ms / 86_400_000)
}
/**
 * Cuánto cuesta quedar al día: la opción de `payment-options` que cubre
 * exactamente los meses adeudados. Si el backend no la ofrece, `null`: la
 * cifra no se inventa.
 */
export function catchUpOption<T extends { months: number }>(quote: { months_owed: number; options: T[] } | null | undefined): T | null {
  if (!quote || quote.months_owed <= 0) return null
  return quote.options.find((o) => o.months === quote.months_owed) ?? null
}

/**
 * La tarjeta de estado del detalle (F9-16, rediseño P2-a): el titular, las
 * cifras que el cliente pregunta y la línea de tiempo. Las cifras salen de
 * `payment-options` (nunca se calculan aquí); si falta la cotización, se
 * omiten. Los días cuentan con la fecha de la empresa (`today`, de
 * `todayBogota()`).
 *
 * La mora empieza al cumplirse el primer mes adeudado (`rules.months_between`
 * pasa de 0 a 1): `interest_paid_until` + 1 mes, con el recorte de fin de mes
 * de `rules.add_months`. `interest_paid_until` es solo el inicio del mes sin
 * pagar; contar desde ahí diría «en mora» desde el día en que se firmó.
 */
export function contractStatusHero(
  contract: HeroContract,
  { quote, today, settlement }: { quote?: HeroQuote | null; today: string; settlement?: { settled_at: string; receipt_number: number } | null },
): StatusHero {
  const status = effectiveContractStatus(contract)
  const paidUntil = `Interés pagado hasta ${formatDate(contract.interest_paid_until)}`
  const closed = (tone: HeroTone, title: string, detail: string | null): StatusHero => ({
    status,
    tone,
    title,
    detail,
    figures: [],
    timeline: null,
    segments: [],
  })

  if (status === 'paid') {
    return closed('info', 'Pagado', settlement ? `Saldado el ${formatDateTime(settlement.settled_at)} · recibo #${settlement.receipt_number}` : null)
  }
  if (status === 'auctioned') return closed('neutral', 'Rematado', 'Las prendas pasaron a inventario.')
  if (status === 'superseded') return closed('neutral', 'Ampliado', 'La deuda pasó a otro contrato: este ya no es la obligación vigente.')

  let tone: HeroTone
  let title: string
  let detail: string
  let end = contract.due_date
  let endLabel = 'Fin'
  if (status === 'ready_for_auction') {
    tone = 'danger'
    title = 'Listo para remate'
    detail = `La prórroga terminó el ${formatDate(contract.extension_ends_at ?? '')} · ${paidUntil.charAt(0).toLowerCase()}${paidUntil.slice(1)}`
    end = contract.extension_ends_at ?? contract.due_date
    endLabel = 'Fin de la prórroga'
  } else if (status === 'in_extension') {
    tone = 'warning'
    title = contract.extension_ends_at ? `En prórroga hasta el ${formatDate(contract.extension_ends_at)}` : 'En prórroga'
    detail = `${paidUntil} · después queda listo para remate`
    if (contract.extension_ends_at) {
      end = contract.extension_ends_at
      endLabel = 'Fin de la prórroga'
    }
  } else if (status === 'in_arrears') {
    tone = 'danger'
    const days = daysBetween(addMonthsToDateOnly(contract.interest_paid_until, 1), today)
    title = days <= 0 ? 'En mora desde hoy' : `En mora hace ${days} ${days === 1 ? 'día' : 'días'}`
    detail = paidUntil
  } else {
    tone = 'success'
    title = 'Vigente'
    detail = paidUntil
  }

  const figures: HeroFigure[] = []
  const catchUp = catchUpOption(quote)
  if (catchUp) figures.push({ label: 'Para ponerse al día', value: formatCOP(catchUp.interest_amount), big: true })
  if (quote) figures.push({ label: 'Para saldar hoy', value: formatCOP(quote.payoff_total) })
  figures.push({ label: endLabel, value: formatDate(end) })

  // Los puntos, en orden de fecha (en una prórroga «Hoy» puede pasar el fin
  // del plazo). «Pagado» se omite si es la fecha de inicio: sin abonos no hay
  // nada pagado que marcar.
  const paid = contract.interest_paid_until
  const raw: { label: string; date: string; now?: boolean }[] = [{ label: 'Inicio', date: contract.start_date }]
  if (paid !== contract.start_date) raw.push({ label: 'Pagado', date: paid })
  raw.push({ label: 'Hoy', date: today, now: true })
  raw.push({ label: endLabel, date: end })
  const points = raw
    .map((p, i) => ({ ...p, i }))
    .sort((a, b) => (a.date === b.date ? a.i - b.i : a.date < b.date ? -1 : 1))
  const timeline: HeroPoint[] = points.map((p) => ({
    label: p.label,
    date: p.date,
    state: p.now ? 'now' : p.date <= paid ? 'done' : 'pending',
  }))
  const owes = tone === 'danger' || tone === 'warning'
  const segments = points.slice(1).map((p, k) => {
    const from = points[k]!.date
    if (p.date <= paid) return 'done' as const
    if (owes && from >= paid && p.date <= today) return 'late' as const
    return 'pending' as const
  })

  return { status, tone, title, detail, figures, timeline, segments }
}
