/**
 * Único lugar donde se formatea/parsea dinero (docs/ARQUITECTURA.md §7).
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

/**
 * Cuántos dígitos enteros acepta un campo de dinero: hasta $ 999.999.999.999.
 * El campo aceptaba 20 (F9-23); más de 12 no es un monto de esta operación,
 * es un error de pegado o de dedo.
 */
export const MAX_MONEY_DIGITS = 12

/**
 * Un texto de dinero en cualquiera de los formatos en que llega pegado → el
 * string decimal de la API, en pesos. `null` si pasa de `MAX_MONEY_DIGITS`.
 *
 * POR QUÉ (auditoría de QA, F9-23, ALTO): `parseMoneyInput` quita todo lo que
 * no es dígito, incluida la coma decimal, así que pegar «$ 1.234.567,00»
 * —el formato en que Excel y la banca en línea copian una cifra
 * colombiana— daba 123.456.700: cien veces más, en un préstamo o un abono.
 *
 * Reglas:
 *  - El ÚLTIMO separador (coma o punto) es el decimal si lo siguen 1 o 2
 *    dígitos: «1.234.567,00» (Colombia) y «$1,234,567.00» (EE. UU.) dan lo
 *    mismo. Seguido de 3 o más dígitos es de miles: «1,234» son mil
 *    doscientos treinta y cuatro. Todo separador anterior es de miles.
 *  - Los montos son en PESOS (el campo no muestra centavos): los centavos
 *    se redondean al peso más cercano, ,50 hacia arriba. «1.234.567,50» →
 *    1.234.568. Redondear y no truncar: es el peso más cercano a lo que
 *    dice el papel.
 *
 * Solo para lo PEGADO. Al escribir tecla por tecla el campo sigue siendo de
 * dígitos (`parseMoneyInput`): la máscara pone los puntos, y borrar el último
 * dígito de «1.234» deja «1.23», que acá se leería como decimal.
 */
export function parseMoneyText(text: string): string | null {
  const clean = text.replace(/[^\d.,]/g, '')
  const lastSep = Math.max(clean.lastIndexOf('.'), clean.lastIndexOf(','))
  let intPart = clean
  let decPart = ''
  if (lastSep >= 0) {
    const tail = clean.slice(lastSep + 1)
    if (/^\d{1,2}$/.test(tail)) {
      intPart = clean.slice(0, lastSep)
      decPart = tail
    }
  }
  const digits = intPart.replace(/\D/g, '').replace(/^0+(?=\d)/, '') || '0'
  if (digits.length > MAX_MONEY_DIGITS) return null
  const roundUp = decPart !== '' && Number(decPart.padEnd(2, '0')) >= 50
  const pesos = roundUp ? String(Number(digits) + 1) : digits
  if (pesos.length > MAX_MONEY_DIGITS) return null
  return `${pesos}.00`
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
 * Suma de PRESENTACIÓN (docs/ARQUITECTURA.md §7: "sumas de presentación
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
 * Una cantidad (number o el string decimal de la API) como entero escalado:
 * `"12.5"` → `{ units: 125n, scale: 1 }`. Es lo que permite multiplicar dinero
 * por cantidad sin floats. `null` si no es un número legible (un campo a
 * medio escribir, "1,5" antes de normalizar): quien llama decide qué mostrar.
 *
 * Un `number` se lee por su representación decimal más corta (`String(1.1)`
 * es `"1.1"`, no `1.100000000000000088…`), que es la que escribió la persona.
 */
function toScaledQuantity(quantity: number | string): { units: bigint; scale: number } | null {
  let text: string
  if (typeof quantity === 'number') {
    if (!Number.isFinite(quantity)) return null
    text = String(quantity)
    // 1e-7 y similares: String usa notación exponencial; toFixed no, hasta 1e21.
    if (/e/i.test(text)) text = quantity.toFixed(20)
  } else {
    text = quantity.trim()
  }
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(text)
  if (!match || (!match[2] && !match[3])) return null
  const [, sign, whole = '', fraction = ''] = match
  const units = BigInt(`${whole || '0'}${fraction}`)
  return { units: sign ? -units : units, scale: fraction.length }
}

/**
 * Multiplicación de PRESENTACIÓN — subtotal de una línea (`unit_price ×
 * quantity`) ANTES de confirmar: carrito de venta, ingreso de inventario,
 * transformación, contador de billetes. El backend calcula el subtotal real al
 * guardar; esto solo lo muestra, pero tiene que dar LO MISMO.
 * `multiplyMoney("19230.00", "12.5")` → `"240375.00"`.
 *
 * BUG REAL (QA, 27/09/2026): esto era `centsToDecimal(toCents(p) * quantity)`
 * bajo el supuesto de que la cantidad siempre es entera. Dejó de serlo en
 * 00036 (gramos, kilos, metros: `numeric(14,3)`). `1001 × 1,1` en centavos
 * float da `110110.00000000001`, `centsToDecimal` hace `% 100` sobre eso y
 * sale `"1101.10.000000000014552"`; `formatCOP` lanza y se cae la pantalla
 * entera — la venta, el ingreso, la transformación. Es el mismo defecto que
 * ya se había resuelto en `percentOfMoney`, visto desde la cantidad.
 *
 * Ahora la cantidad se escala a entero (`12.5` → `125`, escala 1), se
 * multiplica en `bigint` (un precio de nueve cifras por mil gramos se pasa de
 * `2^53`) y se redondea a centavos con la MISMA regla del backend:
 * `quantize(unit_price * quantity)` con `ROUND_HALF_UP` —el empate se aleja
 * de cero, no el redondeo del banquero— en `app/common/money.py`, aplicado
 * por línea en `sales/service.py` y en `inventory/service.py`
 * (transformación). Si el front redondeara distinto, el subtotal que ve el
 * cajero no sería el que cobra el recibo.
 *
 * Una cantidad ilegible (campo vacío o a medio escribir) da `"0.00"`: es un
 * subtotal de pantalla y el formulario ya marca el campo; tumbar la vista
 * por eso es peor que mostrar cero.
 */
export function multiplyMoney(unitPrice: string, quantity: number | string): string {
  const scaled = toScaledQuantity(quantity)
  if (!scaled) return '0.00'
  const divisor = 10n ** BigInt(scaled.scale)
  const product = BigInt(toCents(unitPrice)) * scaled.units
  const negative = product < 0n
  const abs = negative ? -product : product
  // ROUND_HALF_UP en enteros: floor((2·abs + d) / 2d) = abs/d redondeado,
  // con el empate hacia arriba. Sobre el valor absoluto y con el signo
  // después, que es "lejos de cero" — igual que `Decimal.quantize`.
  const cents = (2n * abs + divisor) / (2n * divisor)
  const sign = negative && cents > 0n ? '-' : ''
  return `${sign}${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`
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

/**
 * Variación porcentual de PRESENTACIÓN entre dos montos (el «▲ 12 % vs.
 * agosto» del Inicio), en centavos enteros. `null` si el monto anterior es 0:
 * no hay base, y un «+∞ %» o un «100 %» inventado dicen más de lo que se sabe.
 * `changePercent("1120.00", "1000.00")` → `12`.
 */
export function changePercent(current: string, previous: string): number | null {
  const base = toCents(previous)
  if (base === 0) return null
  return ((toCents(current) - base) / Math.abs(base)) * 100
}
