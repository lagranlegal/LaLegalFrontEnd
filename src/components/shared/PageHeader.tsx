import type { ReactNode } from 'react'

/**
 * Título + acciones. Toda página lo usa — consistencia de jerarquía
 * (docs/DESIGN_SYSTEM.md §3). `title` acepta `ReactNode`, no solo texto —
 * un detalle ("Contrato #123") necesita que el número lleve el tratamiento
 * de `RecordNumber`, no una cadena plana.
 *
 * `min-w-0` en el bloque del título y `flex-wrap` en el de acciones son los que
 * lo sostienen en pantallas angostas: sin los dos, en 360px el título no se
 * encoge por debajo de su contenido y las acciones no bajan de línea entre sí,
 * así que la fila empujaba fuera del viewport — 59px en /caja (tres botones) y
 * 14px en /contratos. Se arregla acá y no pantalla por pantalla porque todas
 * usan este componente, así que de paso previene las que vengan (auditoría de
 * QA, F6-03; DESIGN_SYSTEM §4.11 pide 360px usable: el mostrador puede ser un
 * celular).
 */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
