import { addMonthsToDateOnly, formatDateShort } from '@/lib/dates'

/** Lo que el panel necesita del contrato para decir cómo queda tras el abono. */
export interface PaymentContractInfo {
  interestPaidUntil?: string
  status?: string
  itemCount?: number
}

export function monthsLabel(n: number): string {
  return `${n} ${n === 1 ? 'mes' : 'meses'}`
}

/**
 * Cómo queda el contrato si se pagan `months` meses (rediseño P2-a: cada
 * opción dice su consecuencia). Solo afirma lo que se deduce de las reglas
 * (backend-starter/docs/DOMINIO.md §2.3): cubrir todos los meses adeudados lo
 * deja vigente; en mora, cubrir menos lo deja en mora. En prórroga no se
 * afirma el estado (la fecha de la prórroga se fija una vez): se dice cuánto
 * queda debiendo.
 */
export function paymentConsequence(months: number, monthsOwed: number, info: PaymentContractInfo): string | null {
  const until = info.interestPaidUntil ? `pagado hasta ${formatDateShort(addMonthsToDateOnly(info.interestPaidUntil, months))}` : null
  if (months >= monthsOwed) return until ? `queda vigente, ${until}` : 'queda vigente'
  const left = `aún debe ${monthsLabel(monthsOwed - months)}`
  if (info.status === 'in_arrears') return until ? `sigue en mora, ${until}` : 'sigue en mora'
  return until ? `${left}, ${until}` : left
}

