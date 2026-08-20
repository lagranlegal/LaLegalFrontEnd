import { sumMoney, subtractMoney } from '@/lib/money'
import type { Contract } from '@/features/contracts/api'
import type { Payment } from '@/features/contracts/api'

export interface ContractMetrics {
  /** Intereses efectivamente cobrados en este contrato. Es lo que el préstamo ha GENERADO. */
  interesesCobrados: string
  /** Capital devuelto por el cliente — reduce la deuda, NO es ganancia. */
  capitalRecuperado: string
  /** Descuentos de interés otorgados: interés que se dejó de cobrar. */
  descuentos: string
  /** Todo lo que ha entrado por este contrato (interés + capital). */
  totalCobrado: string
  /** Capital que sigue prestado hoy. */
  saldoCapital: string
  /**
   * Rendimiento del préstamo: intereses cobrados sobre el capital prestado.
   * Responde "¿cuánto me ha rendido esta plata?". `null` si el principal es 0.
   */
  rendimientoPct: number | null
  /** Porcentaje del capital ya devuelto. `null` si el principal es 0. */
  capitalRecuperadoPct: number | null
  /** Interés que genera el saldo actual cada mes, con la tasa del contrato. */
  interesMensualActual: string
  cantidadAbonos: number
}

/**
 * Métricas de UN contrato, calculadas desde sus abonos.
 *
 * Todo sale de datos que ya vienen de la API — no hay endpoint nuevo detrás.
 * Es suma de PRESENTACIÓN sobre montos que el backend ya calculó, con
 * `sumMoney` (decimal-safe): acá no se inventa ninguna regla de negocio, ni
 * se recalculan intereses.
 *
 * OJO con la distinción que estas métricas hacen visible: los intereses son
 * INGRESO y el capital recuperado NO lo es — solo reduce la deuda. Un
 * contrato de $1.000.000 que devolvió todo el capital y pagó $150.000 de
 * interés no "generó $1.150.000": generó $150.000. Confundirlos es el mismo
 * error de modelado que ya se corrigió dos veces en /reportes.
 */
export function computeContractMetrics(contract: Contract, payments: Payment[]): ContractMetrics {
  const interesesCobrados = sumMoney(...payments.map((p) => p.interest_amount))
  const capitalRecuperado = sumMoney(...payments.map((p) => p.capital_amount))
  const descuentos = sumMoney(...payments.map((p) => p.discount_amount))
  const totalCobrado = sumMoney(interesesCobrados, capitalRecuperado)

  const principal = Number(contract.principal)
  const saldo = Number(contract.capital_balance)

  return {
    interesesCobrados,
    capitalRecuperado,
    descuentos,
    totalCobrado,
    saldoCapital: contract.capital_balance,
    rendimientoPct: principal > 0 ? (Number(interesesCobrados) / principal) * 100 : null,
    capitalRecuperadoPct: principal > 0 ? ((principal - saldo) / principal) * 100 : null,
    // Interés del PRÓXIMO mes con el saldo de hoy: la tasa se aplica sobre el
    // capital actual, no sobre el original (regla del contrato, CONTEXTO.md).
    interesMensualActual: multiplyPct(contract.capital_balance, contract.interest_rate_pct),
    cantidadAbonos: payments.length,
  }
}

/** `monto * pct / 100` en centavos enteros, sin pasar por float. */
function multiplyPct(amount: string, pct: string): string {
  const cents = Math.round(Number(amount) * 100)
  const result = Math.round((cents * Number(pct)) / 100)
  return (result / 100).toFixed(2)
}

export interface BalancePoint {
  date: string
  /** Saldo de capital DESPUÉS de ese abono. */
  saldo: string
}

/**
 * Evolución del saldo de capital, para la gráfica.
 *
 * Arranca en el `start_date` con el principal completo y agrega un punto por
 * abono usando `new_capital_balance` — el saldo que el BACKEND calculó en ese
 * momento, no uno reconstruido acá. Así la curva no puede divergir de la
 * verdad aunque cambie alguna regla de cálculo.
 *
 * Los abonos vienen del más reciente al más antiguo (así los lista la API),
 * por eso se invierten: una gráfica de evolución se lee hacia adelante.
 */
export function buildBalanceHistory(contract: Contract, payments: Payment[]): BalancePoint[] {
  const puntos: BalancePoint[] = [{ date: contract.start_date, saldo: contract.principal }]
  const cronologicos = [...payments].sort((a, b) => a.paid_at.localeCompare(b.paid_at))
  for (const p of cronologicos) {
    puntos.push({ date: p.paid_at.slice(0, 10), saldo: p.new_capital_balance })
  }
  return puntos
}

/**
 * Cuánto del total cobrado fue interés y cuánto capital — para la dona.
 * Son dos cosas de naturaleza distinta (ingreso vs devolución de un activo),
 * y verlas juntas es justamente lo que aclara que no toda la plata que entró
 * por un contrato es ganancia.
 */
export function splitCollected(metrics: ContractMetrics): { interes: number; capital: number } {
  return {
    interes: Number(metrics.interesesCobrados),
    capital: Number(metrics.capitalRecuperado),
  }
}

/**
 * Días transcurridos desde que arrancó el contrato.
 *
 * Se parsea a mano en vez de `new Date(string)` porque el constructor
 * interpreta `"2026-05-01"` como UTC y `"2026-05-01T00:00"` como hora local:
 * en Bogotá (UTC-5) eso desplaza el día y la cuenta sale con un día de menos.
 * Es la misma trampa que `lib/dates.ts` evita en toda la app.
 */
export function daysSinceStart(startDate: string, today: string): number {
  const a = parseDateOnly(startDate)
  const b = parseDateOnly(today)
  if (a === null || b === null) return 0
  return Math.round((b - a) / 86_400_000)
}

function parseDateOnly(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Resta de presentación reutilizable — evita repetir el patrón en la vista. */
export function pendingAgainstPrincipal(contract: Contract): string {
  return subtractMoney(contract.principal, contract.capital_balance)
}
