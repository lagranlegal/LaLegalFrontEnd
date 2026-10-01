const FORMATTERS = new Map<number, Intl.NumberFormat>()

/**
 * Un porcentaje en es-CO, con coma decimal y espacio antes del signo
 * («5,00 %», F9-21). La API manda las tasas como decimales en texto
 * (`"5.00"`); acá solo se muestran, nunca se calcula con ellas.
 */
export function formatPercent(value: string | number, decimals: number | 'auto' = 2): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  // `auto`: hasta dos decimales, sin ceros de relleno («70 %», «70,5 %»), para
  // un valor que alguien escribió (el LTV de una categoría) y no una tasa.
  const key = decimals === 'auto' ? -1 : decimals
  let formatter = FORMATTERS.get(key)
  if (!formatter) {
    formatter =
      decimals === 'auto'
        ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
        : new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    FORMATTERS.set(key, formatter)
  }
  return `${formatter.format(n)} %`
}
