import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCOP } from '@/lib/money'
import { formatDate, formatDateShort } from '@/lib/dates'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'

export interface DailyTrendDatum {
  date: string
  ingresos: string
  gastos: string
}

/**
 * Wrapper propio sobre Recharts, mismo criterio que `ContractsStatusChart`
 * (colores desde tokens, nunca hex inline — docs/DESIGN_SYSTEM.md §5).
 * Ingresos/gastos por día — `--chart-1`/`--chart-2` ya están reservados
 * textualmente en `tokens.css` para exactamente esto ("serie principal /
 * ingresos" / "gastos / egresos"). Área con relleno degradado (curvas
 * suaves, `type="monotone"`) en vez de barras — pedido explícito del
 * cliente de un look más moderno, mismo dato de siempre.
 */
export function DailyTrendChart({ data }: { data: DailyTrendDatum[] }) {
  // Recharts anima desde JavaScript, así que la regla de `prefers-reduced-motion`
  // de globals.css no lo alcanza — hay que apagarlo a mano.
  const prefersReducedMotion = usePrefersReducedMotion()
  const chartData = data.map((d) => ({ date: d.date, Ingresos: Number(d.ingresos), Gastos: Number(d.gastos) }))
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id="reportesIngresosFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="reportesGastosFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={formatDateShort} minTickGap={24} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v: number) => formatCOP(v, { maximumFractionDigits: 0 })} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={72} />
          <Tooltip
            contentStyle={{ borderRadius: 'var(--radius-card)', borderColor: 'var(--border)', fontSize: 12 }}
            formatter={(value) => formatCOP(Number(value))}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="Ingresos" stroke="var(--chart-1)" strokeWidth={2} fill="url(#reportesIngresosFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={!prefersReducedMotion} />
          <Area type="monotone" dataKey="Gastos" stroke="var(--chart-2)" strokeWidth={2} fill="url(#reportesGastosFill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={!prefersReducedMotion} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
