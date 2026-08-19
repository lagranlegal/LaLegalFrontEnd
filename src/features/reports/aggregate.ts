import { subtractMoney, sumMoney } from '@/lib/money'
import type { SessionReport } from '@/features/cashbox/api'

type BreakdownLine = SessionReport['lines'][number]
type Module = 'pawn' | 'store' | 'general'

export interface ConceptTotal {
  module: string
  concept: string
  paymentMethod: string
  direction: 'in' | 'out'
  total: string
}

export interface DayTotal {
  date: string
  ingresos: string
  gastos: string
}

// Conceptos que SÍ son utilidad/pérdida real (P&L) — un préstamo entregado
// no es un gasto (se convierte en cartera, un activo) y el capital recuperado
// no es ingreso (solo reduce esa cartera) — mezclarlos con intereses/ventas/
// gastos reales daría una "utilidad" falsa. Ver docs/IMPLEMENTATION.md.
const REVENUE_CONCEPTS = new Set(['interest_payment', 'sale'])
const EXPENSE_CONCEPTS = new Set(['expense'])

export interface FinancialSummary {
  sessionCount: number
  /** Ingreso operativo real: intereses cobrados + ventas. NO incluye capital recuperado. */
  ingresosOperativos: string
  /** Gasto operativo real: `concept: 'expense'`. NO incluye capital desembolsado (préstamos). */
  gastosOperativos: string
  /** `ingresosOperativos − gastosOperativos` — utilidad del período, no confundir con flujo de caja. */
  utilidadOperativa: string
  /** Intereses cobrados (`concept: 'interest_payment'`, `direction: 'in'`) — subconjunto de ingresosOperativos. */
  intereses: string
  /** Ventas (`concept: 'sale'`, `direction: 'in'`) — subconjunto de ingresosOperativos. */
  ventas: string
  /** Capital abonado/recuperado (`concept: 'capital_payment'`, `direction: 'in'`) — movimiento de cartera, NO ingreso. */
  capitalAbonado: string
  /** Capital desembolsado — préstamos nuevos entregados (`concept: 'loan_disbursed'`, `direction: 'out'`) — movimiento de cartera, NO gasto. */
  capitalDesembolsado: string
  /** Todo el efectivo que entró/salió en el rango, incluyendo capital — "cuánta plata se movió", distinto de la utilidad. */
  flujoEntradas: string
  flujoSalidas: string
  /** Ingreso operativo por módulo (intereses del empeño vs ventas de tienda) — base del % Empeño/Tienda. */
  ingresosOperativosByModule: Record<Module, string>
  /** Desglose módulo×concepto×medio×dirección, sumado a través de TODAS las sesiones del rango (no una fila por sesión). */
  totalsByConcept: ConceptTotal[]
  /** Ingreso/gasto OPERATIVO por día de sesión, para la gráfica de tendencia (mismo criterio que los KPIs de arriba, no flujo de caja crudo). */
  byDay: DayTotal[]
}

/**
 * Agrega el desglose (`BreakdownLineOut[]`) de N sesiones de caja cerradas
 * en un rango — pura suma de PRESENTACIÓN sobre montos que YA calculó el
 * backend (`sumMoney`, decimal-safe, CLAUDE.md regla 5); no inventa ninguna
 * regla de negocio, solo suma lo que cada `GET /cashbox/sessions/{id}/report`
 * ya trae. Función pura y testeable — sin red, sin React Query acá
 * (ver `features/reports/api.ts` para el hook que la envuelve).
 *
 * Distingue P&L (ingresos/gastos operativos) de movimiento de capital
 * (desembolsos/abonos) — mezclarlos daría una "utilidad" que en realidad
 * mide cuánto se prestó, no cuánto ganó el negocio.
 */
export function aggregateFinancialSummary(sessions: { sessionDate: string; report: SessionReport }[]): FinancialSummary {
  const conceptMap = new Map<string, ConceptTotal>()
  const dayMap = new Map<string, { ingresos: string; gastos: string }>()
  const moduleRevenue: Record<Module, string> = { pawn: '0.00', store: '0.00', general: '0.00' }

  let ingresosOperativos = '0.00'
  let gastosOperativos = '0.00'
  let intereses = '0.00'
  let capitalAbonado = '0.00'
  let capitalDesembolsado = '0.00'
  let ventas = '0.00'
  let flujoEntradas = '0.00'
  let flujoSalidas = '0.00'

  function addLine(sessionDate: string, line: BreakdownLine) {
    const key = `${line.module}|${line.concept}|${line.payment_method}|${line.direction}`
    const existing = conceptMap.get(key)
    conceptMap.set(key, {
      module: line.module,
      concept: line.concept,
      paymentMethod: line.payment_method,
      direction: line.direction as 'in' | 'out',
      total: sumMoney(existing?.total, line.total),
    })

    const day = dayMap.get(sessionDate) ?? { ingresos: '0.00', gastos: '0.00' }
    const isRevenue = line.direction === 'in' && REVENUE_CONCEPTS.has(line.concept)
    const isExpense = line.direction === 'out' && EXPENSE_CONCEPTS.has(line.concept)

    if (line.direction === 'in') flujoEntradas = sumMoney(flujoEntradas, line.total)
    else flujoSalidas = sumMoney(flujoSalidas, line.total)

    if (isRevenue) {
      day.ingresos = sumMoney(day.ingresos, line.total)
      ingresosOperativos = sumMoney(ingresosOperativos, line.total)
      if (line.module in moduleRevenue) moduleRevenue[line.module as Module] = sumMoney(moduleRevenue[line.module as Module], line.total)
    } else if (isExpense) {
      day.gastos = sumMoney(day.gastos, line.total)
      gastosOperativos = sumMoney(gastosOperativos, line.total)
    }
    dayMap.set(sessionDate, day)

    if (line.direction === 'in' && line.concept === 'interest_payment') intereses = sumMoney(intereses, line.total)
    if (line.direction === 'in' && line.concept === 'sale') ventas = sumMoney(ventas, line.total)
    if (line.direction === 'in' && line.concept === 'capital_payment') capitalAbonado = sumMoney(capitalAbonado, line.total)
    if (line.direction === 'out' && line.concept === 'loan_disbursed') capitalDesembolsado = sumMoney(capitalDesembolsado, line.total)
  }

  for (const { sessionDate, report } of sessions) {
    for (const line of report.lines) addLine(sessionDate, line)
    if (!dayMap.has(sessionDate)) dayMap.set(sessionDate, { ingresos: '0.00', gastos: '0.00' })
  }

  const byDay = [...dayMap.entries()]
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    sessionCount: sessions.length,
    ingresosOperativos,
    gastosOperativos,
    utilidadOperativa: subtractMoney(ingresosOperativos, gastosOperativos),
    intereses,
    ventas,
    capitalAbonado,
    capitalDesembolsado,
    flujoEntradas,
    flujoSalidas,
    ingresosOperativosByModule: moduleRevenue,
    totalsByConcept: [...conceptMap.values()],
    byDay,
  }
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Días de calendario entre dos fechas-sin-hora (`"yyyy-MM-dd"`), inclusive.
 * `Date.UTC` acá es seguro (no `new Date(string)` pelado, CLAUDE.md regla 6):
 * ambos operandos son anclas UTC de medianoche de la MISMA fecha calendario
 * en ambos lados — es aritmética de calendario pura, no interpretación de
 * "ahora" en una zona horaria. Usado solo para el tope de 90 días del rango.
 */
export function daysBetweenDateOnly(from: string, to: string): number {
  const [, fy, fm, fd] = DATE_ONLY_RE.exec(from) ?? []
  const [, ty, tm, td] = DATE_ONLY_RE.exec(to) ?? []
  if (!fy || !ty) throw new Error(`daysBetweenDateOnly: se esperaba "yyyy-MM-dd", llegó ${JSON.stringify({ from, to })}`)
  const fromUtc = Date.UTC(Number(fy), Number(fm) - 1, Number(fd))
  const toUtc = Date.UTC(Number(ty), Number(tm) - 1, Number(td))
  return Math.round((toUtc - fromUtc) / 86_400_000) + 1
}
