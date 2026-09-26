import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CONTAINER, DISPLAY } from '../styles'
import { Eyebrow, Reveal } from './primitives'

const CARD = 'landing-lift flex flex-col gap-3 rounded-panel border p-6 sm:rounded-modal sm:p-7'

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-8 text-brand"
    >
      {children}
    </svg>
  )
}

const SMALL: { title: string; body: string; icon: ReactNode; soft?: boolean }[] = [
  {
    title: 'Avisos por correo',
    body: 'Comprobantes al cliente y recordatorios de cuota, con horario y tope semanal. Tú decides cuáles se encienden.',
    icon: (
      <FeatureIcon>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </FeatureIcon>
    ),
  },
  {
    title: 'Tu equipo, con permisos',
    body: 'Cuatro roles listos y 43 permisos que ajustas uno por uno. Lo sensible queda auditado.',
    icon: (
      <FeatureIcon>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6" />
      </FeatureIcon>
    ),
  },
  {
    title: 'Tu contrato, tu formato',
    body: 'Editas la plantilla una vez; cada contrato sale impreso con tus datos.',
    icon: (
      <FeatureIcon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M8 13h8M8 17h5" />
      </FeatureIcon>
    ),
  },
  {
    title: 'También en el celular',
    body: 'Abonos, ventas y consultas desde el teléfono del mostrador.',
    soft: true,
    icon: (
      <FeatureIcon>
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" />
      </FeatureIcon>
    ),
  },
]

const KPIS = [
  { label: 'Ingresos operativos', value: '$ 18,4 M', delta: '▲ 12 %' },
  { label: 'Gastos', value: '$ 6,1 M', delta: '▼ 4 %' },
  { label: 'Utilidad', value: '$ 12,3 M', delta: '▲ 21 %', brand: true },
]

const CODES = [
  { base: 'JOC0007-01', origin: 'R' },
  { base: 'ANI0012-03', origin: 'T' },
  { base: 'REL0004-01', origin: 'P' },
]

export function FeaturesBento() {
  return (
    <section aria-labelledby="funciones-title" className="pb-16 sm:pb-24 lg:pb-34">
      <Reveal className={cn(CONTAINER, 'flex flex-col gap-6 sm:gap-12 lg:gap-14')}>
        <div className="flex flex-col gap-4 sm:gap-5">
          <Eyebrow>Todo lo del mostrador</Eyebrow>
          <h2 id="funciones-title" className={cn(DISPLAY, 'max-w-180 text-section font-bold leading-tight')}>
            Lo que la operación diaria de verdad pide.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {/* Reportes (2×2) */}
          <article className={cn(CARD, 'gap-5 border-border bg-card sm:col-span-2 lg:row-span-2 lg:p-9')}>
            <h3 className={cn(DISPLAY, 'text-2xl font-semibold sm:text-3xl')}>Reportes que separan lo que es ganancia</h3>
            <p className="max-w-110 text-sm leading-relaxed text-body sm:text-base">
              Ingresos, gastos y utilidad operativa, con el movimiento de capital aparte. Empeño contra tienda, y la
              comparación con el período anterior.
            </p>
            <div className="mt-auto flex flex-col gap-4.5 rounded-card bg-background p-4 sm:p-6">
              <dl className="grid grid-cols-3 gap-3 sm:gap-4">
                {KPIS.map((k) => (
                  <div key={k.label} className="flex min-w-0 flex-col gap-1">
                    <dt className="text-xs text-muted-foreground">{k.label}</dt>
                    <dd className={cn('tnum text-base font-semibold sm:text-xl', k.brand && 'text-brand')}>{k.value}</dd>
                    <dd className="text-xs font-semibold text-success">{k.delta}</dd>
                  </div>
                ))}
              </dl>
              <svg viewBox="0 0 560 120" preserveAspectRatio="none" aria-hidden="true" className="h-24 w-full sm:h-30">
                <path
                  d="M0 90 C 60 80, 100 60, 160 66 S 260 40, 320 46 S 440 20, 560 14 L560 120 L0 120 Z"
                  className="fill-brand-halo"
                />
                <path
                  pathLength={1}
                  d="M0 90 C 60 80, 100 60, 160 66 S 260 40, 320 46 S 440 20, 560 14"
                  fill="none"
                  strokeWidth="3"
                  className="landing-draw stroke-primary"
                />
                <path
                  d="M0 104 C 80 100, 140 96, 220 98 S 380 90, 560 88"
                  fill="none"
                  strokeWidth="2.5"
                  strokeDasharray="6 6"
                  vectorEffect="non-scaling-stroke"
                  className="stroke-danger"
                />
              </svg>
              <span className="text-xs text-muted-foreground">Cifras de ejemplo</span>
            </div>
          </article>

          {/* Códigos */}
          <article
            className={cn(
              CARD,
              'justify-center gap-6 border-sidebar bg-sidebar text-sidebar-foreground-strong sm:col-span-2 sm:flex-row sm:items-center sm:p-8',
            )}
          >
            <div className="flex grow flex-col gap-3">
              <h3 className={cn(DISPLAY, 'text-2xl font-semibold')}>Códigos que cuentan la historia</h3>
              <p className="text-sm leading-relaxed text-sidebar-foreground sm:text-base">
                Producto y lote en un código. La última letra dice de dónde vino: remate, propio, transformado,
                devuelto o proveedor.
              </p>
            </div>
            <ul className="flex shrink-0 flex-wrap gap-2.5 sm:flex-col" aria-label="Códigos de ejemplo">
              {CODES.map((c) => (
                <li
                  key={c.base}
                  className="rounded-input border border-sidebar-accent bg-sidebar-hover px-3.5 py-2.5 font-mono text-base"
                >
                  {c.base}
                  <span className="text-brand-on-dark">{c.origin}</span>
                </li>
              ))}
            </ul>
          </article>

          {SMALL.map((f) => (
            <article
              key={f.title}
              className={cn(CARD, f.soft ? 'border-brand-100 bg-brand-50' : 'border-border bg-card')}
            >
              {f.icon}
              <h3 className={cn(DISPLAY, 'text-xl font-semibold sm:text-2xl')}>{f.title}</h3>
              <p className="text-sm leading-normal text-body sm:text-base">{f.body}</p>
            </article>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
