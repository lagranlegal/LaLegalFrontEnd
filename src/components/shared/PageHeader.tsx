import type { ReactNode } from 'react'

/**
 * Título + acciones. Toda página lo usa — consistencia de jerarquía
 * (docs/DESIGN_SYSTEM.md §3). `title` acepta `ReactNode`, no solo texto —
 * un detalle ("Contrato #123") necesita que el número lleve el tratamiento
 * de `RecordNumber`, no una cadena plana.
 */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
