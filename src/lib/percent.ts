const FORMATTERS = new Map<number, Intl.NumberFormat>()

/**
 * Un porcentaje en es-CO, con coma decimal y espacio antes del signo
 * («5,00 %», F9-21). La API manda las tasas como decimales en texto
 * (`"5.00"`); acá solo se muestran, nunca se calcula con ellas.
 */
export function formatPercent(value: string | number, decimals = 2): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  let formatter = FORMATTERS.get(decimals)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    FORMATTERS.set(decimals, formatter)
  }
  return `${formatter.format(n)} %`
}
