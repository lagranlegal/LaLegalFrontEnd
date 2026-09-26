import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'
import { DISPLAY } from '../styles'
import { PrendoMark } from './primitives'

type Vars = CSSProperties & Record<`--${string}`, string | number>

/**
 * Una pieza de la composición: parallax (capa externa) → entrada → flote.
 * Van en elementos distintos porque las tres mueven `transform` y en uno
 * solo se pisarían.
 */
function Layer({
  className,
  depth,
  index,
  children,
}: {
  className: string
  depth: number
  index: number
  children: ReactNode
}) {
  return (
    <div className={cn('landing-parallax absolute', className)} style={{ '--depth': `${depth}px` } as Vars}>
      <div className="landing-card-in" style={{ '--i': index } as Vars}>
        <div className="landing-float" style={{ '--i': index } as Vars}>
          {children}
        </div>
      </div>
    </div>
  )
}

function AbonoOption({ label, amount, selected = false, className }: { label: string; amount: string; selected?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-input p-2.5 sm:p-3',
        selected ? 'border-2 border-primary bg-brand-50' : 'border border-border',
        className,
      )}
    >
      <span className={cn('text-xs', selected ? 'text-brand' : 'text-muted-foreground')}>{label}</span>
      <span className="tnum text-sm font-semibold sm:text-base">{amount}</span>
    </div>
  )
}

/**
 * Las tarjetas del hero: un contrato con sus abonos, la etiqueta de remate,
 * la caja cuadrada y los intereses del mes. Cifras de ejemplo.
 *
 * El parallax escribe `--px`/`--py` en el contenedor desde
 * `requestAnimationFrame`: ningún re-render de React por movimiento del
 * mouse. Solo con puntero fino y sin movimiento reducido.
 */
export function HeroComposition() {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node || reduced || !window.matchMedia('(pointer: fine)').matches) return
    const area = node.closest('section') ?? node
    let frame = 0
    let x = 0
    let y = 0

    const paint = () => {
      frame = 0
      const r = node.getBoundingClientRect()
      const px = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / (r.width / 2)))
      const py = Math.max(-1, Math.min(1, (y - (r.top + r.height / 2)) / (r.height / 2)))
      node.style.setProperty('--px', px.toFixed(3))
      node.style.setProperty('--py', py.toFixed(3))
    }
    const onMove = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      node.style.setProperty('--px', '0')
      node.style.setProperty('--py', '0')
    }

    area.addEventListener('pointermove', onMove as EventListener)
    area.addEventListener('pointerleave', onLeave)
    return () => {
      area.removeEventListener('pointermove', onMove as EventListener)
      area.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
      node.style.removeProperty('--px')
      node.style.removeProperty('--py')
    }
  }, [reduced])

  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        ref={ref}
        role="img"
        aria-label="Muestra de Prendo con cifras de ejemplo: un contrato de empeño con sus abonos, una prenda rematada con su código, la caja del día cuadrada y los intereses cobrados en el mes."
        className="relative h-84 sm:h-150"
      >
        {/* Contrato con sus abonos */}
        <Layer className="left-0 right-6 top-0 z-10 sm:left-5 sm:right-auto sm:top-5 sm:w-139 xl:left-10" depth={6} index={0}>
          <div className="flex flex-col gap-3.5 rounded-panel bg-card p-5 text-foreground shadow-float sm:gap-5 sm:rounded-modal sm:p-7">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="hidden text-sm text-muted-foreground sm:block">Contrato de empeño</span>
                <span className={cn(DISPLAY, 'tnum text-2xl font-semibold sm:text-3xl')}>
                  <span className="text-muted-foreground">#</span>128
                </span>
              </div>
              <span className="rounded-pill bg-success-soft px-2.5 py-1 text-xs font-semibold text-success sm:px-3 sm:py-1.5 sm:text-sm">
                Vigente
              </span>
            </div>

            <div className="flex justify-between gap-3 text-sm sm:hidden">
              <span>Cadena oro 18k · 12,4 g</span>
              <span className="tnum font-semibold">$ 1.200.000</span>
            </div>
            <div className="hidden items-center gap-3.5 rounded-card bg-background p-3.5 sm:flex">
              <div className="landing-gem size-13 shrink-0 rounded-input" />
              <div className="flex min-w-0 grow flex-col gap-0.5">
                <span className="text-sm font-semibold">Cadena oro 18k · 12,4 g</span>
                <span className="text-sm text-muted-foreground">Cliente de ejemplo</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs text-muted-foreground">Préstamo</span>
                <span className="tnum font-semibold">$ 1.200.000</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="hidden text-sm font-semibold text-body sm:block">Registrar abono</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
                <AbonoOption label="1 mes" amount="$ 60.000" selected />
                <AbonoOption label="2 meses" amount="$ 120.000" />
                <AbonoOption label="3 meses" amount="$ 180.000" className="hidden sm:flex" />
              </div>
            </div>
            <div className="rounded-pill bg-primary py-3 text-center text-sm font-semibold text-primary-foreground sm:py-4 sm:text-base">
              Registrar abono $ 60.000
            </div>
          </div>
        </Layer>

        {/* La etiqueta: el objeto del logo */}
        <Layer className="bottom-0 right-0 z-20 w-45 sm:bottom-auto sm:top-0 sm:w-66" depth={14} index={1}>
          <div className="landing-settle flex flex-col gap-2 rounded-card bg-brand-50 p-4 text-foreground shadow-float-sm sm:gap-3 sm:rounded-panel sm:p-5.5" style={{ '--i': 1 } as Vars}>
            <div className="flex items-center justify-between">
              <PrendoMark bare className="hidden size-7 text-foreground sm:block" />
              <span className="text-xs font-semibold tracking-widest text-brand">REMATE</span>
            </div>
            <span className="font-mono text-base font-semibold sm:text-xl">JOC0007-01R</span>
            <div className="hidden h-px bg-border sm:block" />
            <div className="flex justify-between text-xs text-body sm:text-sm">
              <span>Precio</span>
              <span className="tnum font-semibold text-foreground">$ 1.450.000</span>
            </div>
          </div>
        </Layer>

        {/* Caja cuadrada */}
        <Layer className="bottom-5 left-0 z-20 hidden w-85 sm:block" depth={10} index={2}>
          <div className="flex flex-col gap-3.5 rounded-panel border border-sidebar-accent bg-sidebar-hover p-5 text-sidebar-foreground-strong shadow-float-sm">
            <div className="flex items-center gap-2.5">
              <span className="size-2.5 rounded-pill bg-sidebar-success" />
              <span className="text-sm font-semibold">Caja cuadrada</span>
              <span className="ml-auto text-xs text-sidebar-muted-foreground">Cierre 7:04 p. m.</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-sidebar-muted-foreground">Esperado</span>
                <span className="tnum text-lg font-semibold">$ 3.482.000</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-sidebar-muted-foreground">Contado</span>
                <span className="tnum text-lg font-semibold">$ 3.482.000</span>
              </div>
            </div>
          </div>
        </Layer>

        {/* Intereses del mes */}
        <Layer className="bottom-6 right-7.5 z-20 hidden w-66.5 sm:block" depth={12} index={3}>
          <div className="flex flex-col gap-2 rounded-panel bg-card p-4.5 text-foreground shadow-float-sm">
            <span className="text-xs text-muted-foreground">Intereses cobrados · mes</span>
            <span className={cn(DISPLAY, 'tnum text-3xl font-semibold text-brand')}>$ 4.860.000</span>
            <svg viewBox="0 0 194 40" className="h-10 w-full" aria-hidden="true">
              <path
                pathLength={1}
                className="landing-draw-now stroke-primary"
                d="M0 34 C 30 30, 45 22, 70 24 S 120 12, 140 14 S 175 4, 194 2"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-xs text-muted-foreground">Cifras de ejemplo</span>
          </div>
        </Layer>
      </div>
      <p className="mt-4 text-center text-xs text-sidebar-muted-foreground sm:hidden">Cifras de ejemplo</p>
    </div>
  )
}
