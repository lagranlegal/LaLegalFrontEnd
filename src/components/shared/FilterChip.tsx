import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Pestaña de filtro en forma de pastilla (estado de contratos, módulo de
 * Reportes, tipo de documento…). F9-13: la activa iba en el oro relleno del
 * botón primario y competía con «+ Nuevo contrato» como acción principal. Un
 * solo primario dorado por pantalla: el filtro activo va en NEUTRO invertido
 * (tinta sobre fondo, como el segmentado de la propuesta) y dice que está
 * activo con `aria-pressed`, no solo con el color.
 *
 * Es, con `StatusBadge`, lo único con forma de pastilla en la app.
 */
export function FilterChip({ active, className, ...props }: { active: boolean } & Omit<ComponentProps<'button'>, 'type'>) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-9 items-center rounded-pill px-3 text-sm font-medium transition-colors duration-(--duration-fast)',
        active ? 'bg-foreground text-background' : 'bg-card text-body ring-1 ring-border-strong ring-inset hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
