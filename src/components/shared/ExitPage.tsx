import type { ComponentType, ReactNode } from 'react'
import { PrendoWordmark } from '@/components/shared/PrendoMark'
import { cn } from '@/lib/utils'

/**
 * Página de salida con marca (rediseño P3, F9-61): 404, suscripción vencida,
 * error general. Prendo arriba (son páginas de la plataforma, no del
 * inquilino: DESIGN_SYSTEM §1), un ícono en su cuadro, el titular en Archivo,
 * qué pasó y qué hacer, y UNA acción primaria (más una secundaria opcional).
 * Centrada en `--bg-app`, en una tarjeta de radio 12; en los dos temas sale de
 * tokens.
 */
export function ExitPage({
  icon: Icon,
  tone = 'neutral',
  eyebrow,
  title,
  children,
  actions,
  detail,
}: {
  icon: ComponentType<{ className?: string }>
  /** `danger` solo si algo falló de verdad (el error general); lo demás es neutro. */
  tone?: 'neutral' | 'warning' | 'danger'
  /** Una palabra arriba del titular («Error 404»), en versalitas atenuadas. */
  eyebrow?: string
  title: string
  children: ReactNode
  actions: ReactNode
  /** Un dato técnico chico al pie (el mensaje del error), para quien da soporte. */
  detail?: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-4 py-10">
      <PrendoWordmark />
      <section className="enter-up w-full max-w-md rounded-card border border-border bg-card p-6 text-center sm:p-8">
        <div
          aria-hidden
          className={cn(
            'mx-auto mb-4 flex size-12 items-center justify-center rounded-input',
            tone === 'neutral' && 'bg-muted text-muted-foreground',
            tone === 'warning' && 'bg-warning-soft text-warning',
            tone === 'danger' && 'bg-danger-soft text-danger',
          )}
        >
          <Icon className="size-6" />
        </div>
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{eyebrow}</p>}
        <h1 className="font-display text-2xl leading-7 font-semibold tracking-title text-foreground">{title}</h1>
        <div className="mt-2 text-sm text-body">{children}</div>
        <div className="mt-6 flex flex-col gap-2">{actions}</div>
        {detail && <p className="mt-4 text-xs break-words text-muted-foreground">{detail}</p>}
      </section>
    </main>
  )
}
