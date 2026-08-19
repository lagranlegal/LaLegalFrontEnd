import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCOP } from '@/lib/money'
import { formatDate } from '@/lib/dates'

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
 * ingresos" / "gastos / egresos"), sin uso hasta la pantalla de Reportes.
 */
export function DailyTrendChart({ data }: { data: DailyTrendDatum[] }) {
  const chartData = data.map((d) => ({ date: d.date, Ingresos: Number(d.ingresos), Gastos: Number(d.gastos) }))
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v: number) => formatCOP(v, { maximumFractionDigits: 0 })} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={72} />
          <Tooltip
            cursor={{ fill: 'var(--bg-app)' }}
            contentStyle={{ borderRadius: 'var(--radius-card)', borderColor: 'var(--border)', fontSize: 12 }}
            formatter={(value) => formatCOP(Number(value))}
            labelFormatter={(label) => formatDate(String(label))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Ingresos" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Gastos" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
