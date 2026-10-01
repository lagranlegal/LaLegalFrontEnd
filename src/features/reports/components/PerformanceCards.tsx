import { KpiCard } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import type { DateRangeValue } from '@/components/shared/DateRangePicker'
import { unitsSoldText } from '@/features/reports/units'
import { usePawnPerformance, useProfitSummary } from '@/features/reports/api'
import { MAX_PROFIT_RANGE_DAYS, reportRangeProblem } from '@/features/reports/aggregate'
import { ApiError, userMessage } from '@/lib/api/errors'
import { SectionError } from '@/features/reports/components/SectionError'

/** El rango no se puede pedir (o el backend lo rechazó): se dice por qué en vez de esconder la tarjeta. */
function RangeNotice({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-card">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <p role="status" className="mt-2 text-sm text-warning">
        {message}
      </p>
    </div>
  )
}

/** El problema del rango, visto antes de pedir o en el 422 del backend. */
function rangeMessage(range: DateRangeValue | null, error: unknown): string | null {
  if (range) {
    const problema = reportRangeProblem(range, MAX_PROFIT_RANGE_DAYS)
    if (problema) return problema
  }
  if (error instanceof ApiError && (error.code === 'INVALID_DATE_RANGE' || error.code === 'DATE_RANGE_TOO_LONG')) return userMessage(error)
  return null
}

/**
 * Utilidad BRUTA de la tienda: lo que entró por ventas menos lo que costó la
 * mercancía vendida. Es la respuesta a "¿cuánto gané con lo que vendí?", que
 * hasta ahora no existía en ninguna pantalla.
 *
 * NO es lo mismo que la "utilidad operativa" de los KPIs de arriba, y por eso
 * lleva su propia card con la aclaración: aquella es ingresos − gastos (luz,
 * arriendo, nómina) y NO descuenta el costo de la mercancía; esta descuenta el
 * costo pero no los gastos. Mezclarlas o presentarlas sin distinguir sería
 * dar dos "utilidades" distintas en la misma pantalla sin decir cuál es cuál.
 *
 * Se pide aparte y no sale de `aggregateFinancialSummary` porque el costo de
 * ventas no es un movimiento de caja: vive en `sale_line.unit_cost`, congelado
 * al momento de vender.
 */
export function ProfitCard({ range }: { range: DateRangeValue | null }) {
  const { data: profit, isPending, isError, error, refetch } = useProfitSummary(range)
  const problemaRango = rangeMessage(range, error)

  if (problemaRango) return <RangeNotice title="Utilidad bruta de tienda" message={problemaRango} />
  if (isPending) return <div className="h-28 animate-pulse rounded-card border border-border bg-border" />
  if (isError) return <SectionError title="Utilidad bruta de tienda" error={error} onRetry={() => void refetch()} />
  if (!profit) return null

  const loss = Number(profit.gross_profit) < 0

  return (
    <div className="rounded-card border border-border bg-card p-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-foreground">Utilidad bruta de tienda</h2>
        <span className="text-xs text-muted-foreground">
          Ventas netas de descuentos y devoluciones, menos el costo de la mercancía vendida. No descuenta gastos operativos.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Ingreso por ventas" value={<Money value={profit.net_revenue} tone="in" />} />
        <KpiCard label="Costo de lo vendido" value={<Money value={profit.cost_of_goods_sold} tone="out" />} />
        <KpiCard label="Utilidad bruta" value={<Money value={profit.gross_profit} />} tone={loss ? 'danger' : 'success'} />
        <KpiCard
          label="Margen"
          // `null` cuando no hubo ventas: un 0% afirmaría "vendí sin ganar",
          // que es distinto de "no hay datos en el período".
          value={<span className="tnum">{profit.margin_pct === null ? '—' : `${Number(profit.margin_pct).toFixed(1)}%`}</span>}
          tone={profit.margin_pct === null ? undefined : loss ? 'danger' : 'success'}
        />
      </div>
      {profit.sale_count > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {profit.sale_count} {profit.sale_count === 1 ? 'venta' : 'ventas'} · {unitsSoldText(profit.units_sold)}
          {/* F7-08: `total_discounts` es cabecera + venta bajo el precio
              publicado. `discounts` solo era la cabecera y dejaba afuera el
              precio rebajado en la línea, que también es un descuento. */}
          {Number(profit.total_discounts) > 0 && (
            <>
              {' '}
              · descuentos aplicados <Money value={profit.total_discounts} />
            </>
          )}
          {/* El ingreso ya viene NETO de devoluciones: si no se nombran, la
              cifra baja sin explicación (F21-12). */}
          {profit.return_count > 0 && (
            <>
              {' '}
              · {profit.return_count} {profit.return_count === 1 ? 'devolución' : 'devoluciones'} por{' '}
              <Money value={profit.sales_returns} />
            </>
          )}
        </p>
      )}
    </div>
  )
}

/**
 * Rentabilidad del EMPEÑO. Deliberadamente distinta de la card de tienda: no
 * hay costo de ventas, así que no hay margen — lo que se mide es el
 * rendimiento de los intereses cobrados sobre el capital que está prestado.
 *
 * Los intereses salen del documento (`contract_payment`) y no del desglose de
 * caja que alimenta los KPIs de arriba, así que ESTE número incluye los abonos
 * de hoy aunque la caja siga abierta. Puede diferir del KPI "Intereses
 * cobrados" por esa razón, y es correcto que difiera.
 */
export function PawnCard({ range }: { range: DateRangeValue | null }) {
  const { data: pawn, isPending, isError, error, refetch } = usePawnPerformance(range)
  const problemaRango = rangeMessage(range, error)

  if (problemaRango) return <RangeNotice title="Rentabilidad del empeño" message={problemaRango} />
  if (isPending) return <div className="h-28 animate-pulse rounded-card border border-border bg-border" />
  if (isError) return <SectionError title="Rentabilidad del empeño" error={error} onRetry={() => void refetch()} />
  if (!pawn) return null
  // Sobre el interés neto, igual que la cifra de al lado. Un backend anterior
  // a F1 no lo manda: ahí queda el bruto.
  const netYield = pawn.net_yield_on_current_portfolio_pct === undefined ? pawn.yield_on_current_portfolio_pct : pawn.net_yield_on_current_portfolio_pct

  return (
    <div className="rounded-card border border-border bg-card p-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-foreground">Rentabilidad del empeño</h2>
        <span className="text-xs text-muted-foreground">
          Intereses cobrados sobre el capital prestado. Incluye los abonos de hoy, aunque la caja siga abierta.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* F7-06: el interés NETO de descuentos —la misma cifra que
            «Intereses cobrados» del estado de resultados—. El bruto y el
            descuento van abajo, para explicar la resta. */}
        <KpiCard label="Intereses cobrados" value={<Money value={pawn.interest_revenue} tone="in" />} tone="success" />
        <KpiCard label="Cartera al corte de hoy" value={<Money value={pawn.capital_outstanding} />} />
        <KpiCard
          label="Rendimiento del período"
          value={
            <span className="tnum">
              {netYield === null ? '—' : `${Number(netYield).toFixed(2)}%`}
            </span>
          }
          tone={netYield === null ? undefined : 'success'}
        />
        <KpiCard label="Contratos abiertos" value={<span className="tnum">{pawn.open_contracts}</span>} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {pawn.payment_count} {pawn.payment_count === 1 ? 'abono' : 'abonos'} · {pawn.contracts_opened}{' '}
        {pawn.contracts_opened === 1 ? 'contrato nuevo' : 'contratos nuevos'}
        {Number(pawn.interest_discounts) > 0 && (
          <>
            {' '}
            · <span className="text-warning">
              <Money value={pawn.interest_collected} /> cobrados menos <Money value={pawn.interest_discounts} /> de descuentos de interés
            </span>
          </>
        )}
        {' '}· el rendimiento se calcula sobre la cartera actual, no sobre la que había al inicio del rango.
      </p>
    </div>
  )
}
