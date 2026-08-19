import { Money } from '@/components/shared/Money'

/**
 * % de participación de Empeño vs Tienda sobre los ingresos del rango —
 * barra de 2 segmentos en CSS puro (sin Recharts, no se pidió una dona).
 * El % es presentación pura (`Number()` sobre totales ya sumados con
 * `sumMoney`), no una decisión de negocio.
 */
export function ModuleSplitBar({ pawn, store }: { pawn: string; store: string }) {
  const pawnAmount = Number(pawn)
  const storeAmount = Number(store)
  const total = pawnAmount + storeAmount
  const pawnPct = total > 0 ? Math.round((pawnAmount / total) * 100) : 0
  const storePct = total > 0 ? 100 - pawnPct : 0

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Sin ingresos en este rango todavía.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full overflow-hidden rounded-pill bg-border">
        <div className="h-full bg-[var(--status-arrears)]" style={{ width: `${pawnPct}%` }} />
        <div className="h-full bg-primary" style={{ width: `${storePct}%` }} />
      </div>
      <div className="flex flex-wrap justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[var(--status-arrears)]" />
          <span className="text-foreground">Empeño</span>
          <span className="text-muted-foreground">{pawnPct}%</span>
          <Money value={pawn} tone="in" className="ml-1" />
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary" />
          <span className="text-foreground">Tienda</span>
          <span className="text-muted-foreground">{storePct}%</span>
          <Money value={store} tone="in" className="ml-1" />
        </div>
      </div>
    </div>
  )
}
