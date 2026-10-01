import { normalizeDecimalInput } from '@/lib/money'
import type { ContractQuoteIn } from '@/features/contracts/api'

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
