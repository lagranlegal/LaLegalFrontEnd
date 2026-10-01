import { compareMoney, subtractMoney } from '@/lib/money'

export type CashDifferenceKind = 'shortage' | 'surplus' | 'even'

/**
 * Una diferencia de arqueo dicha con palabra, no solo con signo (F9-43):
 * «Diferencia −$ 7.000» obligaba a recordar que el backend la calcula como
 * contado − esperado. Negativa = **faltante** (se contó menos de lo que debía
 * haber), positiva = **sobrante**. El monto se muestra sin signo: la palabra
 * ya dice la dirección.
 */
export function describeCashDifference(difference: string): { kind: CashDifferenceKind; label: string; amount: string } {
  const sign = compareMoney(difference, '0')
  if (sign === 0) return { kind: 'even', label: 'Sin diferencia', amount: '0.00' }
  if (sign < 0) return { kind: 'shortage', label: 'Faltante', amount: subtractMoney('0', difference) }
  return { kind: 'surplus', label: 'Sobrante', amount: difference }
}
