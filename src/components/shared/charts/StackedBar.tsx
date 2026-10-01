import { cn } from '@/lib/utils'

/**
 * El color de cada tramo, por clave de tono. Clases completas y estáticas
 * (ARQUITECTURA §16); el rayado es una utilidad de `globals.css` con tokens.
 */
const SEGMENT_TONES = {
  active: { bar: 'bg-status-active', swatch: 'bg-status-active' },
  arrears: { bar: 'bg-status-arrears', swatch: 'bg-status-arrears' },
  extension: { bar: 'bg-status-extension', swatch: 'bg-status-extension' },
  'danger-hatch': { bar: 'bg-hatch-danger', swatch: 'bg-hatch-danger-sm' },
  closed: { bar: 'bg-border-strong', swatch: 'bg-border-strong' },
} as const

export type StackedBarTone = keyof typeof SEGMENT_TONES

export interface StackedBarSegment {
  key: string
  label: string
  count: number
  tone: StackedBarTone
  /** El nombre en singular para el texto alternativo («1 listo para remate»). */
  labelOne?: string
}

/** «21 vigentes, 11 en mora, …»: lo que el lector de pantalla oye en lugar de la barra (F9-09). */
function stackedBarSummary(segments: StackedBarSegment[]): string {
  return segments.map((s) => `${s.count} ${(s.count === 1 && s.labelOne ? s.labelOne : s.label).toLowerCase()}`).join(', ')
}

/**
 * Barra apilada con leyenda y conteo en texto (rediseño P2-c, F9-08/F9-09):
 * una sola barra de 26 px con 2 px de separación entre tramos, y debajo cada
 * estado con su muestra, su nombre y su número. Ningún estado depende solo del
 * color: el nombre y el número están escritos. Un tramo en 0 no se dibuja,
 * pero su renglón de la leyenda sí queda (con 0).
 */
export function StackedBar({ segments }: { segments: StackedBarSegment[] }) {
  const visible = segments.filter((s) => s.count > 0)
  return (
    <div className="flex flex-col gap-3">
      <div role="img" aria-label={stackedBarSummary(segments)} className="flex h-6.5 gap-0.5 overflow-hidden rounded-sm bg-card">
        {visible.length === 0 ? (
          <span className="block h-full flex-1 bg-muted" />
        ) : (
          visible.map((s) => (
            <span
              key={s.key}
              title={`${s.label}: ${s.count}`}
              className={cn('block h-full first:rounded-l-sm last:rounded-r-sm', SEGMENT_TONES[s.tone].bar)}
              // El ancho es el dato, no un valor de diseño.
              style={{ flexGrow: s.count, flexBasis: 0 }}
            />
          ))
        )}
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {segments.map((s) => (
          <li key={s.key} className="grid grid-cols-[12px_1fr_auto] items-center gap-2.5 py-1.75 text-sm text-body">
            <i aria-hidden className={cn('block size-3 rounded-xs', SEGMENT_TONES[s.tone].swatch)} />
            <span>{s.label}</span>
            <b className="tnum font-semibold text-foreground">{s.count}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}
