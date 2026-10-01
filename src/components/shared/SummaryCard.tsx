import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tarjeta de datos (rediseño P2-a, DESIGN_SYSTEM §2): título 600 · 15 y
 * contenido, separada por borde y sin sombra. Nació en el Resumen del contrato;
 * subió a compartidos con P3 porque Reportes y el resumen del préstamo la usan.
 *
 * `description` va a la derecha del título (abajo en el celular): el rótulo de
 * qué mide la tarjeta («Corte de hoy», «No descuenta gastos»). `action` va
 * al final de la fila del título.
 */
export function SummaryCard({
  title,
  description,
  action,
  headingId,
  className,
  children,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  /** Para que una sección de afuera se nombre con este título (`aria-labelledby`). */
  headingId?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={headingId} className={cn('grid min-w-0 gap-3 rounded-card border border-border bg-card p-card', className)}>
      {description || action ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={headingId} className="text-md font-semibold text-foreground">
            {title}
          </h2>
          {description && <p className="min-w-0 text-xs text-muted-foreground">{description}</p>}
          {action}
        </div>
      ) : (
        <h2 id={headingId} className="text-md font-semibold text-foreground">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
