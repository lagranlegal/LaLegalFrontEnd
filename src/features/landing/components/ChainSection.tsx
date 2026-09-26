import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CONTAINER, DISPLAY, SECTION_Y } from '../styles'
import { Eyebrow, PrendoMark, Reveal } from './primitives'

type Vars = CSSProperties & Record<`--${string}`, string | number>
type Tone = 'dark' | 'gold' | 'light'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5.5 lg:size-7"
    >
      {children}
    </svg>
  )
}

const STEPS: { title: string; body: string; tone: Tone; icon: ReactNode }[] = [
  {
    title: 'Empeño',
    body: 'Varias prendas con foto; plazo y tope según su categoría.',
    tone: 'dark',
    icon: (
      <Icon>
        <path d="M12 2 4 7v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7z" />
      </Icon>
    ),
  },
  {
    title: 'Abonos',
    body: 'Montos exactos que calcula Prendo. Sin cuentas a mano.',
    tone: 'dark',
    icon: (
      <Icon>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
      </Icon>
    ),
  },
  {
    title: 'Mora',
    body: 'El estado cambia solo cada noche. Nadie revisa fechas.',
    tone: 'dark',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </Icon>
    ),
  },
  {
    title: 'Prórroga',
    body: 'La ventana que da tu política, contada por el sistema.',
    tone: 'dark',
    icon: (
      <Icon>
        <path d="M8 2v4M16 2v4" />
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
      </Icon>
    ),
  },
  {
    title: 'Remate',
    body: 'Un clic: la prenda pasa a inventario con su código y su costo real.',
    tone: 'gold',
    icon: (
      <Icon>
        <path d="m14 13-7.5 7.5a2.1 2.1 0 0 1-3-3L11 10" />
        <path d="m16 16 6-6M8 8l6-6M9 7l8 8M21 11l-8-8" />
      </Icon>
    ),
  },
  {
    title: 'Vitrina',
    body: 'Producto y lote, con el costo que de verdad tuvo.',
    tone: 'light',
    icon: <PrendoMark bare className="size-5.5 lg:size-7" />,
  },
  {
    title: 'Venta',
    body: 'Mostrador tipo POS, con el total dentro del botón.',
    tone: 'light',
    icon: (
      <Icon>
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
      </Icon>
    ),
  },
]

/** Hasta el Remate la línea es de oro: es el tramo que sigue el contrato. */
const REMATE = STEPS.findIndex((s) => s.tone === 'gold')

const DOT: Record<Tone, string> = {
  dark: 'bg-sidebar text-brand-on-dark',
  gold: 'landing-ring bg-primary text-primary-foreground',
  light: 'border-2 border-border bg-card text-foreground',
}

export function ChainSection() {
  return (
    <section
      id="cadena"
      aria-labelledby="cadena-title"
      className={cn('scroll-mt-16 bg-muted lg:scroll-mt-22', SECTION_Y)}
    >
      <Reveal className={cn(CONTAINER, 'flex flex-col gap-7 sm:gap-14 lg:gap-18')}>
        <div className="flex flex-col gap-4 sm:gap-5 lg:items-center lg:text-center">
          <Eyebrow>Cómo funciona</Eyebrow>
          <h2 id="cadena-title" className={cn(DISPLAY, 'max-w-225 text-section font-bold leading-tight')}>
            De la prenda a la vitrina, sin perder el hilo.
          </h2>
          <p className="max-w-180 text-base leading-relaxed text-body sm:text-lg">
            Prendo acompaña el contrato entero. Y la cadena se recorre hacia atrás: del artículo en vitrina, al
            contrato del cliente que lo dejó.
          </p>
        </div>

        <ol className="flex flex-col gap-5 lg:grid lg:grid-cols-7 lg:gap-4">
          {STEPS.map((step, k) => {
            const last = k === STEPS.length - 1
            const segColor = k < REMATE ? 'bg-primary' : 'bg-border'
            return (
              <li key={step.title} className="relative flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
                {!last && (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn('landing-seg landing-seg-y absolute lg:hidden', segColor)}
                      style={{ '--k': k } as Vars}
                    />
                    <span
                      aria-hidden="true"
                      className={cn('landing-seg landing-seg-x absolute hidden lg:block', segColor)}
                      style={{ '--k': k } as Vars}
                    />
                  </>
                )}
                <span
                  className={cn(
                    'landing-step-dot relative z-10 flex size-12 shrink-0 items-center justify-center rounded-pill lg:size-18',
                    DOT[step.tone],
                  )}
                  style={{ '--k': k } as Vars}
                >
                  {step.icon}
                </span>
                <div className="landing-step flex flex-col gap-1 pt-1 lg:gap-4 lg:pt-0" style={{ '--k': k } as Vars}>
                  <h3 className={cn(DISPLAY, 'text-lg font-semibold lg:text-xl')}>{step.title}</h3>
                  <p className="text-sm leading-normal text-body">{step.body}</p>
                </div>
              </li>
            )
          })}
        </ol>

        <p className="landing-back flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 self-center rounded-panel border border-border bg-card px-5 py-3.5 text-center text-sm text-body sm:rounded-pill sm:px-6 sm:text-base">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="landing-back-arrow size-5 text-brand"
          >
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
          </svg>
          <span className="font-mono font-semibold text-foreground">JOC0007-01R</span>
          <span>→ remate del contrato</span>
          <span className="tnum font-semibold text-foreground">#128</span>
          <span>→ cliente que lo dejó</span>
        </p>
      </Reveal>
    </section>
  )
}
