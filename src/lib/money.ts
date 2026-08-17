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
