import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tarjeta de datos (rediseño P2-a, subida a compartidos en P3): título
 * 600 · 15 y contenido. La usan el detalle de contrato, la ficha del cliente,
 * Caja y Configuración. `action` va a la derecha del título (un enlace o un
 * botón chico, nunca un primario).
 */
export function SummaryCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode
  /** Una línea bajo el título (12, atenuada): para qué sirve la sección. */
  description?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  const heading = description ? (
    <div className="min-w-0">
      <h2 className="text-md font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  ) : (
    <h2 className="text-md font-semibold text-foreground">{title}</h2>
  )
  return (
    <section className={cn('grid min-w-0 content-start gap-3 rounded-card border border-border bg-card p-card', className)}>
      {action ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {heading}
          {action}
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  )
}

/** Un dato dentro de la grilla de una `SummaryCard`: etiqueta 12 atenuada y valor 600 · 14 tabular. */
export function SummaryField({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid min-w-0 gap-px', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tnum text-sm font-semibold break-words text-foreground">{children}</dd>
    </div>
  )
}
