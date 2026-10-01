import { useMemo, useState, type ReactNode } from 'react'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import { EmptyState } from '@/components/shared/EmptyState'
import { DateRangePicker, type DateRangeValue } from '@/components/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import { exportSheetsToExcel } from '@/lib/export/xlsx'
import { formatQuantity, unitAbbr } from '@/lib/inventory/units'
import { ContractsStatusChart, type StatusDatum } from '@/components/shared/charts/ContractsStatusChart'
import { DailyTrendChart } from '@/components/shared/charts/DailyTrendChart'
import { MonthlyTrendChart } from '@/components/shared/charts/MonthlyTrendChart'
import { DonutChart, type DonutDatum } from '@/components/shared/charts/DonutChart'
import { MODULE_LABELS, movementLabel } from '@/lib/modules'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { todayBogota } from '@/lib/dates'
import { compareMoney, subtractMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useCategories } from '@/lib/catalogs/categories'
import { usePermission } from '@/lib/permissions/usePermission'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ContablesSection } from '@/features/reports/components/ContablesSection'
import { useExpenseCategories } from '@/features/cashbox/api'
import { useIncomeStatement, useClosingsBreakdown, useClosingsInRange, useCarteraActual, useExpensesByCategory, useItemSales, useMonthlySeries, MAX_RANGE_DAYS } from '@/features/reports/api'
import { aggregateCashDifferences, aggregateFinancialSummary, salesCashFlow, aggregateExpensesByCategory, computeDelta, daysBetweenDateOnly, previousRangeFor } from '@/features/reports/aggregate'
import { aggregateItemRanking } from '@/features/reports/rankings'
import { ModuleSplitBar } from '@/features/reports/components/ModuleSplitBar'
import { PawnCard, ProfitCard } from '@/features/reports/components/PerformanceCards'
import { SectionError } from '@/features/reports/components/SectionError'
import { incomeStatementCascade, incomeStatementRows, incomeStatementSheetRows } from '@/features/reports/incomeStatement'

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
    <div className="enter-up rounded-card border border-border bg-card p-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

function RankingList({ rows }: { rows: { key: string; label: string; quantity: number; revenue: string; unit: string }[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Sin ventas registradas todavía.</p>
  const max = rows[0]?.quantity ?? 1
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-foreground">{row.label}</span>
            <span className="tnum text-muted-foreground">
              {formatQuantity(row.quantity)} {unitAbbr(row.unit)}
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

/**
 * El estado de resultados del período — la respuesta a "¿cuánto ganó el
 * negocio?".
 *
 * Va en cascada y no como fila de KPIs sueltos porque el ORDEN es el
 * contenido: cada línea se explica por la anterior, y ver la resta es lo que
 * evita confundir ingreso con ganancia. Un KPI aislado que dijera "utilidad"
 * es justamente lo que estaba mal antes.
 *
 * No responde al filtro de módulo: un estado de resultados es del negocio
 * entero. Empeño y tienda por separado ya están en las tarjetas de abajo.
 */
function IncomeStatementCard({ range }: { range: DateRangeValue | null }) {
  const { data, isPending, isError, error, refetch } = useIncomeStatement(range)

  if (isPending) return <div className="h-56 animate-pulse rounded-card border border-border bg-border" />
  if (isError) return <SectionError title="Estado de resultados" error={error} onRetry={() => void refetch()} />
  if (!data) return null

  // Subtotales derivados de los renglones mostrados, con centavos si los
  // hay: lo que se ve se puede sumar a mano (ver `incomeStatementCascade`).
  const { rows: cascada, fractionDigits } = incomeStatementCascade(data)
  const utilidad = cascada.find((r) => r.kind === 'result')?.value ?? data.operating_profit
  const perdida = compareMoney(utilidad, '0') < 0
  const rows = incomeStatementRows(data)
  const informativas = rows.filter((r) => r.kind === 'info')
  const fuera = rows.filter((r) => r.kind === 'outside')

  return (
    <div className="rounded-card border border-border bg-card p-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-medium text-foreground">Estado de resultados</h2>
        <span className="text-xs text-muted-foreground">Del negocio completo — empeño y tienda juntos</span>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        {cascada.map((fila) =>
          fila.kind === 'result' ? (
            <div key={fila.key} className="mt-1 flex items-center justify-between gap-3 border-t-2 border-foreground/80 pt-2">
              <span className="font-semibold text-foreground">{fila.label}</span>
              <div className="flex items-center gap-3">
                {data.margin_pct !== null && (
                  <span className={cn('text-xs font-medium', perdida ? 'text-danger' : 'text-success')}>{Number(data.margin_pct)}% de margen</span>
                )}
                <Money value={fila.value} maximumFractionDigits={fractionDigits} className={cn('tnum text-lg font-semibold', perdida ? 'text-danger' : 'text-success')} />
              </div>
            </div>
          ) : fila.kind === 'subtotal' ? (
            // Los subtotales van DONDE corresponden, no al final: ver que la
            // utilidad bruta sale de restar el costo es media explicación.
            <div key={fila.key} className="flex items-center justify-between gap-3 border-t border-border py-1.5">
              <span className="font-medium text-foreground">{fila.label}</span>
              <Money value={fila.value} maximumFractionDigits={fractionDigits} className="tnum font-medium text-foreground" />
            </div>
          ) : (
            <div key={fila.key} className="flex items-center justify-between gap-3 py-1">
              <span className="text-muted-foreground">
                {fila.kind === 'subtract' && <span className="mr-1">−</span>}
                {fila.kind === 'signed' && <span className="mr-1">±</span>}
                {fila.label}
                {fila.hint && <span className="ml-2 text-xs text-muted-foreground/70">{fila.hint}</span>}
              </span>
              {/* Los descuadres traen su signo: un faltante se pinta negativo
                  y en rojo, un sobrante positivo. */}
              <Money
                value={fila.value}
                maximumFractionDigits={fractionDigits}
                tone={fila.kind === 'subtract' || (fila.kind === 'signed' && compareMoney(fila.value, '0') < 0) ? 'out' : undefined}
                className="tnum"
              />
            </div>
          ),
        )}
      </div>

      {/* Lo que ya está contado en otra línea: se nombra para explicar la
          cifra, no se suma otra vez. */}
      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 border-t border-border pt-2 text-xs sm:grid-cols-2">
        {informativas.map((fila) => (
          <div key={fila.key} className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">
              {fila.label}
              {fila.hint && <span className="ml-1 text-muted-foreground/70">({fila.hint.toLowerCase()})</span>}
            </dt>
            <dd>
              <Money value={fila.value} className="text-foreground" />
            </dd>
          </div>
        ))}
      </dl>

      {/* Lo que NO es resultado, dicho explícitamente. Sin esta nota, alguien
          que compró mucho este mes buscaría esas compras en los gastos y
          concluiría que el reporte está mal. */}
      <div className="mt-3 border-t border-border pt-2 text-xs">
        <p className="mb-1 text-muted-foreground">Fuera del resultado, porque no son ingreso ni gasto (la mercancía se vuelve costo al venderse):</p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {fuera.map((fila) => (
            <div key={fila.key} className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">
                {fila.label}
                {fila.hint && <span className="ml-1 text-muted-foreground/70">({fila.hint.toLowerCase()})</span>}
              </dt>
              <dd>
                <Money value={fila.value} className="text-foreground" />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

export function ReportesPage() {
  const [range, setRange] = useState<DateRangeValue | null>(defaultRange())
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const rangeDays = range ? daysBetweenDateOnly(range.from, range.to) : 0
  const rangeTooWide = !!range && rangeDays > MAX_RANGE_DAYS
  const previousRange = range && !rangeTooWide ? previousRangeFor(range) : null

  // 00031: el resumen financiero del período se arma con los cierres de caja,
  // que ahora son histórico y llevan su propio permiso.
  const canViewHistory = usePermission('cashbox.view_history')
  // Dos queries en paralelo por rango: el desglose agregado (`closings-breakdown`,
  // una sola consulta) y el listado de cierres (necesario para `sessionCount`/
  // `byDay` completos y para los `session_id` de `useExpensesByCategory` — ver
  // `features/reports/api.ts`). Ya no hay N+1 de `GET /cashbox/sessions/{id}/report`.
  const { data: breakdown, isPending: breakdownPending, isError: breakdownError, refetch: refetchBreakdown } = useClosingsBreakdown(range)
  const { data: closings, isPending: closingsPending, isError: closingsError, refetch: refetchClosings } = useClosingsInRange(range)
  const { data: previousBreakdown } = useClosingsBreakdown(previousRange)
  const { data: previousClosings } = useClosingsInRange(previousRange)
  const isPending = breakdownPending || closingsPending
  const isError = breakdownError || closingsError
  const refetch = () => {
    void refetchBreakdown()
    void refetchClosings()
  }
  const { data: cartera } = useCarteraActual()
  const { data: expenses } = useExpensesByCategory(closings)
  const { data: expenseCategories } = useExpenseCategories()
  const { data: itemSales } = useItemSales(rangeTooWide ? null : range)
  const { data: series } = useMonthlySeries(12)
  const { data: categories } = useCategories()
  // Mismo hook que ya usa `IncomeStatementCard` — misma query key, mismo
  // cache: no dispara un segundo request, solo lee lo que ya está pedido.
  const { data: incomeStatement } = useIncomeStatement(range)
  const { data: previousIncomeStatement } = useIncomeStatement(previousRange)
  const [isExporting, setIsExporting] = useState(false)

  const moduleParam = moduleFilter === 'all' ? undefined : moduleFilter
  const sessionDates = useMemo(() => closings?.map((c) => c.session_date) ?? [], [closings])
  const previousSessionDates = useMemo(() => previousClosings?.map((c) => c.session_date) ?? [], [previousClosings])
  const summary = useMemo(
    () => aggregateFinancialSummary(breakdown?.lines ?? [], sessionDates, moduleParam),
    [breakdown, sessionDates, moduleParam],
  )
  // F7-05: las ventas del KPI son FLUJO (cobrado − anulado − devuelto), no
  // el ingreso contable, que es el del estado de resultados.
  const ventasFlujo = useMemo(() => salesCashFlow(breakdown?.lines ?? [], breakdown?.sales_flow, moduleParam), [breakdown, moduleParam])
  const previousVentasFlujo = useMemo(
    () => (previousBreakdown ? salesCashFlow(previousBreakdown.lines, previousBreakdown.sales_flow, moduleParam) : null),
    [previousBreakdown, moduleParam],
  )
  const menosVentas = (s: typeof summary, v: typeof ventasFlujo) => subtractMoney(subtractMoney(s.ingresosOperativos, v.anulaciones), v.devolucionesPagadas)
  const cobrosOperativos = menosVentas(summary, ventasFlujo)
  // F21-14: `difference` ya venía en cada cierre y se descartaba.
  const cashDifferences = useMemo(() => aggregateCashDifferences(closings ?? []), [closings])
  const previousSummary = useMemo(
    () => (previousBreakdown ? aggregateFinancialSummary(previousBreakdown.lines, previousSessionDates, moduleParam) : null),
    [previousBreakdown, previousSessionDates, moduleParam],
  )
  const previousCobrosOperativos = previousSummary && previousVentasFlujo ? menosVentas(previousSummary, previousVentasFlujo) : undefined

  // Filtrado por el mismo módulo que el resto de la página — `ExpenseOut.module`
  // usa el mismo enum pawn|store|general que `BreakdownLineOut.module`.
  const filteredExpenses = useMemo(() => (moduleParam ? expenses?.filter((e) => e.module === moduleParam) : expenses), [expenses, moduleParam])
  const expensesByCategory = useMemo(
    () => (filteredExpenses && expenseCategories ? aggregateExpensesByCategory(filteredExpenses, expenseCategories) : []),
    [filteredExpenses, expenseCategories],
  )
  const ranking = useMemo(
    () => (itemSales && categories ? aggregateItemRanking(itemSales.sales, itemSales.items, categories, itemSales.returns) : { topItems: [], topCategories: [] }),
    [itemSales, categories],
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

  // A diferencia de Inventario/Contratos/Ventas, acá no hay nada que pedir:
  // todo lo que se exporta ya está en memoria (`summary`/`incomeStatement`/
  // `ranking`), calculado a partir de lo que la pantalla ya cargó para
  // pintarse. Tres hojas — Resumen, Desglose, Rankings — porque Reportes no
  // es "una fila por registro" como los otros tres, es varias tablas
  // distintas armadas en la misma pantalla.
  async function handleExportReport() {
    setIsExporting(true)
    try {
      // F7-12: con signo y con las líneas nuevas, ver `incomeStatementSheetRows`.
      const resumen = incomeStatement ? incomeStatementSheetRows(incomeStatement) : []

      const desglose = summary.totalsByConcept.map((line) => ({
        Módulo: MODULE_LABELS[line.module as keyof typeof MODULE_LABELS] ?? line.module,
        Concepto: movementLabel(line.concept, line.direction),
        Medio: PAYMENT_METHOD_LABELS[line.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? line.paymentMethod,
        Dirección: line.direction === 'in' ? 'Entrada' : 'Salida',
        Total: Number(line.total),
      }))

      const rankings = [
        ...ranking.topItems.map((i) => ({ Tipo: 'Prenda', Nombre: i.code ? `${i.name} (${i.code})` : i.name, Cantidad: i.quantity, Unidad: unitAbbr(i.unit), Ingresos: Number(i.revenue) })),
        ...ranking.topCategories.map((c) => ({ Tipo: 'Categoría', Nombre: c.path, Cantidad: c.quantity, Unidad: unitAbbr(c.unit), Ingresos: Number(c.revenue) })),
      ]

      await exportSheetsToExcel(`reportes-${range?.from ?? todayBogota()}-a-${range?.to ?? todayBogota()}.xlsx`, [
        { name: 'Resumen', rows: resumen },
        { name: 'Desglose', rows: desglose },
        { name: 'Rankings', rows: rankings },
      ])
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reportes" description="Cómo va el negocio: resultados del período y estado contable de hoy." />

      {/* Dos pestañas porque son dos preguntas con forma distinta.
          "Período" resume un RANGO y por eso lleva selector de fechas.
          "Contabilidad" es una FOTO DE HOY: cuánto debo, cuánto tengo en
          mercancía, qué no rota. Esas no tienen versión "en marzo" —o se
          debe hoy o no se debe— así que meterlas bajo el mismo selector de
          fechas habría prometido un filtro que no significa nada. */}
      <Tabs defaultValue="periodo">
        <TabsList>
          <TabsTrigger value="periodo">Período</TabsTrigger>
          <TabsTrigger value="contabilidad">Contabilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="periodo" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !range || rangeTooWide || !closings || closings.length === 0}
              onClick={handleExportReport}
            >
              <Download className="size-4" />
              {isExporting ? 'Exportando…' : 'Exportar a Excel'}
            </Button>
            <DateRangePicker value={range} onChange={setRange} />
          </div>

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
        <div className="rounded-card border border-border bg-card">
          <EmptyState title="Elige un rango de fechas" description="O un día específico — arriba a la derecha." />
        </div>
      ) : rangeTooWide ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title={`Elige un rango de ${MAX_RANGE_DAYS} días o menos`}
            description="Los gastos por categoría todavía se piden sesión por sesión — rangos más largos necesitan un endpoint de agregación para esa dimensión en el backend."
          />
        </div>
      ) : !canViewHistory ? (
        // El resumen financiero se arma sumando cada cierre de caja del
        // rango, así que sin permiso de histórico no hay con qué armarlo.
        // Decirlo así evita el peor mensaje posible: un skeleton eterno o un
        // "no se pudo cargar" que manda a buscar una falla que no existe.
        <div className="rounded-card border border-border bg-card">
          <EmptyState
            title="Necesitas permiso de histórico de caja"
            description="Este reporte se arma con los cierres de caja del período. Pídele a un administrador el permiso “Ver el histórico de cierres de caja”."
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
      ) : !closings || closings.length === 0 ? (
        <div className="rounded-card border border-border bg-card">
          <EmptyState title="No hay cierres de caja en este rango" description="El reporte se arma a partir de las sesiones de caja ya cerradas." />
        </div>
      ) : (
        <>
          <KpiRow>
            {/* F7-05: estas tarjetas salen de los cierres de caja — son
                FLUJO, y por eso no dicen «ingresos»: el ingreso del período
                es el del estado de resultados de abajo, y dos cifras
                distintas con el mismo nombre en la misma pantalla es lo que
                hace que nadie le crea a ninguna. */}
            <KpiCard
              label="Cobros operativos, netos"
              value={<Money value={cobrosOperativos} tone="in" />}
              tone="success"
              delta={delta(cobrosOperativos, previousCobrosOperativos, 'up')}
            />
            <KpiCard
              label="Gastos operativos"
              value={<Money value={summary.gastosOperativos} tone="out" />}
              tone="danger"
              delta={delta(summary.gastosOperativos, previousSummary?.gastosOperativos, 'down')}
            />
            {/* La utilidad ya NO se calcula acá. El KPI que vivía en este
                lugar hacía `ingresos − gastos` y nunca restaba el costo de
                ventas, así que una cadena vendida en 500.000 que costó
                300.000 contaba como 500.000 de utilidad — y convivía en esta
                misma pantalla con "Utilidad bruta de tienda", que sí lo
                restaba. Dos cifras contradiciéndose.
                Ahora sale del backend, en su propia tarjeta abajo. */}
            <KpiCard label="Intereses cobrados" value={<Money value={summary.intereses} />} delta={delta(summary.intereses, previousSummary?.intereses, 'up')} />
            <KpiCard
              label="Ventas cobradas, netas"
              value={<Money value={ventasFlujo.neto} />}
              tone="brand"
              delta={delta(ventasFlujo.neto, previousVentasFlujo?.neto, 'up')}
            />
          </KpiRow>
          <p className="-mt-3 text-xs text-muted-foreground">
            Flujo de caja de los cierres del período: lo cobrado menos anulaciones y devoluciones pagadas. No es el ingreso contable — ese es el del
            estado de resultados.
          </p>

          <IncomeStatementCard range={range} />

          {showCapitalTienda && <ProfitCard range={range} />}
          {showCapitalEmpeño && <PawnCard range={range} />}

          {showCapital && (
            <div className="rounded-card border border-border bg-card p-card">
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
                  // F7-16: lo PAGADO a proveedores en el período, por la fecha
                  // del pago — del estado de resultados, no de la caja. Lo
                  // causado (compras a crédito incluidas) está en el estado
                  // de resultados como «Compras causadas».
                  <KpiCard
                    label="Pagos de compras (inversión en inventario)"
                    value={<Money value={incomeStatement?.inventory_purchases_paid ?? '0.00'} tone="out" />}
                    delta={incomeStatement ? delta(incomeStatement.inventory_purchases_paid, previousIncomeStatement?.inventory_purchases_paid, 'down') : undefined}
                  />
                )}
              </div>
            </div>
          )}

          {/* F21-14. Va sin importar el filtro de módulo porque el arqueo no
              tiene módulo: se cuenta el cajón entero. Faltantes y sobrantes
              por separado — no se compensan; el neto es un dato más, no el
              resumen (ver `aggregateCashDifferences`). */}
          <div className="enter-up rounded-card border border-border bg-card p-card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 className="text-sm font-medium text-foreground">Descuadres de caja al cierre</h2>
              <span className="text-xs text-muted-foreground">
                Lo contado frente a lo que el sistema esperaba en cada cierre del período. Es de toda la caja: no se separa por módulo.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard
                label="Faltantes"
                value={<Money value={cashDifferences.faltantes} tone={cashDifferences.shortageCount > 0 ? 'out' : undefined} />}
                hint={cashDifferences.shortageCount === 1 ? 'En 1 cierre' : `En ${cashDifferences.shortageCount} cierres`}
              />
              <KpiCard
                label="Sobrantes"
                value={<Money value={cashDifferences.sobrantes} />}
                hint={cashDifferences.surplusCount === 1 ? 'En 1 cierre' : `En ${cashDifferences.surplusCount} cierres`}
              />
              <KpiCard
                label="Neto (sobrantes − faltantes)"
                value={<Money value={cashDifferences.neto} tone={compareMoney(cashDifferences.neto, '0') < 0 ? 'out' : undefined} />}
                hint="No se compensan: cada descuadre es un error de conteo"
              />
              <KpiCard
                label="Cierres con descuadre"
                value={`${cashDifferences.sessionsWithDifference} de ${cashDifferences.sessionCount}`}
                tone={cashDifferences.sessionsWithDifference > 0 ? 'danger' : 'default'}
              />
            </div>
            <p className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
              No incluye los descuadres del conteo de apertura: esos se registran como ajuste de la cuenta, fuera de la sesión. El estado de
              resultados sí los incluye (su línea «Descuadres de caja» suma apertura y cierre), por eso las dos cifras pueden no coincidir.
            </p>
          </div>

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
                      <td className="px-3 py-2 text-foreground">{movementLabel(line.concept, line.direction)}</td>
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

      {/* Fuera del bloque que exige cierres de caja en el rango, a propósito:
          la serie de 12 meses no depende del rango, así que esconderla porque
          el mes en curso todavía no tiene cierres —justo lo que pasa el día 1
          de cada mes— borraría la tendencia del año entero cuando más se
          necesita. Sale de los documentos, así que no necesita cierres. */}
      {series && series.points.length > 0 && (
        <CardShell title="Últimos 12 meses — ventas, intereses y gastos" subtitle="Independiente del rango elegido arriba">
          <MonthlyTrendChart data={series.points} />
        </CardShell>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-foreground">Lo más vendido del período</h2>
        <p className="-mt-3 text-xs text-muted-foreground">Del mismo rango de fechas elegido arriba.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CardShell title="Prendas más vendidas">
            <RankingList rows={ranking.topItems.map((i) => ({ key: i.itemId, label: i.code ? `${i.name} (${i.code})` : i.name, quantity: i.quantity, revenue: i.revenue, unit: i.unit }))} />
          </CardShell>
          <CardShell title="Categorías más movidas">
            <RankingList rows={ranking.topCategories.map((c) => ({ key: `${c.categoryId}|${c.unit}`, label: c.path, quantity: c.quantity, revenue: c.revenue, unit: c.unit }))} />
          </CardShell>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="contabilidad">
          <ContablesSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
