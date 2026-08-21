import type { components } from '@/types/api'

type AccountType = components['schemas']['AccountOut']['type']

/**
 * Único mapa de tipos de cuenta→etiqueta ES, mismo criterio que
 * `lib/paymentMethods.ts`. Vive en `lib/` y no en la feature porque lo
 * consumen también los puntos de cobro (ventas, abonos, gastos, compras),
 * que no pueden importar de otra feature (CLAUDE.md, aislamiento).
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  settlement: 'Por cobrar',
}

/**
 * Qué significa el saldo en cada tipo — no es lo mismo "tengo" que "me
 * deben", y la pantalla tiene que decirlo o el número engaña.
 */
export const ACCOUNT_TYPE_HINTS: Record<AccountType, string> = {
  cash: 'Lo que debería haber en el cajón ahora. Se cuenta en el arqueo diario.',
  bank: 'Saldo acumulado. Se concilia contra el extracto, en el ritmo del banco.',
  settlement: 'Plata que todavía no está: alguien la debe y llegará después, y menos.',
}

export function accountTypeLabel(type: string): string {
  return ACCOUNT_TYPE_LABELS[type as AccountType] ?? type
}

/**
 * El medio de pago decide QUÉ TIPO de cuenta se propone por defecto, igual
 * que hace `resolve_account_for_movement` en el backend cuando el front no
 * manda `account_id`. Se replica acá solo para PRESELECCIONAR en la UI — la
 * autoridad sigue siendo el backend (CLAUDE.md: los permisos y las reglas se
 * validan del lado del servidor, el front solo acomoda la pantalla).
 */
export function defaultAccountTypeFor(paymentMethod: string): AccountType {
  return paymentMethod === 'cash' ? 'cash' : 'bank'
}
