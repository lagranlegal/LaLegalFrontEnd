import { compareMoney, normalizeDecimalInput, percentOfMoney } from '@/lib/money'
import type { ContractQuoteIn } from '@/features/contracts/api'

/** Una tasa que el backend guarda tal cual: `numeric(5,2)`, mayor que 0 y hasta 100 (`ContractCreateIn`). */
const RATE_RE = /^\d{1,3}(\.\d{1,2})?$/

/** La tasa escrita, normalizada a punto, si es una tasa que se puede mostrar; si no, `null`. */
export function previewRate(rateInput: string | undefined): string | null {
  const rate = normalizeDecimalInput((rateInput ?? '').trim())
  if (!RATE_RE.test(rate)) return null
  const n = Number(rate)
  return n > 0 && n <= 100 ? rate : null
}

/**
 * El interés del primer mes, para el «Resumen del préstamo» MIENTRAS se llena
 * el formulario (F9-30). Es la regla del backend tal cual —
 * `rules.monthly_interest`: tasa × saldo de capital, redondeado a centavos
 * hacia arriba en la mitad—, y al crear el saldo es el monto prestado. En
 * centavos enteros (`percentOfMoney`), nunca con `parseFloat`.
 *
 * Solo con una tasa de hasta dos decimales: la base la guarda como
 * `numeric(5,2)`, y con un tercer decimal esta cuenta y la del servidor
 * podrían no coincidir. Mejor no mostrar una cifra que mostrar otra.
 */
export function monthlyInterestPreview(principal: string | undefined, rateInput: string | undefined): string | null {
  const rate = previewRate(rateInput)
  if (rate === null || !principal || compareMoney(principal, '0.00') <= 0) return null
  return percentOfMoney(principal, Number(rate))
}

/** Un monto canónico de `MoneyInput` (`"500000.00"`). */
const MONEY_RE = /^\d+(\.\d{1,2})?$/
/** Un decimal ya normalizado a punto. */
const DECIMAL_RE = /^\d+(\.\d+)?$/

/**
 * El cuerpo de `POST /contracts/quote` a partir de lo que va escrito en
 * Nuevo contrato: los mismos campos del préstamo que `POST /contracts`, con
 * la FORMA saneada para cotizar mientras se escribe. Esto no decide nada:
 *
 * - Lo que todavía no tiene forma de número (vacío, «5,», «abc») va `null`:
 *   «aún no hay dato», y el backend responde con `null` donde no puede
 *   calcular. Una tasa en 0 tampoco se manda (el formulario ya la rechaza):
 *   sería un 422 que vaciaría el resumen por algo a medio escribir.
 * - Lo que sí tiene forma va tal cual, aunque no sea válido (una tasa de 150):
 *   ahí el backend responde con el error de crear y el resumen pinta «—».
 * - De cada prenda solo cuenta la categoría (`null` si la fila no la tiene):
 *   escribir la descripción no vuelve a cotizar.
 */
export function loanQuoteBody(values: {
  principal: string | undefined
  interest_rate_pct: string | undefined
  appraisal_value: string | undefined
  extension_months: number | undefined
  extension_window_days: string | undefined
  items: ReadonlyArray<{ category_id?: string | null }> | undefined
}): ContractQuoteIn {
  const principal = (values.principal ?? '').trim()
  const rate = normalizeDecimalInput((values.interest_rate_pct ?? '').trim())
  const appraisal = (values.appraisal_value ?? '').trim()
  const windowDays = (values.extension_window_days ?? '').trim()
  const months = values.extension_months
  return {
    principal: MONEY_RE.test(principal) ? principal : null,
    interest_rate_pct: DECIMAL_RE.test(rate) && Number(rate) > 0 ? rate : null,
    appraisal_value: MONEY_RE.test(appraisal) ? appraisal : null,
    // Vacío (`valueAsNumber` da NaN) = el default de crear, que es 1.
    extension_months: months !== undefined && Number.isInteger(months) ? months : 1,
    extension_window_days: /^\d+$/.test(windowDays) ? Number(windowDays) : null,
    items: (values.items ?? []).map((item) => ({ category_id: item.category_id || null })),
  }
}
