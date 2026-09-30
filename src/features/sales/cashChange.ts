import { compareMoney, subtractMoney } from '@/lib/money'

/**
 * El cambio de un cobro en efectivo (F9-32): el cajero escribe lo que le
 * entregó el cliente y la pantalla le dice el vuelto, en vez de hacer la resta
 * de cabeza. Solo es presentación: no se envía al backend (la venta registra
 * el total, no los billetes). Aritmética en centavos (`subtractMoney`).
 *
 * `null` mientras no se haya escrito nada; `short` si lo recibido no alcanza.
 */
export function cashChange(received: string, due: string): { kind: 'change'; amount: string } | { kind: 'short'; amount: string } | null {
  if (!received) return null
  if (compareMoney(received, due) >= 0) return { kind: 'change', amount: subtractMoney(received, due) }
  return { kind: 'short', amount: subtractMoney(due, received) }
}
