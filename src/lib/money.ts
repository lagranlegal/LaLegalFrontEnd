/**
 * Único lugar donde se formatea/parsea dinero (docs/ARCHITECTURE.md §7).
 * La API usa strings decimales (`"1000000.00"`). Aritmética de dinero en el
 * front: prohibida salvo sumas de presentación hechas sobre enteros, nunca
 * floats — los montos con reglas de negocio (intereses, saldos) SIEMPRE
 * vienen del backend. `Money`/`MoneyInput` (components/shared) son los
 * únicos consumidores de este módulo.
 */

const COP_FORMATTER_0 = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

const COP_FORMATTER_2 = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

/**
 * `formatCOP("1000000.00")` → `"$ 1.000.000"`. Recibe el string decimal tal
 * como lo manda la API (o un number ya en pesos, para totales de
 * presentación armados sobre enteros). `maximumFractionDigits: 2` muestra
 * centavos cuando el monto los trae (poco común en este negocio).
 */
export function formatCOP(value: string | number, opts?: { maximumFractionDigits?: 0 | 2 }): string {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) {
    throw new Error(`formatCOP: valor de dinero inválido: ${JSON.stringify(value)}`)
  }
  const formatter = opts?.maximumFractionDigits === 2 ? COP_FORMATTER_2 : COP_FORMATTER_0
  return formatter.format(amount)
}

/** Deja solo dígitos — base para enmascarar y para normalizar input del usuario. */
function digitsOnly(input: string): string {
  return input.replace(/\D/g, '')
}

/**
 * Enmascara dígitos crudos con puntos de miles mientras el usuario escribe
 * en `<MoneyInput>` (sin símbolo de moneda, sin centavos — este negocio no
 * digita centavos). `maskMoneyInput("2664500")` → `"2.664.500"`.
 */
export function maskMoneyInput(rawInput: string): string {
  const digits = digitsOnly(rawInput).replace(/^0+(?=\d)/, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * Normaliza el texto enmascarado de `<MoneyInput>` al string decimal que
 * espera la API. `parseMoneyInput("2.664.500")` → `"2664500.00"`.
 */
export function parseMoneyInput(maskedInput: string): string {
  const digits = digitsOnly(maskedInput).replace(/^0+(?=\d)/, '')
  return `${digits || '0'}.00`
}

function toCents(decimal: string): number {
  const negative = decimal.trim().startsWith('-')
  const [wholeRaw = '0', decimalRaw = '00'] = decimal.split('.')
  const whole = Number(wholeRaw.replace(/[^0-9]/g, '') || '0')
  const cents = Number(decimalRaw.replace(/[^0-9]/g, '').padEnd(2, '0').slice(0, 2))
  const total = whole * 100 + cents
  return negative ? -total : total
}

function centsToDecimal(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(cents)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Suma de PRESENTACIÓN (docs/ARCHITECTURE.md §7: "sumas de presentación
 * hechas sobre enteros de centavos, nunca floats") — ej. mostrar
 * interés + capital extra ANTES de enviar el abono, nunca para decidir un
 * monto que manda la API (eso siempre lo calcula el backend).
 * `sumMoney("50000.00", "10000.00")` → `"60000.00"`.
 */
/**
 * Lo que la persona escribió en un campo decimal libre → lo que entiende la API.
 *
 * En Colombia la coma es el separador decimal: "10,5" gramos es lo natural de
 * escribir, y el teclado numérico de un celular ofrece coma. El backend usa
 * `Decimal`, que solo acepta punto, y responde 422.
 *
 * BUG REAL (03/09/2026): el peso de una prenda escrito con coma hacía fallar
 * la creación del contrato **sin ningún mensaje** —ver `applyServerErrors`—,
 * así que el botón parecía no hacer nada. Rechazar la coma nunca fue una
 * decisión, era un descuido: acá se acepta y se traduce.
 *
 * Solo toca la coma. Cualquier otra cosa rara (letras, dos puntos decimales)
 * sigue su camino y la valida quien corresponda — este helper no es un
 * validador, es un traductor.
 */
export function normalizeDecimalInput(raw: string): string {
  return raw.replace(',', '.')
}

export function sumMoney(...values: (string | null | undefined)[]): string {
  const totalCents = values.reduce((total: number, value) => total + (value ? toCents(value) : 0), 0)
  return centsToDecimal(totalCents)
}

/**
 * Resta de PRESENTACIÓN — vista previa del descuadre de caja (`counted_cash`
 * − `expected_cash`) ANTES de cerrar la sesión; el backend recalcula y
 * guarda la diferencia real al cerrar, esto es solo para mostrarla al
 * instante mientras el usuario digita (docs/DESIGN_SYSTEM.md §4.2). Puede
 * dar negativo (faltante de caja) — `centsToDecimal` preserva el signo.
 * `subtractMoney("48000.00", "50000.00")` → `"-2000.00"`.
 */
export function subtractMoney(a: string, b: string): string {
  return centsToDecimal(toCents(a) - toCents(b))
}

/**
 * Multiplicación de PRESENTACIÓN — subtotal de una línea del carrito de
 * venta (`unit_price × quantity`) ANTES de confirmar; el backend calcula el
 * `subtotal`/`total` reales al crear la venta. `quantity` es siempre un
 * entero (nunca fracción de unidad en este negocio), así que esto sigue
 * siendo aritmética entera sobre centavos, no floats.
 * `multiplyMoney("15000.00", 3)` → `"45000.00"`.
 */
export function multiplyMoney(unitPrice: string, quantity: number): string {
  return centsToDecimal(toCents(unitPrice) * quantity)
}

/**
 * Mínimo de PRESENTACIÓN — acota en la UI el monto de nota crédito a
 * aplicar (nunca más que el saldo de la nota ni que el total de la venta);
 * el backend vuelve a validar el límite real. `minMoney("500000.00",
 * "300000.00")` → `"300000.00"`.
 */
export function minMoney(a: string, b: string): string {
  return toCents(a) <= toCents(b) ? a : b
}

/**
 * Compara dos montos. `-1` si `a < b`, `0` si son iguales, `1` si `a > b`.
 *
 * Existe para no comparar dinero con `Number(a) > Number(b)` en una feature
 * (regla 5 de `CLAUDE.md`) ni con trucos sobre `minMoney`, que obligan a
 * comparar STRINGS y fallan en cuanto uno trae `"1000000"` y el otro
 * `"1000000.00"` — el mismo monto escrito distinto.
 */
export function compareMoney(a: string, b: string): -1 | 0 | 1 {
  const ca = toCents(a)
  const cb = toCents(b)
  return ca === cb ? 0 : ca < cb ? -1 : 1
}

/**
 * Un porcentaje de un monto, en centavos enteros. `percentOfMoney(
 * "2000000.00", 70)` → `"1400000.00"`.
 *
 * NO se puede hacer con `multiplyMoney(valor, pct / 100)`: ése multiplica
 * centavos por un float y le pasa el resultado a `centsToDecimal`, que hace
 * `% 100` — con `0.4`, que no es exacto en binario, sale un residuo como
 * `1e-8` y el monto se imprime corrupto. Acá la aritmética es entera
 * (puntos básicos) y el redondeo explícito.
 *
 * Es de PRESENTACIÓN: sirve para mostrar el cupo del LTV mientras se llena
 * el formulario. Quien decide si un préstamo se pasa sigue siendo el
 * backend (`contracts.service._check_ltv`).
 */
export function percentOfMoney(value: string, pct: number): string {
  const basisPoints = Math.round(pct * 100)
  return centsToDecimal(Math.round((toCents(value) * basisPoints) / 10000))
}
