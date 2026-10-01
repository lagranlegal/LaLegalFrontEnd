import { Children, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { formatPercent } from '@/lib/percent'

/**
 * La cifra va en color de texto (rediseño P1, F9-07): la «Cartera activa» en
 * rojo se leía como alarma todos los días. El rojo queda SOLO para lo que pide
 * acción («Más de 60 días» vencido, cierres con descuadre); el resto del color
 * va en el `delta`. Ni verde ni oro para una cifra: el monto no es un estado.
 */
const TONE_CLASSES = {
  default: 'text-foreground',
  /** Pide acción. Nunca para una cifra que solo informa. */
  danger: 'text-danger',
} as const

/** `pct: null` = sin base de comparación (período anterior en 0) — se muestra "—". `favorable` decide el color, no el signo (bajar gastos también es verde). */
export interface KpiDelta {
  pct: number | null
  favorable: boolean
  /** Contra qué se compara («vs. agosto»); por defecto, «vs período anterior». */
  label?: string
}

/**
 * Fila de KPIs del dashboard (docs/DESIGN_SYSTEM.md §1, §5): label pequeña
 * + cifra grande `tnum`, color semántico opcional, divisor vertical entre
 * tiles en desktop, grid 2 columnas en mobile. `delta` opcional (Reportes,
 * comparación vs período anterior) agrega una segunda línea pequeña.
 */
export function KpiCard({
  label,
  value,
  tone = 'default',
  delta,
  hint,
}: {
  label: string
  value: ReactNode
  tone?: keyof typeof TONE_CLASSES
  delta?: KpiDelta
  /** Contexto bajo la cifra, para cuando el número solo se entiende con su
   *  denominador ("3 compras sin pagar", "desde marzo"). Con `delta` va en
   *  una línea aparte, debajo: el Inicio la usa solo cuando hubo devoluciones. */
  hint?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {/* La cifra NUNCA se parte dentro de un número («$ 6.000.00 / 0» a 1024–1280
          px, verificación del 29/09): nada de `wrap-anywhere`. Que quepa es trabajo
          de la fila, que no pone más columnas de las que caben (`KpiRow`). */}
      <span className={cn('tnum min-w-0 text-2xl font-semibold', TONE_CLASSES[tone])}>{value}</span>
      {/* Solo la flecha y el % llevan el color (rediseño P2-c): «vs. agosto» es
          contexto, va en gris. El % en es-CO, «12 %» (F9-21). */}
      {delta && (
        <span className="text-xs text-muted-foreground">
          {delta.pct === null ? (
            `— ${delta.label ?? 'vs período anterior'}`
          ) : (
            <>
              <span className={cn('tnum font-semibold', delta.favorable ? 'text-success' : 'text-danger')}>
                {delta.pct >= 0 ? '▲' : '▼'} {formatPercent(Math.abs(Math.round(delta.pct)), 0)}
              </span>{' '}
              {delta.label ?? 'vs período anterior'}
            </>
          )}
        </span>
      )}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

const ROW_BASE = 'enter-up grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 rounded-card border border-border bg-card p-card sm:grid-cols-3'

/**
 * `tiles`: cada KPI en su propia tarjeta, en una grilla que pone tantas
 * columnas de al menos 200 px como quepan (el Inicio del rediseño P2-c: cuatro
 * en fila a 1280, una sola a 390). Sin `tiles`, una sola tarjeta con
 * divisores, como Reportes.
 */
const TILES = 'enter-up grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2.5 *:rounded-card *:border *:border-border *:bg-card *:p-card'

/**
 * Una columna por debajo de 480 px (F9-06): a 360 px dos cifras de dinero en
 * text-2xl no caben lado a lado y se leían como una sola. En una sola fila
 * (con divisores) solo cuando caben: hasta 4 tarjetas desde 1024 px; con 5 o
 * más desde 1536 px, porque a 1280 con el sidebar cada celda queda en ~120 px
 * y «$ 6.000.000» no entra. Clases completas y estáticas: Tailwind no ve una
 * clase armada por interpolación.
 */
export function KpiRow({ children, tiles = false }: { children: ReactNode; tiles?: boolean }) {
  if (tiles) return <div className={TILES}>{children}</div>
  const many = Children.toArray(children).length > 4
  return (
    <div
      className={cn(
        ROW_BASE,
        many
          ? '2xl:flex 2xl:gap-0 2xl:divide-x 2xl:divide-border 2xl:*:px-4 2xl:*:first:pl-0 2xl:*:last:pr-0'
          : 'lg:flex lg:gap-0 lg:divide-x lg:divide-border lg:*:px-4 lg:*:first:pl-0 lg:*:last:pr-0',
      )}
    >
      {children}
    </div>
  )
}
