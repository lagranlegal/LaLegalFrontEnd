import { useMemo, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import { EmptyState } from '@/components/shared/EmptyState'
import { DateRangePicker, type DateRangeValue } from '@/components/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import { ContractsStatusChart, type StatusDatum } from '@/components/shared/charts/ContractsStatusChart'
import { DailyTrendChart } from '@/components/shared/charts/DailyTrendChart'
import { DonutChart, type DonutDatum } from '@/components/shared/charts/DonutChart'
import { MODULE_LABELS, conceptLabel } from '@/lib/modules'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { todayBogota } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useCategories } from '@/lib/catalogs/categories'
import { useExpenseCategories } from '@/features/cashbox/api'
import { useRawSessions, useCarteraActual, useExpensesByCategory, useAllTimeItemSales, useProfitSummary, usePawnPerformance, MAX_RANGE_DAYS } from '@/features/reports/api'
import { aggregateFinancialSummary, aggregateExpensesByCategory, computeDelta, daysBetweenDateOnly, previousRangeFor } from '@/features/reports/aggregate'
import { aggregateItemRanking } from '@/features/reports/rankings'
import { ModuleSplitBar } from '@/features/reports/components/ModuleSplitBar'

type ModuleFilter = 'all' | 'pawn' | 'store'

const MODULE_TABS: { value: ModuleFilter; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'pawn', label: 'Empeño' },
  { value: 'store', label: 'Tienda' },
]

function defaultRange(): DateRangeValue {
  const today = todayBogota()
  const [year, month] = today.split('-')
  return { from: `${year}-${month}-01`, to: today }
}

function ReportesSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 rounded-card border border-border bg-card p-card sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-20 animate-pulse rounded bg-border" />
            <div className="h-6 w-16 animate-pulse rounded bg-border" />
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card border border-border bg-card" />
    </div>
  )
}

function CardShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    // `enter-up` en el card, no en cada fila o segmento: animar cada dato por
    // separado convierte un reporte en un espectáculo y retrasa la lectura.
    <div className="enter-up rounded-card border border-border bg-card p-card shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
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
function ProfitCard({ range }: { range: DateRangeValue | null }) {
  const { data: profit, isPending, isError } = useProfitSummary(range)

  if (isPending) return <div className="h-28 animate-pulse rounded-card border border-border bg-muted/40" />
  if (isError || !profit) return null

  const loss = Number(profit.gross_profit) < 0

  return (
    <div className="rounded-card border border-border bg-card p-card shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-foreground">Utilidad bruta de tienda</h2>
        <span className="text-xs text-muted-foreground">
          Ventas menos el costo de la mercancía vendida. No descuenta gastos operativos.
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
          {profit.sale_count} {profit.sale_count === 1 ? 'venta' : 'ventas'} · {profit.units_sold}{' '}
          {profit.units_sold === 1 ? 'artículo' : 'artículos'}
          {Number(profit.discounts) > 0 && (
            <>
              {' '}
              · descuentos aplicados <Money value={profit.discounts} />
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
function PawnCard({ range }: { range: DateRangeValue | null }) {
  const { data: pawn, isPending, isError } = usePawnPerformance(range)

  if (isPending) return <div className="h-28 animate-pulse rounded-card border border-border bg-muted/40" />
  if (isError || !pawn) return null

  return (
    <div className="rounded-card border border-border bg-card p-card shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-foreground">Rentabilidad del empeño</h2>
        <span className="text-xs text-muted-foreground">
          Intereses cobrados sobre el capital prestado. Incluye los abonos de hoy, aunque la caja siga abierta.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Intereses cobrados" value={<Money value={pawn.interest_collected} tone="in" />} tone="success" />
        <KpiCard label="Cartera al corte de hoy" value={<Money value={pawn.capital_outstanding} />} />
        <KpiCard
          label="Rendimiento del período"
          value={
            <span className="tnum">
              {pawn.yield_on_current_portfolio_pct === null ? '—' : `${Number(pawn.yield_on_current_portfolio_pct).toFixed(2)}%`}
            </span>
          }
          tone={pawn.yield_on_current_portfolio_pct === null ? undefined : 'success'}
        />
        <KpiCard label="Contratos abiertos" value={<span className="tnum">{pawn.open_contracts}</span>} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {pawn.payment_count} {pawn.payment_count === 1 ? 'abono' : 'abonos'} · {pawn.contracts_opened}{' '}
        {pawn.contracts_opened === 1 ? 'contrato nuevo' : 'contratos nuevos'}
        {Number(pawn.interest_discounts) > 0 && (
          <>
            {' '}
            · <span className="text-warning">descuentos de interés <Money value={pawn.interest_discounts} /></span>
          </>
        )}
        {' '}· el rendimiento se calcula sobre la cartera actual, no sobre la que había al inicio del rango.
      </p>
    </div>
  )
}

function RankingList({ rows, unit }: { rows: { key: string; label: string; quantity: number; revenue: string }[]; unit: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Sin ventas registradas todavía.</p>
  const max = rows[0]?.quantity ?? 1
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-foreground">{row.label}</span>
            <span className="tnum text-muted-foreground">
              {row.quantity} {unit}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-pill bg-border">
            <div className="h-full rounded-pill bg-primary" style={{ width: `${Math.round((row.quantity / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ReportesPage() {
  const [range, setRange] = useState<DateRangeValue | null>(defaultRange())
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const rangeDays = range ? daysBetweenDateOnly(range.from, range.to) : 0
  const rangeTooWide = !!range && rangeDays > MAX_RANGE_DAYS
  const previousRange = range && !rangeTooWide ? previousRangeFor(range) : null

  const { data: sessions, isPending, isError, refetch } = useRawSessions(range)
  const { data: previousSessions } = useRawSessions(previousRange)
  const { data: cartera } = useCarteraActual()
  const { data: expenses } = useExpensesByCategory(sessions)
  const { data: expenseCategories } = useExpenseCategories()
  const { data: allTimeSales } = useAllTimeItemSales()
  const { data: categories } = useCategories()

  const moduleParam = moduleFilter === 'all' ? undefined : moduleFilter
  const summary = useMemo(() => aggregateFinancialSummary(sessions ?? [], moduleParam), [sessions, moduleParam])
  const previousSummary = useMemo(() => (previousSessions ? aggregateFinancialSummary(previousSessions, moduleParam) : null), [previousSessions, moduleParam])

  // Filtrado por el mismo módulo que el resto de la página — `ExpenseOut.module`
  // usa el mismo enum pawn|store|general que `BreakdownLineOut.module`.
  const filteredExpenses = useMemo(() => (moduleParam ? expenses?.filter((e) => e.module === moduleParam) : expenses), [expenses, moduleParam])
  const expensesByCategory = useMemo(
    () => (filteredExpenses && expenseCategories ? aggregateExpensesByCategory(filteredExpenses, expenseCategories) : []),
    [filteredExpenses, expenseCategories],
  )
  const ranking = useMemo(
    () => (allTimeSales && categories ? aggregateItemRanking(allTimeSales.sales, allTimeSales.items, categories) : { topItems: [], topCategories: [] }),
    [allTimeSales, categories],
  )

  // Ingreso OPERATIVO por medio de pago (ya filtrado por módulo dentro de
  // `aggregateFinancialSummary`) — NO todo lo que entra, eso incluiría
  // capital abonado y no cuadraría con el KPI "Ingresos operativos" de arriba.
  const paymentMethodDonut: DonutDatum[] = summary.ingresosOperativosByPaymentMethod.map((p) => ({
    key: p.paymentMethod,
    label: PAYMENT_METHOD_LABELS[p.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? p.paymentMethod,
    value: Number(p.total),
  }))

  const expenseDonut: DonutDatum[] = expensesByCategory.map((e) => ({ key: e.categoryId, label: e.name, value: Number(e.total) }))

  const delta = (current: string, previous: string | undefined, direction: 'up' | 'down') => (previous === undefined ? undefined : computeDelta(current, previous, direction))

  const showEmpeñoTiendaSplit = moduleFilter === 'all'
  // Préstamos (empeño) y compras de mercancía (tienda) son la MISMA idea
  // contable: efectivo que se convierte en un activo, no en un gasto. Van en
  // la misma card con una sola explicación; cada fila aparece según el módulo
  // que se esté mirando.
  const showCapitalEmpeño = moduleFilter !== 'store'
  const showCapitalTienda = moduleFilter !== 'pawn'
  const showCapital = showCapitalEmpeño || showCapitalTienda
  const showCartera = moduleFilter !== 'store'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reportes" description="Información financiera del período — intereses, capital, ventas y gastos." actions={<DateRangePicker value={range} onChange={setRange} />} />

      <div className="flex flex-wrap gap-2">
        {MODULE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setModuleFilter(tab.value)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
              moduleFilter === tab.value ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!range ? (
        <div className="rounded-card border border-border bg-card shadow-card">
          <EmptyState title="Elige un rango de fechas" description="O un día específico — arriba a la derecha." />
        </div>
      ) : rangeTooWide ? (
        <div className="rounded-card border border-border bg-card shadow-card">
          <EmptyState
            title={`Elige un rango de ${MAX_RANGE_DAYS} días o menos`}
            description="Este reporte suma cada sesión de caja del rango una por una — rangos más largos necesitan un endpoint de agregación en el backend (docs/PENDIENTES_BACKEND_INFRA.md, punto 13)."
          />
        </div>
      ) : isPending ? (
        <ReportesSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
          <p className="text-sm text-muted-foreground">No se pudo cargar el reporte de este rango.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <div className="rounded-card border border-border bg-card shadow-card">
          <EmptyState title="No hay cierres de caja en este rango" description="El reporte se arma a partir de las sesiones de caja ya cerradas." />
        </div>
      ) : (
        <>
          <KpiRow>
            <KpiCard
              label="Ingresos operativos"
              value={<Money value={summary.ingresosOperativos} tone="in" />}
              tone="success"
              delta={delta(summary.ingresosOperativos, previousSummary?.ingresosOperativos, 'up')}
            />
            <KpiCard
              label="Gastos operativos"
              value={<Money value={summary.gastosOperativos} tone="out" />}
              tone="danger"
              delta={delta(summary.gastosOperativos, previousSummary?.gastosOperativos, 'down')}
            />
            <KpiCard
              label="Utilidad operativa"
              value={<Money value={summary.utilidadOperativa} />}
              tone={Number(summary.utilidadOperativa) < 0 ? 'danger' : 'success'}
              delta={delta(summary.utilidadOperativa, previousSummary?.utilidadOperativa, 'up')}
            />
            <KpiCard label="Intereses cobrados" value={<Money value={summary.intereses} />} delta={delta(summary.intereses, previousSummary?.intereses, 'up')} />
            <KpiCard label="Ventas" value={<Money value={summary.ventas} />} tone="brand" delta={delta(summary.ventas, previousSummary?.ventas, 'up')} />
          </KpiRow>

          {showCapitalTienda && <ProfitCard range={range} />}
          {showCapitalEmpeño && <PawnCard range={range} />}

          {showCapital && (
            <div className="rounded-card border border-border bg-card p-card shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <h2 className="text-sm font-medium text-foreground">Movimiento de capital</h2>
                <span className="text-xs text-muted-foreground">
                  No es ingreso ni gasto — prestar, recuperar o comprar mercancía convierte efectivo en un activo, no cambia la utilidad.
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {showCapitalEmpeño && (
                  <>
                    <KpiCard label="Capital desembolsado (préstamos nuevos)" value={<Money value={summary.capitalDesembolsado} tone="out" />} />
                    <KpiCard label="Capital abonado (recuperado)" value={<Money value={summary.capitalAbonado} tone="in" />} />
                  </>
                )}
                {showCapitalTienda && (
                  <KpiCard
                    label="Compras a proveedor (inversión en inventario)"
                    value={<Money value={summary.comprasInventario} tone="out" />}
                    delta={delta(summary.comprasInventario, previousSummary?.comprasInventario, 'down')}
                  />
                )}
              </div>
            </div>
          )}

          {(showEmpeñoTiendaSplit || showCartera) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {showEmpeñoTiendaSplit && (
                <CardShell title="Empeño vs Tienda — participación en ingresos operativos">
                  <ModuleSplitBar pawn={summary.ingresosOperativosByModule.pawn} store={summary.ingresosOperativosByModule.store} />
                </CardShell>
              )}

              {showCartera && (
                <CardShell title="Cartera actual" subtitle="Corte de hoy">
                  {cartera && (
                    <>
                      <p className="tnum mb-3 text-2xl font-semibold text-foreground">
                        <Money value={cartera.contracts.capital_outstanding} />
                      </p>
                      <ContractsStatusChart
                        data={
                          [
                            { key: 'active', label: 'Vigentes', count: cartera.contracts.active_count, color: 'var(--status-active)' },
                            { key: 'in_arrears', label: 'En mora', count: cartera.contracts.in_arrears_count, color: 'var(--status-arrears)' },
                            { key: 'in_extension', label: 'Prórroga', count: cartera.contracts.in_extension_count, color: 'var(--status-extension)' },
                            { key: 'auctioned', label: 'Rematados', count: cartera.contracts.auctioned_count, color: 'var(--status-auctioned)' },
                          ] satisfies StatusDatum[]
                        }
                      />
                    </>
                  )}
                </CardShell>
              )}
            </div>
          )}

          <CardShell title="Tendencia diaria — ingresos vs gastos operativos">
            <DailyTrendChart data={summary.byDay} />
          </CardShell>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CardShell title="Gastos por categoría">
              <DonutChart data={expenseDonut} />
            </CardShell>
            <CardShell title="Medio de pago (ingresos)">
              <DonutChart data={paymentMethodDonut} />
            </CardShell>
          </div>

          <CardShell title="Desglose por módulo, concepto y medio de pago">
            <div className="overflow-x-auto rounded-input border border-border">
              <table className="w-full text-sm">
                <thead className="bg-background text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Módulo</th>
                    <th className="px-3 py-2 font-medium">Concepto</th>
                    <th className="px-3 py-2 font-medium">Medio</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.totalsByConcept.map((line, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-foreground">{MODULE_LABELS[line.module as keyof typeof MODULE_LABELS] ?? line.module}</td>
                      <td className="px-3 py-2 text-foreground">{conceptLabel(line.concept)}</td>
                      <td className="px-3 py-2 text-foreground">{PAYMENT_METHOD_LABELS[line.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? line.paymentMethod}</td>
                      <td className="px-3 py-2 text-right">
                        <Money value={line.total} tone={line.direction === 'out' ? 'out' : 'in'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardShell>
        </>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Histórico completo</h2>
        <p className="-mt-3 text-xs text-muted-foreground">No depende del rango elegido arriba — GET /sales todavía no tiene filtro de fecha en el backend.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardShell title="Prendas más vendidas">
            <RankingList rows={ranking.topItems.map((i) => ({ key: i.itemId, label: i.code ? `${i.name} (${i.code})` : i.name, quantity: i.quantity, revenue: i.revenue }))} unit="uds" />
          </CardShell>
          <CardShell title="Categorías más movidas">
            <RankingList rows={ranking.topCategories.map((c) => ({ key: c.categoryId, label: c.name, quantity: c.quantity, revenue: c.revenue }))} unit="uds" />
          </CardShell>
        </div>
      </div>
    </div>
  )
}
