import type { Customer } from '@/lib/customers/search'

/**
 * ¿El comprobante de venta NO le va a llegar a este cliente porque no tiene
 * base legal para recibirlo? (F8-07, auditoría de QA; backend-starter/docs/DOMINIO.md §9.2).
 *
 * El backend manda el comprobante (C6, finalidad «servicio») solo con base
 * `contract` o `consent` (`catalog.basis_allows`); el que solo compra casi
 * nunca la tiene, y el correo quedaba «suppressed» sin que el POS lo dijera.
 * Todavía no hay decisión legal sobre si la compraventa de mostrador da base
 * propia; mientras tanto, el POS lo avisa.
 *
 * Solo cuando el dato está: el cliente tiene correo (sin correo no es
 * cuestión de autorización), no pidió la baja ni rebotó (son otros motivos),
 * y `email_basis` vino y es `null`. Si el backend no manda el campo, no se
 * adivina.
 */
export function receiptEmailBlockedByConsent(customer: Customer): boolean {
  if (!customer.email?.trim()) return false
  if (customer.email_opt_out_at || customer.email_invalid_at) return false
  return 'email_basis' in customer && customer.email_basis === null
}
