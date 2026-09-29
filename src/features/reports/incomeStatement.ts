import { subtractMoney, sumMoney } from '@/lib/money'
import type { components } from '@/types/api'

export type IncomeStatement = components['schemas']['IncomeStatementOut']

/**
 * Cómo entra una fila al resultado:
 *  - `add` / `subtract`: suma o resta tal como viene (el backend manda el
 *    monto positivo y la resta la dice el rótulo).
 *  - `signed`: ya trae el signo — los descuadres de caja (F7-03): un
 *    sobrante es positivo y suma, un faltante es negativo y resta.
 *  - `subtotal` / `result`: no son una línea más, son la suma hasta ahí.
 *  - `info`: ya está contado en otra línea; se muestra para explicarla y
 *    NO se suma (el interés del remate, los descuentos de venta).
 *  - `outside`: no es ingreso ni gasto (compras, capital prestado).
 */
export type IncomeStatementRowKind = 'add' | 'subtract' | 'signed' | 'subtotal' | 'result' | 'info' | 'outside'

export interface IncomeStatementRow {
  key: string
  label: string
  /** El monto tal como vino del backend. */
  value: string
  kind: IncomeStatementRowKind
  hint?: string
}

/**
 * El estado de resultados en cascada, en el orden en que se lee y con la
 * forma en que cada línea entra a la utilidad. Una sola fuente para la
 * tarjeta de la pantalla y la hoja Resumen del Excel (F7-12): antes la
 * hoja tenía su propia lista, con la devolución en negativo y el costo y los
 * gastos en positivo, y sin las líneas nuevas de la fase 7 — sumarla no daba
 * la utilidad.
 *
 * Las líneas nuevas van SIEMPRE, también en cero: un estado de resultados
 * que cambia de forma según el mes no se compara contra el anterior, y la
 * línea en cero es la manera de saber que el concepto existe y se mira.
 */
export function incomeStatementRows(data: IncomeStatement): IncomeStatementRow[] {
  return [
    { key: 'sales_revenue', label: 'Ventas', value: data.sales_revenue, kind: 'add', hint: 'Netas de descuentos' },
    // F21-12: contra-ingreso con línea propia, no restado en silencio.
    { key: 'sales_returns', label: 'Devoluciones', value: data.sales_returns, kind: 'subtract', hint: 'Devueltas en el período, no en el de la venta' },
    { key: 'interest_revenue', label: 'Intereses cobrados', value: data.interest_revenue, kind: 'add', hint: 'Netos de descuentos de interés' },
    { key: 'total_revenue', label: 'Ingresos totales', value: data.total_revenue, kind: 'subtotal' },
    { key: 'cost_of_goods_sold', label: 'Costo de la mercancía vendida', value: data.cost_of_goods_sold, kind: 'subtract', hint: 'Lo que costó lo que se vendió — solo tienda' },
    { key: 'gross_profit', label: 'Utilidad bruta', value: data.gross_profit, kind: 'subtotal' },
    { key: 'operating_expenses', label: 'Gastos operativos', value: data.operating_expenses, kind: 'subtract', hint: `${data.expense_count} gasto(s)` },
    // F7-01: mercancía que salió sin venderse, al costo del lote.
    { key: 'inventory_shrinkage', label: 'Mermas y bajas', value: data.inventory_shrinkage, kind: 'subtract', hint: `${data.shrinkage_exit_count} egreso(s), al costo` },
    // F7-02: lo que se quedó el convenio (Sistecrédito y similares) al liquidar.
    { key: 'settlement_commissions', label: 'Comisiones de convenios', value: data.settlement_commissions, kind: 'subtract', hint: 'Liquidado menos recibido' },
    // F7-03: con signo. Un sobrante suma, un faltante resta.
    { key: 'cash_differences', label: 'Descuadres de caja', value: data.cash_differences, kind: 'signed', hint: 'Sobrantes suman, faltantes restan' },
    { key: 'operating_profit', label: 'Utilidad', value: data.operating_profit, kind: 'result' },

    { key: 'sales_discounts', label: 'Descuentos de venta', value: data.sales_discounts, kind: 'info', hint: 'Ya restados de las ventas' },
    // F7-04: la base de costo del remate es el capital; el interés que el
    // contrato adeudaba se realiza al vender y ya está en la utilidad bruta.
    { key: 'auction_interest_realized', label: 'Interés de remates realizado', value: data.auction_interest_realized, kind: 'info', hint: 'Ya incluido en la utilidad bruta' },
    { key: 'interest_discounts', label: 'Descuentos de interés', value: data.interest_discounts, kind: 'info', hint: 'Ya restados de los intereses' },

    { key: 'inventory_purchased', label: 'Compras causadas', value: data.inventory_purchased, kind: 'outside', hint: 'Por fecha de la compra, a crédito incluidas' },
    // F7-16: lo PAGADO a proveedores, por la fecha del pago. Es lo que la
    // pantalla llamaba «Compras a proveedor».
    { key: 'inventory_purchases_paid', label: 'Pagos de compras', value: data.inventory_purchases_paid, kind: 'outside', hint: 'Por fecha del pago' },
    { key: 'transformation_costs_paid', label: 'Costos de transformación pagados', value: data.transformation_costs_paid, kind: 'outside' },
    { key: 'capital_disbursed', label: 'Capital prestado', value: data.capital_disbursed, kind: 'outside' },
    { key: 'capital_recovered', label: 'Capital recuperado', value: data.capital_recovered, kind: 'outside' },
  ]
}

/** El monto con el signo con que entra a la utilidad (las restas en negativo). */
export function signedValue(row: IncomeStatementRow): string {
  return row.kind === 'subtract' ? subtractMoney('0.00', row.value) : row.value
}

const ENTRA_AL_RESULTADO: ReadonlySet<IncomeStatementRowKind> = new Set(['add', 'subtract', 'signed'])

function hasCents(value: string): boolean {
  const [, dec = ''] = value.split('.')
  return /[1-9]/.test(dec)
}

/**
 * La cascada tal como se MUESTRA en la tarjeta: los renglones que entran al
 * resultado, con los subtotales y la utilidad calculados de esos mismos
 * renglones, y los centavos a la vista si algún renglón los trae.
 *
 * Por qué (verificación de la tanda F/G): los valores traen centavos y la
 * pantalla redondeaba cada renglón a pesos por separado —3.976.916,67 se
 * veía 3.976.917 y 3.488.458,46 se veía 3.488.458—, así que la utilidad
 * bruta mostrada no era la resta de lo mostrado: 1 peso de diferencia para
 * quien suma a mano. Mostrar centavos solo arregla eso si el subtotal
 * también sale de los renglones: el backend desplegado antes de d96d2d1
 * calcula sus subtotales con los valores sin redondear y puede diferir en
 * un centavo; el nuevo ya los deriva igual, y ahí coinciden. Es una suma
 * de presentación, no una regla de negocio: cada renglón sigue siendo el
 * del backend.
 *
 * Una línea que el backend todavía no manda (una respuesta anterior a la
 * tanda F1) entra en cero.
 */
export function incomeStatementCascade(data: IncomeStatement): { rows: IncomeStatementRow[]; fractionDigits: 0 | 2 } {
  const cascade = incomeStatementRows(data)
    .filter((r) => r.kind !== 'info' && r.kind !== 'outside')
    .map((r) => ({ ...r, value: r.value ?? '0.00' }))
  let acumulado = '0.00'
  const rows = cascade.map((row) => {
    if (ENTRA_AL_RESULTADO.has(row.kind)) {
      acumulado = sumMoney(acumulado, signedValue(row))
      return row
    }
    return { ...row, value: acumulado }
  })
  const fractionDigits = rows.some((r) => ENTRA_AL_RESULTADO.has(r.kind) && hasCents(r.value)) ? 2 : 0
  return { rows, fractionDigits }
}

const KIND_LABEL: Record<IncomeStatementRowKind, string> = {
  add: 'Suma',
  subtract: 'Resta',
  signed: 'Con signo',
  subtotal: 'Subtotal',
  result: 'Resultado',
  info: 'Informativo (ya incluido, no suma)',
  outside: 'Fuera del resultado',
}

/**
 * La hoja Resumen del Excel (F7-12). `Monto` va con el signo con que entra a
 * la utilidad, así que sumar las filas «Suma», «Resta» y «Con signo» da la
 * fila «Resultado»; la columna `Cómo entra` lo dice para quien no lo sepa.
 */
export function incomeStatementSheetRows(data: IncomeStatement): { Concepto: string; 'Cómo entra': string; Monto: number }[] {
  return incomeStatementRows(data).map((row) => ({
    Concepto: row.label,
    'Cómo entra': KIND_LABEL[row.kind],
    Monto: Number(signedValue(row)),
  }))
}
