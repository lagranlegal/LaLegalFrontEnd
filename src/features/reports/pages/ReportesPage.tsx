import { useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import { EmptyState } from '@/components/shared/EmptyState'
import { DateRangePicker, type DateRangeValue } from '@/components/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import { ContractsStatusChart, type StatusDatum } from '@/components/shared/charts/ContractsStatusChart'
import { DailyTrendChart } from '@/components/shared/charts/DailyTrendChart'
import { MODULE_LABELS, conceptLabel } from '@/lib/modules'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { todayBogota } from '@/lib/dates'
import { useFinancialSummary, useCarteraActual, MAX_RANGE_DAYS } from '@/features/reports/api'
import { daysBetweenDateOnly } from '@/features/reports/aggregate'
import { ModuleSplitBar } from '@/features/reports/components/ModuleSplitBar'

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

function CardShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-card p-card shadow-card">
      <h2 className="mb-3 text-sm font-medium text-foreground">{title}</h2>
      {children}
    </div>
  )
}

export function ReportesPage() {
  const [range, setRange] = useState<DateRangeValue | null>(defaultRange())
  const rangeDays = range ? daysBetweenDateOnly(range.from, range.to) : 0
  const rangeTooWide = !!range && rangeDays > MAX_RANGE_DAYS

  const { data, isPending, isError, refetch } = useFinancialSummary(range)
  const { data: cartera } = useCarteraActual()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reportes" description="Información financiera del período — intereses, capital, ventas y gastos." actions={<DateRangePicker value={range} onChange={setRange} />} />

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
      ) : !data || data.sessionCount === 0 ? (
        <div className="rounded-card border border-border bg-card shadow-card">
          <EmptyState title="No hay cierres de caja en este rango" description="El reporte se arma a partir de las sesiones de caja ya cerradas." />
        </div>
      ) : (
        <>
          <KpiRow>
            <KpiCard label="Ingresos operativos" value={<Money value={data.ingresosOperativos} tone="in" />} tone="success" />
            <KpiCard label="Gastos operativos" value={<Money value={data.gastosOperativos} tone="out" />} tone="danger" />
            <KpiCard label="Utilidad operativa" value={<Money value={data.utilidadOperativa} />} tone={Number(data.utilidadOperativa) < 0 ? 'danger' : 'success'} />
            <KpiCard label="Intereses cobrados" value={<Money value={data.intereses} />} />
            <KpiCard label="Ventas" value={<Money value={data.ventas} />} tone="brand" />
          </KpiRow>

          <div className="rounded-card border border-border bg-card p-card shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-foreground">Movimiento de capital (cartera de empeño)</h2>
              <span className="text-xs text-muted-foreground">No es ingreso ni gasto — prestar o recuperar capital no cambia la utilidad.</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
              <KpiCard label="Capital desembolsado (préstamos nuevos)" value={<Money value={data.capitalDesembolsado} tone="out" />} />
              <KpiCard label="Capital abonado (recuperado)" value={<Money value={data.capitalAbonado} tone="in" />} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CardShell title="Empeño vs Tienda — participación en ingresos operativos">
              <ModuleSplitBar pawn={data.ingresosOperativosByModule.pawn} store={data.ingresosOperativosByModule.store} />
            </CardShell>

            <CardShell title="Cartera actual">
              <p className="mb-3 text-xs text-muted-foreground">Corte de hoy — no depende del rango elegido arriba.</p>
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
          </div>

          <CardShell title="Tendencia diaria — ingresos vs gastos operativos">
            <DailyTrendChart data={data.byDay} />
          </CardShell>

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
                  {data.totalsByConcept.map((line, index) => (
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
    </div>
  )
}
