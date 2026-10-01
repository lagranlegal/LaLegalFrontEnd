import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { DEMO_CONTACT, DEMO_SECTION_ID } from '../content'
import { useInView } from '../hooks'

// El logo vive en components/shared (también lo usan las páginas de salida).
export { PrendoMark } from '@/components/shared/PrendoMark'

/** Rótulo en versalitas encima de cada titular de sección. */
export function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <p
      className={cn(
        'text-xs font-semibold uppercase tracking-widest',
        onDark ? 'text-brand-on-dark' : 'text-brand',
      )}
    >
      {children}
    </p>
  )
}

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-4.5', className)}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

/**
 * «Solicitar demostración». Mientras `DEMO_CONTACT` sea `null` baja a la
 * sección final; cuando tenga un canal, lo abre.
 */
export function DemoLink({ className, children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  const external = DEMO_CONTACT?.startsWith('http')
  return (
    <a
      {...rest}
      href={DEMO_CONTACT ?? `#${DEMO_SECTION_ID}`}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={className}
    >
      {children}
    </a>
  )
}

/** «Iniciar sesión» o «Ir a mi panel», según haya sesión. */
export function AccountLink({
  hasSession,
  className,
  children,
}: {
  hasSession: boolean
  className?: string
  children: ReactNode
}) {
  return hasSession ? (
    <Link to="/inicio" className={className}>
      {children}
    </Link>
  ) : (
    <Link to="/auth/login" className={className}>
      {children}
    </Link>
  )
}

/**
 * Contenedor que hace `enter-up` UNA vez al entrar en pantalla — al
 * contenedor, no a cada hijo (DESIGN_SYSTEM §2). Expone `data-in` para que
 * las piezas de adentro (la cadena, la curva del reporte) sepan cuándo
 * arrancar.
 */
export function Reveal({ className, children }: { className?: string; children: ReactNode }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  return (
    <div ref={ref} data-in={inView} className={cn(inView ? 'enter-up' : 'opacity-0', className)}>
      {children}
    </div>
  )
}
