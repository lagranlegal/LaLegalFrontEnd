import { cn } from '@/lib/utils'
import { DEMO_CONTACT, DEMO_SECTION_ID, contactLabel } from '../content'
import { BUTTON_GHOST_DARK, BUTTON_LG, BUTTON_PRIMARY, CONTAINER, DISPLAY, LINK_DARK } from '../styles'
import { AccountLink, ArrowRight, DemoLink, PrendoMark, Reveal } from './primitives'

/** El CTA final: es el destino de «Solicitar demostración» mientras no haya canal. */
export function ClosingSection({ hasSession }: { hasSession: boolean }) {
  return (
    <section
      id={DEMO_SECTION_ID}
      aria-labelledby="demo-title"
      className="relative scroll-mt-16 overflow-hidden bg-sidebar pb-16 pt-18 text-sidebar-foreground-strong sm:pb-24 sm:pt-28 lg:scroll-mt-22 lg:pb-30 lg:pt-34"
    >
      <div
        aria-hidden="true"
        className="landing-glow absolute -top-50 left-1/2 h-120 w-190 -translate-x-1/2 lg:-top-75 lg:h-175 lg:w-275"
      />
      <Reveal className={cn(CONTAINER, 'relative flex flex-col gap-5.5 sm:items-center sm:gap-7 sm:text-center')}>
        <PrendoMark className="hidden size-18 sm:block" />
        <h2 id="demo-title" className={cn(DISPLAY, 'max-w-225 text-closing font-bold leading-none')}>
          Pon tu compraventa en orden <span className="text-brand-on-dark">desde el primer día.</span>
        </h2>
        <p className="max-w-155 text-base leading-relaxed text-sidebar-foreground sm:text-lg">
          Te mostramos Prendo con el flujo de tu propio negocio: un contrato, un abono, un remate y el cierre de caja.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-3.5">
          <DemoLink className={cn(BUTTON_PRIMARY, BUTTON_LG)}>
            Solicitar demostración
            <ArrowRight className="transition-transform duration-(--duration-fast) ease-out group-hover:translate-x-1" />
          </DemoLink>
          <AccountLink hasSession={hasSession} className={cn(BUTTON_GHOST_DARK, BUTTON_LG)}>
            {hasSession ? 'Ir a mi panel' : 'Ya tengo cuenta'}
          </AccountLink>
        </div>
        {DEMO_CONTACT && (
          <p className="text-sm text-sidebar-muted-foreground">
            O escríbenos directamente:{' '}
            <a href={DEMO_CONTACT} className={cn(LINK_DARK, 'underline underline-offset-4')}>
              {contactLabel(DEMO_CONTACT)}
            </a>
          </p>
        )}
      </Reveal>
    </section>
  )
}

export function LandingFooter({ hasSession }: { hasSession: boolean }) {
  return (
    <footer className="bg-sidebar pb-8 text-sm text-sidebar-muted-foreground lg:pb-16">
      <div className={cn(CONTAINER)}>
        <div className="flex flex-col gap-5 border-t border-sidebar-border pt-6 sm:flex-row sm:items-center sm:justify-between sm:pt-8">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <PrendoMark className="size-6" />
            <span className={cn(DISPLAY, 'text-lg font-semibold text-sidebar-foreground-strong')}>Prendo</span>
            <span className="sm:ml-3">© 2026 · La plataforma para compraventas</span>
          </div>
          <nav aria-label="Pie de página">
            <ul className="flex flex-wrap gap-x-7 gap-y-1">
              <li>
                <a href="#producto" className={cn(LINK_DARK, 'inline-flex min-h-11 items-center text-sidebar-muted-foreground')}>
                  Producto
                </a>
              </li>
              <li>
                <a href="#confianza" className={cn(LINK_DARK, 'inline-flex min-h-11 items-center text-sidebar-muted-foreground')}>
                  Seguridad
                </a>
              </li>
              <li>
                <AccountLink
                  hasSession={hasSession}
                  className={cn(LINK_DARK, 'inline-flex min-h-11 items-center text-sidebar-muted-foreground')}
                >
                  {hasSession ? 'Ir a mi panel' : 'Iniciar sesión'}
                </AccountLink>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
