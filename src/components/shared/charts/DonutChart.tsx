import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCOP } from '@/lib/money'

export interface DonutDatum {
  key: string
  label: string
  value: number
}

// `--chart-3/4/5` ya están reservados en tokens.css como "series secundarias,
// dona" (sin consumidor hasta esta pantalla) — se completa con `--brand-500`/
// `--text-muted` si hay más de 3 segmentos, ciclando en vez de inventar hex.
const DONUT_COLORS = ['var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--brand-500)', 'var(--text-muted)']

/**
 * Wrapper propio sobre Recharts `PieChart` (dona, `innerRadius`) — mismo
 * criterio de tokens que `ContractsStatusChart`/`DailyTrendChart`
 * (docs/DESIGN_SYSTEM.md §5). Leyenda lateral con % en vez de la leyenda
 * nativa de Recharts, para poder mostrar el monto en pesos junto al color.
 */
export function DonutChart({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Sin datos en este rango todavía.</p>
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={44} outerRadius={68} paddingAngle={2} strokeWidth={0}>
              {data.map((d, i) => (
                <Cell key={d.key} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 'var(--radius-card)', borderColor: 'var(--border)', fontSize: 12 }} formatter={(value) => formatCOP(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={d.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              {d.label}
            </span>
            <span className="tnum text-muted-foreground">
              {Math.round((d.value / total) * 100)}% · {formatCOP(d.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
