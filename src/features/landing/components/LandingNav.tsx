import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_LINKS } from '../content'
import { useScrolled } from '../hooks'
import { BUTTON_GHOST_DARK, BUTTON_PRIMARY, CONTAINER, DISPLAY, LINK_DARK } from '../styles'
import { AccountLink, DemoLink, PrendoMark } from './primitives'

/**
 * Barra superior. Transparente sobre el hero y, al bajar, carbón translúcido
 * con desenfoque. En celular, los enlaces viven en un panel que abre el botón
 * de menú.
 */
export function LandingNav({ hasSession }: { hasSession: boolean }) {
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    // Si la ventana crece hasta escritorio con el panel abierto, se cierra:
    // ahí los enlaces ya están en la barra.
    const desktop = window.matchMedia('(min-width: 64rem)')
    const onResize = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onResize)
    }
  }, [open])

  const close = () => setOpen(false)
  const solid = scrolled || open

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors duration-(--duration-base) ease-out',
        solid ? 'bg-sidebar/85 backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <div className={CONTAINER}>
        <div
          className={cn(
            'flex h-16 items-center justify-between gap-4 border-b lg:h-22',
            solid ? 'border-transparent' : 'border-sidebar-border',
          )}
        >
          <a
            href="#top"
            className="flex min-h-11 items-center gap-2.5 rounded-input text-sidebar-foreground-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-on-dark lg:gap-3"
          >
            <PrendoMark className="size-7.5 lg:size-9" />
            <span className={cn(DISPLAY, 'text-xl font-semibold lg:text-2xl')}>Prendo</span>
          </a>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex gap-10 text-base">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className={LINK_DARK}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1 lg:gap-3">
            <AccountLink
              hasSession={hasSession}
              className="inline-flex min-h-11 items-center rounded-pill px-2.5 text-sm font-medium text-sidebar-foreground-strong hover:bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-on-dark lg:px-5 lg:text-base"
            >
              <span className="lg:hidden">{hasSession ? 'Mi panel' : 'Entrar'}</span>
              <span className="hidden lg:inline">{hasSession ? 'Ir a mi panel' : 'Iniciar sesión'}</span>
            </AccountLink>
            <DemoLink className={cn(BUTTON_PRIMARY, 'hidden px-5.5 text-base lg:inline-flex')}>
              Solicitar demostración
            </DemoLink>
            <button
              type="button"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
              aria-controls="landing-menu"
              onClick={() => setOpen((v) => !v)}
              className="flex size-11 items-center justify-center rounded-input border border-sidebar-accent text-sidebar-foreground-strong hover:bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-on-dark lg:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="size-5"
              >
                {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        id="landing-menu"
        hidden={!open}
        className="border-b border-sidebar-border bg-sidebar lg:hidden"
      >
        <nav aria-label="Menú" className={cn(CONTAINER, 'enter-up flex flex-col gap-1 py-4')}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={close}
              className="flex min-h-12 items-center rounded-input px-3 text-base text-sidebar-foreground-strong hover:bg-sidebar-hover focus-visible:outline-2 focus-visible:outline-brand-on-dark"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-3 border-t border-sidebar-border pt-4">
            <DemoLink onClick={close} className={cn(BUTTON_PRIMARY, 'py-4 text-base')}>
              Solicitar demostración
            </DemoLink>
            <AccountLink hasSession={hasSession} className={cn(BUTTON_GHOST_DARK, 'py-3.5 text-base')}>
              {hasSession ? 'Ir a mi panel' : 'Iniciar sesión'}
            </AccountLink>
          </div>
        </nav>
      </div>
    </header>
  )
}
