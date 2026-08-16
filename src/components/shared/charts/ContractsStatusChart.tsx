import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface StatusDatum {
  key: string
  label: string
  count: number
  /** Referencia a un token CSS (`var(--status-*)`) — nunca un hex suelto (docs/DESIGN_SYSTEM.md §5). */
  color: string
}

/**
 * Wrapper propio sobre Recharts que lee colores de los tokens, nunca hex
 * inline (docs/DESIGN_SYSTEM.md §5). Card "Contratos por estado".
 */
export function ContractsStatusChart({ data }: { data: StatusDatum[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip cursor={{ fill: 'var(--bg-app)' }} contentStyle={{ borderRadius: 'var(--radius-card)', borderColor: 'var(--border)', fontSize: 12 }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
