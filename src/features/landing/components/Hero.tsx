import { Fragment, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { BUTTON_GHOST_DARK, BUTTON_LG, BUTTON_PRIMARY, CONTAINER, DISPLAY } from '../styles'
import { HeroComposition } from './HeroComposition'
import { ArrowRight, DemoLink } from './primitives'

type Vars = CSSProperties & Record<`--${string}`, string | number>

const WORDS: { text: string; gold?: boolean }[] = [
  { text: 'Tu' },
  { text: 'compraventa' },
  { text: 'entera,' },
  { text: 'en', gold: true },
  { text: 'orden.', gold: true },
]

const TRUST = ['Pesos colombianos', 'Hora de Bogotá', 'Fotos y datos en privado']

function Check() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 text-brand-on-dark"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/**
 * El hero, sobre carbón. Sube por debajo del nav (que es transparente arriba)
 * para que la grilla y el brillo queden detrás de los dos.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative -mt-16 overflow-hidden bg-sidebar pt-16 text-sidebar-foreground-strong lg:-mt-22 lg:pt-22"
    >
      <div aria-hidden="true" className="landing-grid absolute inset-0 hidden sm:block" />
      <div
        aria-hidden="true"
        className="landing-glow absolute -right-50 -top-40 size-130 lg:-right-55 lg:-top-65 lg:size-225"
      />

      <div
        className={cn(
          CONTAINER,
          'relative grid items-center gap-10 pb-14 pt-10 sm:gap-16 sm:pb-20 sm:pt-16 xl:grid-cols-2 xl:pb-30 xl:pt-24',
        )}
      >
        <div className="flex max-w-140 flex-col gap-5.5 sm:gap-8">
          <p
            className="landing-stagger flex items-center gap-2 self-start rounded-pill border border-sidebar-accent py-1.5 pl-2 pr-3 text-xs text-sidebar-foreground sm:gap-2.5 sm:py-2 sm:pl-2.5 sm:pr-3.5 sm:text-sm"
            style={{ '--i': 0 } as Vars}
          >
            <span aria-hidden="true" className="size-2 rounded-pill bg-primary" />
            Hecho para compraventas colombianas
          </p>

          <h1 id="hero-title" className={cn(DISPLAY, 'text-hero font-bold leading-none')}>
            {WORDS.map((w, i) => (
              <Fragment key={w.text}>
                <span className={cn('landing-word', w.gold && 'text-brand-on-dark')} style={{ '--i': i } as Vars}>
                  {w.text}
                </span>
                {i < WORDS.length - 1 && ' '}
              </Fragment>
            ))}
          </h1>

          <p
            className="landing-stagger max-w-130 text-lg leading-relaxed text-sidebar-foreground sm:text-xl"
            style={{ '--i': 1 } as Vars}
          >
            Contratos de empeño, inventario, tienda y caja diaria en un solo lugar. Los intereses, la mora y el
            remate los calcula Prendo — no la memoria del dueño.
          </p>

          <div
            className="landing-stagger flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5"
            style={{ '--i': 2 } as Vars}
          >
            <DemoLink className={cn(BUTTON_PRIMARY, BUTTON_LG)}>
              Solicitar demostración
              <ArrowRight className="transition-transform duration-(--duration-fast) ease-out group-hover:translate-x-1" />
            </DemoLink>
            <a href="#cadena" className={cn(BUTTON_GHOST_DARK, BUTTON_LG)}>
              Ver cómo funciona
            </a>
          </div>

          <ul
            className="landing-stagger hidden flex-wrap gap-x-7 gap-y-2 pt-2 text-sm text-sidebar-muted-foreground sm:flex"
            style={{ '--i': 3 } as Vars}
          >
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <HeroComposition />
      </div>
    </section>
  )
}
