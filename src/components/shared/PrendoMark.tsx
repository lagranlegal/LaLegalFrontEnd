import { cn } from '@/lib/utils'

/** El path de `public/prendo-mark.svg`: la etiqueta con su perforación. */
const MARK_PATH =
  'M36.95,15.74 L48.26,27.05 A7,7 0 0 1 48.26,36.95 L36.95,48.26 A7,7 0 0 1 27.05,48.26 L15.74,36.95 A7,7 0 0 1 15.74,27.05 L27.05,15.74 A7,7 0 0 1 36.95,15.74 Z M28.0,27.19 a4,4 0 1 0 8,0 a4,4 0 1 0 -8,0 Z'

/**
 * El logo de Prendo, inline para pintarlo con tokens: el tile en el oro del
 * relleno y la etiqueta en carbón (`--brand-contrast`). Con `bare`, solo la
 * etiqueta en `currentColor`. Lo usan la landing y las páginas de salida.
 */
export function PrendoMark({ className, bare = false }: { className?: string; bare?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={cn('shrink-0', className)}>
      {!bare && <rect width="64" height="64" rx="16" className="fill-primary" />}
      <path fillRule="evenodd" d={MARK_PATH} className={bare ? 'fill-current' : 'fill-primary-foreground'} />
    </svg>
  )
}

/** Logo + «Prendo» en Archivo: la firma de la plataforma (login, páginas de salida). */
export function PrendoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <PrendoMark className="size-8" />
      <span className="font-display text-xl font-semibold tracking-display text-foreground">Prendo</span>
    </span>
  )
}
