import { resolveInheritedParams } from '@/features/catalogs/inheritance'
import type { Category } from '@/lib/catalogs/categories'
import { compareMoney, normalizeDecimalInput, parseMoneyInput, percentOfMoney, subtractMoney } from '@/lib/money'

/**
 * El cupo del LTV, calculado MIENTRAS se llena el formulario del contrato.
 *
 * POR QUÉ EXISTE
 * ==============
 * La alerta de LTV solo aparecía en el detalle del contrato YA creado — o
 * sea, después de que la plata salió del cajón. Todo el valor de un aviso de
 * LTV está en verlo ANTES de prestar; como estaba, era un reproche y no una
 * advertencia.
 *
 * Y desde `00051` pesa más: pasarse del LTV **bloquea** a quien no tenga
 * `contracts.override_ltv`, así que un asesor podía llenar el formulario
 * entero —cliente, prendas, fotos, montos— para recibir un 403 al final.
 *
 * QUIÉN MANDA
 * ===========
 * El backend, siempre (`contracts.service._check_ltv`). Esto es presentación:
 * avisa, no decide. Por eso **no bloquea el envío** — si esta cuenta y la del
 * servidor divergieran por un redondeo, un bloqueo del front impediría un
 * contrato que el backend sí acepta. Avisar resuelve el problema reportado;
 * bloquear crearía uno nuevo.
 *
 * LA REGLA QUE HAY QUE ESPEJAR EXACTO
 * ===================================
 * El tope sale de la categoría de la **PRIMERA prenda**, no del mínimo entre
 * las prendas ni de un promedio ponderado: `contracts/service.py` hace
 * `max_ltv_pct = first["max_ltv_pct"]` sobre la lista de parámetros ya
 * resueltos. Si acá se usara otro criterio, la pantalla mostraría un tope y
 * el servidor aplicaría otro — la clase de divergencia que este proyecto ya
 * pagó con el precio del lote.
 */
export type LtvEstado =
  /** Falta el avalúo, falta la prenda, o ninguna categoría de la rama define LTV. */
  | { kind: 'sin-datos' }
  | { kind: 'dentro'; cupo: string; maxLtvPct: number; ltvPct: number }
  | { kind: 'excede'; cupo: string; maxLtvPct: number; ltvPct: number; exceso: string }

/**
 * El tope de la PRIMERA prenda, resuelto por herencia.
 *
 * `resolveInheritedParams` empieza por el id que recibe y sube por
 * `parent_id`, así que pasarle la propia categoría replica al backend, que
 * "toma el valor de la categoría misma y, si está vacío, sube".
 */
export function resolveMaxLtvPct(
  categories: Category[] | undefined,
  primeraCategoriaId: string | undefined,
): number | null {
  if (!categories || !primeraCategoriaId) return null
  // `max_ltv_pct` viaja como STRING: es un `Decimal` del backend, no un
  // número. Convertirlo acá y una sola vez evita que cada consumidor lo
  // haga a su manera — y que uno se olvide y pinte un `NaN%`.
  const crudo = resolveInheritedParams(categories, primeraCategoriaId).max_ltv_pct
  if (crudo === null) return null
  const pct = Number(crudo)
  return Number.isFinite(pct) ? pct : null
}

export function evaluarLtv(input: {
  /** Tal como viene del `<MoneyInput>`: enmascarado con puntos de miles. */
  principal: string
  appraisalValue: string | undefined
  maxLtvPct: number | null
}): LtvEstado {
  const { principal, appraisalValue, maxLtvPct } = input
  if (maxLtvPct === null || !appraisalValue) return { kind: 'sin-datos' }

  const avaluo = parseMoneyInput(appraisalValue)
  const monto = parseMoneyInput(principal)
  if (compareMoney(avaluo, '0.00') <= 0 || compareMoney(monto, '0.00') <= 0) {
    return { kind: 'sin-datos' }
  }

  const cupo = percentOfMoney(avaluo, maxLtvPct)
  // El porcentaje es para MOSTRAR ("vas en el 82 %"), no para decidir: la
  // decisión sale de comparar los dos montos en centavos enteros.
  const ltvPct = (Number(normalizeDecimalInput(monto)) / Number(normalizeDecimalInput(avaluo))) * 100

  return compareMoney(monto, cupo) <= 0
    ? { kind: 'dentro', cupo, maxLtvPct, ltvPct }
    : { kind: 'excede', cupo, maxLtvPct, ltvPct, exceso: subtractMoney(monto, cupo) }
}
