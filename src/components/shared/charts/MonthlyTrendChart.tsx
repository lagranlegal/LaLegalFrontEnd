import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCOP } from '@/lib/money'
import { formatMonth } from '@/lib/dates'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'

export interface MonthlyTrendDatum {
  month: string
  interest_revenue: string
  sales_revenue: string
  expenses: string
}

/**
 * Serie MENSUAL (`GET /reports/series`), hermana de `DailyTrendChart`.
 *
 * Separa empeño y tienda en vez de sumarlos en un solo "ingresos": en este
 * negocio son dos motores distintos y la pregunta que responde la tendencia
 * larga es cuál está creciendo, no cuánto entró en total (eso ya está en los
 * KPIs). Mismos tokens de color que la diaria — `--chart-1` es ingreso y
 * `--chart-2` es gasto por convención de `tokens.css`; el empeño toma
 * `--chart-3` para no repetir el mismo verde en dos series distintas.
 */
export function MonthlyTrendChart({ data }: { data: MonthlyTrendDatum[] }) {
  // Recharts anima desde JavaScript: la regla global de `prefers-reduced-motion`
  // no lo alcanza, hay que apagarlo a mano (igual que `DailyTrendChart`).
  const prefersReducedMotion = usePrefersReducedMotion()
  const chartData = data.map((d) => ({
    month: d.month,
    Ventas: Number(d.sales_revenue),
    Intereses: Number(d.interest_revenue),
    Gastos: Number(d.expenses),
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="serieVentasFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="serieInteresesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="serieGastosFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tickFormatter={formatMonth} minTickGap={16} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v: number) => formatCOP(v, { maximumFractionDigits: 0 })} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={72} />
          <Tooltip
            contentStyle={{ borderRadius: 'var(--radius-card)', borderColor: 'var(--border)', fontSize: 12 }}
            formatter={(value) => formatCOP(Number(value))}
            labelFormatter={(label) => formatMonth(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="Ventas" stroke="var(--chart-1)" strokeWidth={2} fill="url(#serieVentasFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={!prefersReducedMotion} />
          <Area type="monotone" dataKey="Intereses" stroke="var(--chart-3)" strokeWidth={2} fill="url(#serieInteresesFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={!prefersReducedMotion} />
          <Area type="monotone" dataKey="Gastos" stroke="var(--chart-2)" strokeWidth={2} fill="url(#serieGastosFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={!prefersReducedMotion} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
