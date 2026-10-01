import { compareMoney, normalizeDecimalInput, percentOfMoney } from '@/lib/money'

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
