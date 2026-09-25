import { z } from 'zod'
import type { Customer } from '@/features/customers/api'
import { formatDateTime } from '@/lib/dates'

const EMAIL_SHAPE = z.string().email()

/**
 * Qué dice la ficha sobre los avisos por correo de este cliente
 * (`../backend-starter/docs/NOTIFICACIONES.md` §9.2, fase 3).
 *
 * El orden es el MISMO del backend (`notifications/service.customer_gate`):
 * sin correo, baja, rebote, y recién después la base. Si la pantalla dijera
 * «autorizó» de alguien que pidió la baja, quien atiende le prometería un
 * correo que no va a salir.
 *
 * Ojo con lo que NO dice: «puede recibir» no es «va a recibir». Todos los
 * avisos al cliente nacen apagados por empresa (§12.3); esto describe si hay
 * con qué escribirle el día que se enciendan, no si hoy sale algo.
 */
export type EmailNoticeTone = 'ok' | 'muted' | 'warning'

export interface EmailNoticeStatus {
  text: string
  tone: EmailNoticeTone
}

type EmailFields = Pick<
  Customer,
  'email' | 'email_basis' | 'email_consent_at' | 'email_opt_out_at' | 'email_invalid_at'
>

export function emailNoticeStatus(customer: EmailFields): EmailNoticeStatus {
  if (!customer.email?.trim()) return { text: 'Sin correo', tone: 'muted' }
  if (customer.email_opt_out_at) {
    return { text: `Pidió no recibirlos (${formatDateTime(customer.email_opt_out_at)})`, tone: 'warning' }
  }
  if (customer.email_invalid_at) return { text: 'El correo rebotó: hay que corregirlo', tone: 'warning' }
  if (customer.email_basis === 'consent' && customer.email_consent_at) {
    return { text: `Autorizó recibirlos (${formatDateTime(customer.email_consent_at)})`, tone: 'ok' }
  }
  if (customer.email_basis === 'contract') return { text: 'Solo de sus contratos vigentes', tone: 'ok' }
  return { text: 'Sin autorización: no se le escribe', tone: 'muted' }
}

/**
 * El correo que no pasa la validación de forma del formulario. Se usa para
 * aceptar el valor YA GUARDADO aunque sea inválido (el backend hace lo mismo,
 * `CustomerUpdateIn.email`): un dato viejo no puede congelar la ficha.
 * Misma regla que `z.string().email()`, que es la que valida el resto.
 */
export function isValidEmailShape(value: string): boolean {
  return EMAIL_SHAPE.safeParse(value).success
}
