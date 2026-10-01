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
import { FilterChip } from '@/components/shared/FilterChip'
import { useCategories } from '@/lib/catalogs/categories'
import { usePermission } from '@/lib/permissions/usePermission'
import { PageTabs, PageTabsContent } from '@/components/shared/PageTabs'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { DataTable } from '@/components/shared/DataTable'
import { IndexedSection, SectionIndexLayout, type IndexSection } from '@/components/shared/SectionIndex'
import { formatPercent } from '@/lib/percent'
import { KPI_GRID, KPI_GRID_3 } from '@/features/reports/layout'
import type { ColumnDef } from '@tanstack/react-table'
import { ContablesSection } from '@/features/reports/components/ContablesSection'
import { useExpenseCategories } from '@/features/cashbox/api'
import { useIncomeStatement, useClosingsBreakdown, useClosingsInRange, useCarteraActual, useExpensesByCategory, useItemSales, useMonthlySeries, MAX_RANGE_DAYS } from '@/features/reports/api'
import { type ConceptTotal, aggregateCashDifferences, aggregateFinancialSummary, salesCashFlow, aggregateExpensesByCategory, computeDelta, daysBetweenDateOnly, previousRangeFor } from '@/features/reports/aggregate'
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
  // `enter-up` en el card, no en cada fila o segmento: animar cada dato por
  // separado convierte un reporte en un espectáculo y retrasa la lectura.
  return (
    <SummaryCard title={title} description={subtitle} className="enter-up">
      {children}
    </SummaryCard>
  )
}

type DesgloseRow = ConceptTotal & { key: string }

/**
 * El desglose en `DataTable` (la tabla única): dinero a la derecha y en color
 * de texto. La dirección va dicha en su columna, como en el Excel, y no en
 * verde o rojo: una salida de plata no es una alarma (F9-07).
 */
const DESGLOSE_COLUMNS: ColumnDef<DesgloseRow>[] = [
  { id: 'module', header: 'Módulo', cell: ({ row }) => MODULE_LABELS[row.original.module as keyof typeof MODULE_LABELS] ?? row.original.module },
  { id: 'concept', header: 'Concepto', cell: ({ row }) => movementLabel(row.original.concept, row.original.direction) },
  {
    id: 'method',
    header: 'Medio',
    cell: ({ row }) => PAYMENT_METHOD_LABELS[row.original.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? row.original.paymentMethod,
  },
  {
    id: 'direction',
    header: 'Dirección',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.direction === 'in' ? 'Entrada' : 'Salida'}</span>,
  },
  { id: 'total', header: 'Total', meta: { align: 'right' }, cell: ({ row }) => <Money value={row.original.total} className="font-semibold text-foreground" /> },
]

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
    <SummaryCard title="Estado de resultados" description="Del negocio completo — empeño y tienda juntos">
      <div className="flex flex-col gap-1 text-sm">
        {cascada.map((fila) =>
          fila.kind === 'result' ? (
            <div key={fila.key} className="mt-1 flex items-center justify-between gap-3 border-t-2 border-foreground/80 pt-2">
              <span className="font-semibold text-foreground">{fila.label}</span>
              <div className="flex items-center gap-3">
                {/* La cifra en tinta, como todo KPI (F9-07); el color va en
                    el margen, que es la lectura: verde si ganó, rojo si perdió. */}
                {data.margin_pct !== null && (
                  <span className={cn('tnum text-xs font-medium', perdida ? 'text-danger' : 'text-success')}>{formatPercent(data.margin_pct)} de margen</span>
                )}
                <Money value={fila.value} maximumFractionDigits={fractionDigits} className="tnum text-lg font-semibold text-foreground" />
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
              {/* Lo que se resta ya lleva su «−» en el rótulo: la cifra va en
                  tinta. Un descuadre trae su signo: el faltante (negativo) es
                  lo único en rojo, porque pide acción. */}
              <Money
                value={fila.value}
                maximumFractionDigits={fractionDigits}
                className={cn('tnum', fila.kind === 'signed' && compareMoney(fila.value, '0') < 0 ? 'text-danger' : 'text-foreground')}
              />
            </div>
          ),
        )}
      </div>

      {/* Lo que ya está contado en otra línea: se nombra para explicar la
          cifra, no se suma otra vez. */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 border-t border-border pt-2 text-xs sm:grid-cols-2">
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
      <div className="border-t border-border pt-2 text-xs">
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
    </SummaryCard>
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

  const loaded = !!range && !rangeTooWide && canViewHistory && !isPending && !isError && !!closings && closings.length > 0
  const showSeries = !!series && series.points.length > 0
  const desgloseRows = summary.totalsByConcept.map((line, index) => ({ ...line, key: String(index) }))

  // El índice nombra solo lo que está en pantalla: con el filtro «Tienda» no
  // hay rentabilidad del empeño, y sin cierres en el rango, solo el aviso.
  const sections: IndexSection[] = loaded
    ? [
        { id: 'resumen', label: 'Resumen del período' },
        { id: 'estado-resultados', label: 'Estado de resultados' },
        ...(showCapitalTienda ? [{ id: 'utilidad-tienda', label: 'Utilidad bruta de tienda' }] : []),
        ...(showCapitalEmpeño ? [{ id: 'rentabilidad-empeno', label: 'Rentabilidad del empeño' }] : []),
        ...(showCapital ? [{ id: 'movimiento-capital', label: 'Movimiento de capital' }] : []),
        { id: 'descuadres', label: 'Descuadres de caja' },
        ...(showEmpeñoTiendaSplit || showCartera
          ? [{ id: 'participacion', label: showEmpeñoTiendaSplit && showCartera ? 'Participación y cartera' : showCartera ? 'Cartera actual' : 'Empeño vs Tienda' }]
          : []),
        { id: 'tendencia', label: 'Tendencia diaria' },
        { id: 'gastos-medios', label: 'Gastos y medios de pago' },
        { id: 'desglose', label: 'Desglose' },
        ...(showSeries ? [{ id: 'ultimos-12-meses', label: 'Últimos 12 meses' }] : []),
        { id: 'mas-vendido', label: 'Lo más vendido' },
      ]
    : [
        { id: 'resumen', label: 'Resumen del período' },
        ...(showSeries ? [{ id: 'ultimos-12-meses', label: 'Últimos 12 meses' }] : []),
        { id: 'mas-vendido', label: 'Lo más vendido' },
      ]

  const [tab, setTab] = useState<'periodo' | 'contabilidad'>('periodo')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reportes" description="Cómo va el negocio: resultados del período y estado contable de hoy." />

      {/* Dos pestañas porque son dos preguntas con forma distinta.
          "Período" resume un RANGO y por eso lleva selector de fechas.
          "Contabilidad" es una FOTO DE HOY: cuánto debo, cuánto tengo en
          mercancía, qué no rota. Esas no tienen versión "en marzo" —o se
          debe hoy o no se debe— así que meterlas bajo el mismo selector de
          fechas habría prometido un filtro que no significa nada. */}
      <PageTabs
        value={tab}
        onValueChange={setTab}
        label="Vistas de Reportes"
        tabs={[
          { value: 'periodo', label: 'Período' },
          { value: 'contabilidad', label: 'Contabilidad' },
        ]}
      >
        <PageTabsContent value="periodo" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {MODULE_TABS.map((option) => (
                <FilterChip key={option.value} active={moduleFilter === option.value} onClick={() => setModuleFilter(option.value)}>
                  {option.label}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
          </div>

          <SectionIndexLayout sections={sections} label="Secciones del reporte">
            {!range ? (
              <IndexedSection id="resumen">
                <div className="rounded-card border border-border bg-card">
                  <EmptyState title="Elige un rango de fechas" description="O un día específico — arriba a la derecha." />
                </div>
              </IndexedSection>
            ) : rangeTooWide ? (
              <IndexedSection id="resumen">
                <div className="rounded-card border border-border bg-card">
                  <EmptyState
                    title={`Elige un rango de ${MAX_RANGE_DAYS} días o menos`}
                    description="Los gastos por categoría todavía se piden sesión por sesión — rangos más largos necesitan un endpoint de agregación para esa dimensión en el backend."
                  />
                </div>
              </IndexedSection>
            ) : !canViewHistory ? (
              // El resumen financiero se arma sumando cada cierre de caja del
              // rango, así que sin permiso de histórico no hay con qué armarlo.
              // Decirlo así evita el peor mensaje posible: un skeleton eterno o un
              // "no se pudo cargar" que manda a buscar una falla que no existe.
              <IndexedSection id="resumen">
                <div className="rounded-card border border-border bg-card">
                  <EmptyState
                    title="Necesitas permiso de histórico de caja"
                    description="Este reporte se arma con los cierres de caja del período. Pídele a un administrador el permiso “Ver el histórico de cierres de caja”."
                  />
                </div>
              </IndexedSection>
            ) : isPending ? (
              <IndexedSection id="resumen">
                <ReportesSkeleton />
              </IndexedSection>
            ) : isError ? (
              <IndexedSection id="resumen">
                <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
                  <p className="text-sm text-muted-foreground">No se pudo cargar el reporte de este rango.</p>
                  <Button variant="outline" onClick={() => refetch()}>
                    Reintentar
                  </Button>
                </div>
              </IndexedSection>
            ) : !closings || closings.length === 0 ? (
              <IndexedSection id="resumen">
                <div className="rounded-card border border-border bg-card">
                  <EmptyState title="No hay cierres de caja en este rango" description="El reporte se arma a partir de las sesiones de caja ya cerradas." />
                </div>
              </IndexedSection>
            ) : (
              <>
                <IndexedSection id="resumen">
                  <h2 className="sr-only">Resumen del período</h2>
                  <KpiRow>
                    {/* F7-05: estas tarjetas salen de los cierres de caja — son
                        FLUJO, y por eso no dicen «ingresos»: el ingreso del período
                        es el del estado de resultados de abajo, y dos cifras
                        distintas con el mismo nombre en la misma pantalla es lo que
                        hace que nadie le crea a ninguna. */}
                    <KpiCard
                      label="Cobros operativos, netos"
                      value={<Money value={cobrosOperativos} />}
                      delta={delta(cobrosOperativos, previousCobrosOperativos, 'up')}
                    />
                    <KpiCard
                      label="Gastos operativos"
                      value={<Money value={summary.gastosOperativos} />}
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
                      delta={delta(ventasFlujo.neto, previousVentasFlujo?.neto, 'up')}
                    />
                  </KpiRow>
                  <p className="text-xs text-muted-foreground">
                    Flujo de caja de los cierres del período: lo cobrado menos anulaciones y devoluciones pagadas. No es el ingreso contable — ese es el del
                    estado de resultados.
                  </p>
                </IndexedSection>

                <IndexedSection id="estado-resultados">
                  <IncomeStatementCard range={range} />
                </IndexedSection>

                {showCapitalTienda && (
                  <IndexedSection id="utilidad-tienda">
                    <ProfitCard range={range} />
                  </IndexedSection>
                )}
                {showCapitalEmpeño && (
                  <IndexedSection id="rentabilidad-empeno">
                    <PawnCard range={range} />
                  </IndexedSection>
                )}

                {showCapital && (
                  <IndexedSection id="movimiento-capital">
                    <SummaryCard
                      title="Movimiento de capital"
                      description="No es ingreso ni gasto — prestar, recuperar o comprar mercancía convierte efectivo en un activo, no cambia la utilidad."
                    >
                      <div className={KPI_GRID_3}>
                        {showCapitalEmpeño && (
                          <>
                            <KpiCard label="Capital desembolsado (préstamos nuevos)" value={<Money value={summary.capitalDesembolsado} />} />
                            <KpiCard label="Capital abonado (recuperado)" value={<Money value={summary.capitalAbonado} />} />
                          </>
                        )}
                        {showCapitalTienda && (
                          // F7-16: lo PAGADO a proveedores en el período, por la fecha
                          // del pago — del estado de resultados, no de la caja. Lo
                          // causado (compras a crédito incluidas) está en el estado
                          // de resultados como «Compras causadas».
                          <KpiCard
                            label="Pagos de compras (inversión en inventario)"
                            value={<Money value={incomeStatement?.inventory_purchases_paid ?? '0.00'} />}
                            delta={incomeStatement ? delta(incomeStatement.inventory_purchases_paid, previousIncomeStatement?.inventory_purchases_paid, 'down') : undefined}
                          />
                        )}
                      </div>
                    </SummaryCard>
                  </IndexedSection>
                )}

                {/* F21-14. Va sin importar el filtro de módulo porque el arqueo no
                    tiene módulo: se cuenta el cajón entero. Faltantes y sobrantes
                    por separado — no se compensan; el neto es un dato más, no el
                    resumen (ver `aggregateCashDifferences`). */}
                <IndexedSection id="descuadres">
                  <SummaryCard
                    title="Descuadres de caja al cierre"
                    description="Lo contado frente a lo que el sistema esperaba en cada cierre del período. Es de toda la caja: no se separa por módulo."
                    className="enter-up"
                  >
                    <div className={KPI_GRID}>
                      <KpiCard
                        label="Faltantes"
                        value={<Money value={cashDifferences.faltantes} />}
                        hint={cashDifferences.shortageCount === 1 ? 'En 1 cierre' : `En ${cashDifferences.shortageCount} cierres`}
                      />
                      <KpiCard
                        label="Sobrantes"
                        value={<Money value={cashDifferences.sobrantes} />}
                        hint={cashDifferences.surplusCount === 1 ? 'En 1 cierre' : `En ${cashDifferences.surplusCount} cierres`}
                      />
                      <KpiCard
                        label="Neto (sobrantes − faltantes)"
                        value={<Money value={cashDifferences.neto} />}
                        hint="No se compensan: cada descuadre es un error de conteo"
                      />
                      <KpiCard
                        label="Cierres con descuadre"
                        value={`${cashDifferences.sessionsWithDifference} de ${cashDifferences.sessionCount}`}
                        tone={cashDifferences.sessionsWithDifference > 0 ? 'danger' : 'default'}
                      />
                    </div>
                    <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                      No incluye los descuadres del conteo de apertura: esos se registran como ajuste de la cuenta, fuera de la sesión. El estado de
                      resultados sí los incluye (su línea «Descuadres de caja» suma apertura y cierre), por eso las dos cifras pueden no coincidir.
                    </p>
                  </SummaryCard>
                </IndexedSection>

                {(showEmpeñoTiendaSplit || showCartera) && (
                  <IndexedSection id="participacion" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {showEmpeñoTiendaSplit && (
                      <CardShell title="Empeño vs Tienda — participación en ingresos operativos">
                        <ModuleSplitBar pawn={summary.ingresosOperativosByModule.pawn} store={summary.ingresosOperativosByModule.store} />
                      </CardShell>
                    )}

                    {showCartera && (
                      <CardShell title="Cartera actual" subtitle="Corte de hoy">
                        {cartera && (
                          <>
                            <p className="tnum text-2xl font-semibold text-foreground">
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
                  </IndexedSection>
                )}

                <IndexedSection id="tendencia">
                  <CardShell title="Tendencia diaria — ingresos vs gastos operativos">
                    <DailyTrendChart data={summary.byDay} />
                  </CardShell>
                </IndexedSection>

                <IndexedSection id="gastos-medios" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <CardShell title="Gastos por categoría">
                    <DonutChart data={expenseDonut} />
                  </CardShell>
                  <CardShell title="Medio de pago (ingresos)">
                    <DonutChart data={paymentMethodDonut} />
                  </CardShell>
                </IndexedSection>

                <IndexedSection id="desglose">
                  <CardShell title="Desglose por módulo, concepto y medio de pago">
                    <DataTable embedded columns={DESGLOSE_COLUMNS} data={desgloseRows} getRowId={(row) => row.key} emptyTitle="Sin movimientos en este rango" />
                  </CardShell>
                </IndexedSection>
              </>
            )}

            {/* Fuera del bloque que exige cierres de caja en el rango, a propósito:
                la serie de 12 meses no depende del rango, así que esconderla porque
                el mes en curso todavía no tiene cierres —justo lo que pasa el día 1
                de cada mes— borraría la tendencia del año entero cuando más se
                necesita. Sale de los documentos, así que no necesita cierres. */}
            {showSeries && (
              <IndexedSection id="ultimos-12-meses">
                <CardShell title="Últimos 12 meses — ventas, intereses y gastos" subtitle="Independiente del rango elegido arriba">
                  <MonthlyTrendChart data={series.points} />
                </CardShell>
              </IndexedSection>
            )}

            <IndexedSection id="mas-vendido">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Lo más vendido del período</h2>
                <p className="text-xs text-muted-foreground">Del mismo rango de fechas elegido arriba.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <CardShell title="Prendas más vendidas">
                  <RankingList rows={ranking.topItems.map((i) => ({ key: i.itemId, label: i.code ? `${i.name} (${i.code})` : i.name, quantity: i.quantity, revenue: i.revenue, unit: i.unit }))} />
                </CardShell>
                <CardShell title="Categorías más movidas">
                  <RankingList rows={ranking.topCategories.map((c) => ({ key: `${c.categoryId}|${c.unit}`, label: c.path, quantity: c.quantity, revenue: c.revenue, unit: c.unit }))} />
                </CardShell>
              </div>
            </IndexedSection>
          </SectionIndexLayout>
        </PageTabsContent>

        <PageTabsContent value="contabilidad">
          <ContablesSection />
        </PageTabsContent>
      </PageTabs>
    </div>
  )
}
