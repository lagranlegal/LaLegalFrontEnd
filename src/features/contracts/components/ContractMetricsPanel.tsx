import { useMemo, type ReactNode } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Money } from '@/components/shared/Money'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { DonutChart, type DonutDatum } from '@/components/shared/charts/DonutChart'
import { formatDate, todayBogota } from '@/lib/dates'
import { formatCOP } from '@/lib/money'
import { buildBalanceHistory, computeContractMetrics, daysSinceStart, splitCollected } from '@/features/contracts/metrics'
import type { Contract, Payment } from '@/features/contracts/api'

function CardShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-card p-card shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}

/**
 * Métricas del contrato. Todo se calcula desde datos que la API ya devuelve —
 * ningún endpoint nuevo detrás.
 *
 * La distinción que estas tarjetas hacen visible, y que es la razón de ser del
 * panel: **los intereses son ingreso; el capital recuperado no lo es**. Un
 * contrato de $1.000.000 que devolvió todo el capital y pagó $150.000 de
 * interés no generó $1.150.000 — generó $150.000. Es el mismo error de
 * modelado que ya se corrigió dos veces en /reportes, y acá se previene
 * rotulando cada número en vez de sumarlos en un solo "total cobrado" grande.
 */
export function ContractMetricsPanel({ contract, payments }: { contract: Contract; payments: Payment[] }) {
  const metrics = useMemo(() => computeContractMetrics(contract, payments), [contract, payments])
  const historial = useMemo(() => buildBalanceHistory(contract, payments), [contract, payments])
  const reparto = splitCollected(metrics)
  const dias = daysSinceStart(contract.start_date, todayBogota())

  const donutData: DonutDatum[] = [
    { key: 'interes', label: 'Interés (ingreso)', value: reparto.interes },
    { key: 'capital', label: 'Capital devuelto', value: reparto.capital },
  ]

  return (
    <div className="flex flex-col gap-4">
      <KpiRow>
        <KpiCard
          label="Intereses cobrados"
          value={<Money value={metrics.interesesCobrados} tone="in" />}
          tone="success"
        />
        <KpiCard
          label="Rendimiento"
          value={
            <span className="tnum">
              {metrics.rendimientoPct === null ? '—' : `${metrics.rendimientoPct.toFixed(1)}%`}
            </span>
          }
        />
        <KpiCard label="Capital pendiente" value={<Money value={metrics.saldoCapital} />} />
        <KpiCard
          label="Interés del próximo mes"
          value={<Money value={metrics.interesMensualActual} />}
        />
      </KpiRow>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CardShell title="Capital devuelto" subtitle={`${metrics.cantidadAbonos} ${metrics.cantidadAbonos === 1 ? 'abono' : 'abonos'} · ${dias} días`}>
          <p className="tnum mb-2 text-2xl font-semibold text-foreground">
            {metrics.capitalRecuperadoPct === null ? '—' : `${metrics.capitalRecuperadoPct.toFixed(0)}%`}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-pill bg-border">
            <div
              className="h-full rounded-pill bg-primary transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, metrics.capitalRecuperadoPct ?? 0))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            <Money value={metrics.capitalRecuperado} /> de <Money value={contract.principal} /> prestados.
            Devolver capital reduce la deuda — no es ganancia.
          </p>
        </CardShell>

        <CardShell title="De dónde vino lo cobrado" subtitle={<>Total <Money value={metrics.totalCobrado} /></>}>
          {reparto.interes + reparto.capital === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay abonos registrados.</p>
          ) : (
            <DonutChart data={donutData} />
          )}
          {Number(metrics.descuentos) > 0 && (
            <p className="mt-2 text-xs text-warning">
              Se otorgaron <Money value={metrics.descuentos} /> en descuentos de interés — interés que se dejó de cobrar.
            </p>
          )}
        </CardShell>
      </div>

      {historial.length > 1 && (
        <CardShell title="Evolución del saldo" subtitle="Capital pendiente tras cada abono">
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historial} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => formatDate(d)}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatCOP(v, { maximumFractionDigits: 0 })}
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  axisLine={false}
                  width={72}
                />
                <Tooltip
                  formatter={(v) => [formatCOP(Number(v)), 'Saldo']}
                  labelFormatter={(d) => (typeof d === 'string' ? formatDate(d) : '')}
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-input)',
                    fontSize: '0.8rem',
                  }}
                />
                <Area
                  type="stepAfter"
                  dataKey={(p: { saldo: string }) => Number(p.saldo)}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#saldoGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Escalonada a propósito: el saldo no baja de a poco, baja de golpe con cada abono a capital.
          </p>
        </CardShell>
      )}
    </div>
  )
}
