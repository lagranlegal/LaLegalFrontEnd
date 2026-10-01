/**
 * Montos rápidos del «Recibido en efectivo» (rediseño P2, punto de venta): los
 * dos pagos redondos más probables por encima de lo que se cobra, para tocar
 * en vez de digitar. «Exacto» va aparte (es el total mismo).
 *
 * La regla sale de los billetes colombianos (2, 5, 10, 20, 50 y 100 mil; el
 * de 100 mil es el más grande):
 *
 * - **Hasta 100 mil**, lo que el cliente entrega es un billete: el más chico
 *   que cubre el total y el siguiente. 23.000 → 50.000 y 100.000.
 * - **Por encima**, se paga en billetes de 100 mil: el total redondeado a 100
 *   mil, y a 500 mil para el que trae un fajo. 1.155.000 → 1.200.000 y
 *   1.500.000 (el ejemplo de la maqueta).
 *
 * Siempre estrictamente mayores que el total (si es igual, ya es «Exacto») y
 * distintos entre sí. Solo presentación: no se envía (F9-32). Trabaja en
 * centavos enteros con `bigint` (regla 6: sin floats en dinero).
 */
const BILLETES = [2_000n, 5_000n, 10_000n, 20_000n, 50_000n, 100_000n, 200_000n].map((b) => b * 100n)
const BILLETE_MAYOR = 100_000n * 100n
const FAJO = 500_000n * 100n

/** El string decimal de la API en centavos enteros; `null` si no es un monto. */
function centavos(total: string): bigint | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(total.trim())
  if (!m) return null
  return BigInt(m[1]!) * 100n + BigInt((m[2] ?? '').padEnd(2, '0') || '0')
}

/** El menor múltiplo de `paso` estrictamente mayor que `valor`. */
function siguienteMultiplo(valor: bigint, paso: bigint): bigint {
  return (valor / paso + 1n) * paso
}

export function quickCashAmounts(total: string): string[] {
  const c = centavos(total)
  if (c === null || c <= 0n) return []
  let montos: bigint[]
  if (c < BILLETE_MAYOR) {
    montos = BILLETES.filter((b) => b > c).slice(0, 2)
  } else {
    const primero = siguienteMultiplo(c, BILLETE_MAYOR)
    montos = [primero, siguienteMultiplo(primero, FAJO)]
  }
  return montos.map((m) => `${m / 100n}.00`)
}
