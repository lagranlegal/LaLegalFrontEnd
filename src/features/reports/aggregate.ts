import { sumMoney } from '@/lib/money'
import type { Expense, ExpenseCategory } from '@/features/cashbox/api'
import type { components } from '@/types/api'

export type ClosingsBreakdownLine = components['schemas']['ClosingsBreakdownLineOut']
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
//
// `purchase` (compra a proveedor) queda FUERA de los gastos por la misma
// razón que `loan_disbursed`: comprar mercancía no es un gasto, es convertir
// efectivo en inventario — un activo. El costo se vuelve gasto (costo de
// ventas) cuando el artículo SE VENDE, no cuando se compra. Meterlo acá haría
// que un mes con mucha compra pareciera un mes de pérdida.
/** Movimiento sin medio de pago: plata que solo cambió de cuenta. */
export const INTER_ACCOUNT = 'inter_account'

// AQUÍ NO SE CALCULA LA UTILIDAD, a propósito. Hubo un campo
// `utilidadOperativa` que hacía `ingresosOperativos − gastosOperativos` y
// NUNCA restaba el costo de ventas: una cadena vendida en 500.000 que costó
// 300.000 contaba como 500.000 de utilidad. Peor, convivía en la misma
// pantalla con "Utilidad bruta de tienda", que sí lo restaba.
//
// La utilidad vive ahora en `GET /reports/income-statement`, que sale de los
// DOCUMENTOS: incluye lo de hoy (el desglose de caja solo cubre sesiones
// cerradas) y cuenta bien las ventas a crédito, que son ingreso aunque la
// plata no haya entrado. Este módulo agrega movimientos de caja para las
// gráficas y los desgloses — no para responder "cuánto gané".
const REVENUE_CONCEPTS = new Set(['interest_payment', 'sale'])
const EXPENSE_CONCEPTS = new Set(['expense'])

/**
 * Traslados entre cuentas propias (00032): consignar el efectivo del día.
 *
 * Se EXCLUYEN de todo agregado financiero, y hay dos niveles de exclusión que
 * conviene no confundir:
 *
 *  · De ingresos y gastos operativos ya quedaban fuera solos, porque
 *    `REVENUE_CONCEPTS`/`EXPENSE_CONCEPTS` son listas de permitidos. Bien.
 *  · Del FLUJO (`flujoEntradas`/`flujoSalidas`) hay que sacarlos a mano, y es
 *    el motivo de esta constante. Un traslado genera un `out` y un `in` por el
 *    mismo monto, así que consignar un millón inflaría los dos lados en un
 *    millón sin que haya entrado ni salido un peso del negocio. Es la misma
 *    eliminación que hace cualquier estado de flujo de efectivo con los
 *    movimientos entre cuentas propias: la plata no se movió, cambió de
 *    bolsillo.
 *
 * OJO — esto NO afecta el arqueo. El efectivo esperado del cierre lo calcula
 * el backend por tipo de cuenta y ahí el traslado SÍ cuenta, que es lo
 * correcto: si consignaste, esos billetes ya no están en el cajón.
 */
const TRANSFER_CONCEPTS = new Set(['transfer_in', 'transfer_out'])

export interface FinancialSummary {
  sessionCount: number
  /** Ingreso operativo real: intereses cobrados + ventas. NO incluye capital recuperado. */
  ingresosOperativos: string
  /** Gasto operativo real: `concept: 'expense'`. NO incluye capital desembolsado (préstamos). */
  gastosOperativos: string
  /** Intereses cobrados (`concept: 'interest_payment'`, `direction: 'in'`) — subconjunto de ingresosOperativos. */
  intereses: string
  /** Ventas (`concept: 'sale'`, `direction: 'in'`) — subconjunto de ingresosOperativos. */
  ventas: string
  /** Capital abonado/recuperado (`concept: 'capital_payment'`, `direction: 'in'`) — movimiento de cartera, NO ingreso. */
  capitalAbonado: string
  /** Capital desembolsado — préstamos nuevos entregados (`concept: 'loan_disbursed'`, `direction: 'out'`) — movimiento de cartera, NO gasto. */
  capitalDesembolsado: string
  /** Compras a proveedor (`concept: 'purchase'`, `direction: 'out'`) — inversión en inventario, NO gasto: el efectivo se convierte en mercancía. */
  comprasInventario: string
  /** Todo el efectivo que entró/salió en el rango, incluyendo capital — "cuánta plata se movió", distinto de la utilidad. */
  flujoEntradas: string
  flujoSalidas: string
  /** Ingreso operativo por módulo (intereses del empeño vs ventas de tienda) — base del % Empeño/Tienda. */
  ingresosOperativosByModule: Record<Module, string>
  /** Ingreso OPERATIVO por medio de pago — NO todo lo que entra (eso incluiría capital abonado, inflando el total frente a `ingresosOperativos`). */
  ingresosOperativosByPaymentMethod: { paymentMethod: string; total: string }[]
  /** Desglose módulo×concepto×medio×dirección, sumado a través de TODAS las sesiones del rango (no una fila por sesión). */
  totalsByConcept: ConceptTotal[]
  /** Ingreso/gasto OPERATIVO por día de sesión, para la gráfica de tendencia (mismo criterio que los KPIs de arriba, no flujo de caja crudo). */
  byDay: DayTotal[]
}

/**
 * Agrega el desglose (`ClosingsBreakdownLineOut[]`, `GET /reports/closings-breakdown`)
 * de TODAS las sesiones de caja cerradas de un rango, ya sumado por el
 * backend en una sola consulta — pura suma de PRESENTACIÓN sobre montos que
 * YA calculó el backend (`sumMoney`, decimal-safe, CLAUDE.md regla 5); no
 * inventa ninguna regla de negocio. Función pura y testeable — sin red, sin
 * React Query acá (ver `features/reports/api.ts` para el hook que la envuelve).
 *
 * `sessionDates` es la lista de fechas de TODAS las sesiones cerradas del
 * rango (`GET /reports/closings`, pedido aparte) — no se puede derivar solo
 * de `lines`, porque una sesión sin ningún movimiento no deja ninguna línea
 * y aun así cuenta para `sessionCount` y necesita su entrada en `byDay`.
 *
 * Distingue P&L (ingresos/gastos operativos) de movimiento de capital
 * (desembolsos/abonos) — mezclarlos daría una "utilidad" que en realidad
 * mide cuánto se prestó, no cuánto ganó el negocio.
 */
export function aggregateFinancialSummary(lines: ClosingsBreakdownLine[], sessionDates: string[], moduleFilter?: Module): FinancialSummary {
  const conceptMap = new Map<string, ConceptTotal>()
  const dayMap = new Map<string, { ingresos: string; gastos: string }>()
  const moduleRevenue: Record<Module, string> = { pawn: '0.00', store: '0.00', general: '0.00' }
  const paymentMethodRevenue = new Map<string, string>()

  let ingresosOperativos = '0.00'
  let gastosOperativos = '0.00'
  let intereses = '0.00'
  let capitalAbonado = '0.00'
  let capitalDesembolsado = '0.00'
  let comprasInventario = '0.00'
  let ventas = '0.00'
  let flujoEntradas = '0.00'
  let flujoSalidas = '0.00'

  function addLine(line: ClosingsBreakdownLine) {
    const sessionDate = line.session_date
    if (moduleFilter && line.module !== moduleFilter) return
    // `payment_method` es opcional desde 00027: un movimiento entre cuentas
    // (liquidar un convenio) no se cobró por ningún medio, solo cambió de
    // contenedor. Se agrupa bajo su propia etiqueta en vez de caer en "Otro",
    // que ya significa otra cosa.
    const paymentMethod = line.payment_method ?? INTER_ACCOUNT
    const key = `${line.module}|${line.concept}|${paymentMethod}|${line.direction}`
    const existing = conceptMap.get(key)
    conceptMap.set(key, {
      module: line.module,
      concept: line.concept,
      paymentMethod,
      direction: line.direction as 'in' | 'out',
      total: sumMoney(existing?.total, line.total),
    })

    const day = dayMap.get(sessionDate) ?? { ingresos: '0.00', gastos: '0.00' }
    const isRevenue = line.direction === 'in' && REVENUE_CONCEPTS.has(line.concept)
    const isExpense = line.direction === 'out' && EXPENSE_CONCEPTS.has(line.concept)

    // QUÉ CUENTA COMO FLUJO. Dos exclusiones, por razones distintas:
    //
    // 1. Un TRASLADO es la misma plata en otro bolsillo: sumarlo inflaría
    //    entradas y salidas por el mismo monto sin que el negocio hubiera
    //    recibido ni pagado nada.
    //
    // 2. Una cuenta POR COBRAR no tiene plata. La migración 00024 lo dice
    //    literal: "settlement — el dinero NO está: alguien te lo debe". Una
    //    venta con Sistecrédito se registraba como entrada de flujo aunque no
    //    hubiera entrado un peso, y al liquidarla se contaba OTRA VEZ al
    //    llegar al banco — el mismo millón, dos veces. Y la salida de la
    //    cuenta por cobrar inflaba las salidas sin que saliera nada de
    //    ningún lado.
    //
    //    Se filtra por TIPO DE CUENTA y no por concepto porque el tipo es lo
    //    que de verdad determina si hay plata ahí — y así funciona igual para
    //    los movimientos históricos, que quedaron con `concept='adjustment'`
    //    antes de 00038.
    //
    // El resultado es el correcto y se acomoda solo: la venta a crédito no es
    // flujo, la liquidación que entra al banco SÍ lo es (ahí la plata llega
    // de verdad), y la que sale de la cuenta por cobrar no.
    const isTransfer = TRANSFER_CONCEPTS.has(line.concept)
    const isReceivable = line.account_type === 'settlement'
    if (!isTransfer && !isReceivable) {
      if (line.direction === 'in') flujoEntradas = sumMoney(flujoEntradas, line.total)
      else flujoSalidas = sumMoney(flujoSalidas, line.total)
    }

    if (isRevenue) {
      day.ingresos = sumMoney(day.ingresos, line.total)
      ingresosOperativos = sumMoney(ingresosOperativos, line.total)
      if (line.module in moduleRevenue) moduleRevenue[line.module as Module] = sumMoney(moduleRevenue[line.module as Module], line.total)
      paymentMethodRevenue.set(paymentMethod, sumMoney(paymentMethodRevenue.get(paymentMethod), line.total))
    } else if (isExpense) {
      day.gastos = sumMoney(day.gastos, line.total)
      gastosOperativos = sumMoney(gastosOperativos, line.total)
    }
    dayMap.set(sessionDate, day)

    if (line.direction === 'in' && line.concept === 'interest_payment') intereses = sumMoney(intereses, line.total)
    if (line.direction === 'in' && line.concept === 'sale') ventas = sumMoney(ventas, line.total)
    if (line.direction === 'in' && line.concept === 'capital_payment') capitalAbonado = sumMoney(capitalAbonado, line.total)
    if (line.direction === 'out' && line.concept === 'loan_disbursed') capitalDesembolsado = sumMoney(capitalDesembolsado, line.total)
    if (line.direction === 'out' && line.concept === 'purchase') comprasInventario = sumMoney(comprasInventario, line.total)
  }

  for (const line of lines) addLine(line)
  for (const sessionDate of sessionDates) {
    if (!dayMap.has(sessionDate)) dayMap.set(sessionDate, { ingresos: '0.00', gastos: '0.00' })
  }

  const byDay = [...dayMap.entries()]
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    sessionCount: sessionDates.length,
    ingresosOperativos,
    gastosOperativos,
    intereses,
    ventas,
    capitalAbonado,
    capitalDesembolsado,
    comprasInventario,
    flujoEntradas,
    flujoSalidas,
    ingresosOperativosByModule: moduleRevenue,
    ingresosOperativosByPaymentMethod: [...paymentMethodRevenue.entries()].map(([paymentMethod, total]) => ({ paymentMethod, total })),
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

function addDaysToDateOnly(dateOnly: string, days: number): string {
  const [, y, m, d] = DATE_ONLY_RE.exec(dateOnly) ?? []
  if (!y) throw new Error(`addDaysToDateOnly: se esperaba "yyyy-MM-dd", llegó ${JSON.stringify(dateOnly)}`)
  const utc = Date.UTC(Number(y), Number(m) - 1, Number(d)) + days * 86_400_000
  const result = new Date(utc)
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, '0')}-${String(result.getUTCDate()).padStart(2, '0')}`
}

/**
 * El rango de igual duración, inmediatamente anterior a `range` — para la
 * comparación "vs período anterior" (§2 del plan v2). `daysBetweenDateOnly`
 * ya es inclusivo (mismo día = 1), así que el rango previo empieza el día
 * anterior a `range.from` y retrocede la misma cantidad de días.
 */
export function previousRangeFor(range: { from: string; to: string }): { from: string; to: string } {
  const spanDays = daysBetweenDateOnly(range.from, range.to)
  const to = addDaysToDateOnly(range.from, -1)
  const from = addDaysToDateOnly(to, -(spanDays - 1))
  return { from, to }
}

export interface Delta {
  /** `null` si no hay base de comparación (período anterior en 0) — se muestra "—", no un % sin sentido. */
  pct: number | null
  /** Si el cambio es una buena noticia para el negocio — sube ingresos = favorable, sube gastos = NO favorable. Se decide por KPI, no se asume. */
  favorable: boolean
}

/**
 * % de cambio de PRESENTACIÓN entre dos montos decimales — no decide nada
 * de negocio, solo compara dos totales que el backend ya calculó.
 */
export function computeDelta(current: string, previous: string, favorableDirection: 'up' | 'down' = 'up'): Delta {
  const currentAmount = Number(current)
  const previousAmount = Number(previous)
  if (previousAmount === 0) return { pct: null, favorable: currentAmount >= 0 }
  const pct = ((currentAmount - previousAmount) / Math.abs(previousAmount)) * 100
  const wentUp = currentAmount > previousAmount
  const favorable = pct === 0 ? true : favorableDirection === 'up' ? wentUp : !wentUp
  return { pct, favorable }
}

export interface CategoryExpenseTotal {
  categoryId: string
  name: string
  total: string
}

/**
 * Gastos agrupados por categoría (`ExpenseOut.category_id`) — dimensión que
 * NO viene en `BreakdownLineOut` (ese solo trae módulo×concepto×medio), hace
 * falta `GET /cashbox/expenses` por sesión aparte (ver `features/reports/api.ts`).
 * Pura, testeable — resuelve el nombre contra `GET /cashbox/expense-categories`
 * (ya cacheado por `useExpenseCategories`), cae en "Sin categoría" si no matchea.
 */
export function aggregateExpensesByCategory(expenses: Expense[], categories: ExpenseCategory[]): CategoryExpenseTotal[] {
  const nameById = new Map(categories.map((c) => [c.id, c.name]))
  const totals = new Map<string, string>()
  for (const expense of expenses) {
    totals.set(expense.category_id, sumMoney(totals.get(expense.category_id), expense.amount))
  }
  return [...totals.entries()]
    .map(([categoryId, total]) => ({ categoryId, name: nameById.get(categoryId) ?? 'Sin categoría', total }))
    .sort((a, b) => Number(b.total) - Number(a.total))
}
