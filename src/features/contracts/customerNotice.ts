import { z } from 'zod'
import type { Customer } from '@/lib/customers/search'

const EMAIL = z.string().email()

type NoticeFields = Pick<Customer, 'email' | 'email_basis' | 'email_opt_out_at'>

/**
 * El correo y la casilla de avisos del formulario de crear contrato
 * (`../backend-starter/docs/NOTIFICACIONES.md` §9.2-f).
 *
 * - **La casilla se ofrece** solo a quien no autorizó ya (`consent`) ni pidió
 *   la baja: la baja gana sobre cualquier base y se levanta desde la ficha.
 * - **Exige correo**, el guardado o uno válido recién escrito: autorizar a
 *   escribirle a una dirección que no existe no autoriza nada.
 */
export function customerNoticeState(customer: NoticeFields | null, typedEmail: string | undefined) {
  const savedEmail = customer?.email?.trim() || ''
  const typed = (typedEmail ?? '').trim()
  const typedValid = typed !== '' && EMAIL.safeParse(typed).success
  return {
    savedEmail,
    typed,
    hasEmail: savedEmail !== '' || typedValid,
    offersConsent: !!customer && customer.email_basis !== 'consent' && !customer.email_opt_out_at,
  }
}

/**
 * Lo que viaja en `POST /contracts`. El correo, solo si el cliente NO tenía
 * (cambiar uno existente es una edición de su ficha y el backend lo rechaza);
 * la casilla, solo marcada, ofrecida y con correo. Una casilla sin marcar no
 * viaja: no es una decisión de nadie, y retirar una autorización se hace en la
 * ficha.
 */
export function customerNoticePayload(
  customer: NoticeFields | null,
  values: { customer_email?: string; customer_email_consent: boolean },
): { customer_email?: string; customer_email_consent?: true } {
  const st = customerNoticeState(customer, values.customer_email)
  return {
    ...(!st.savedEmail && st.typed ? { customer_email: st.typed } : {}),
    ...(st.offersConsent && values.customer_email_consent && st.hasEmail ? { customer_email_consent: true as const } : {}),
  }
}
