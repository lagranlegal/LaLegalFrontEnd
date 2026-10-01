import { Circle, CircleCheck, CircleMinus, Mail, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Estado de CUENTA de usuario, NO el `StatusBadge` compartido: `"active"`
 * también es un estado de contrato ahí ("Vigente") — usar el mapa
 * compartido acá mostraría "Vigente" para un usuario activo, que no tiene
 * sentido en español. Mismo criterio de mapa-parcial-con-fallback que
 * `CONCEPT_LABELS` (lib/modules.ts): solo los valores vistos en pruebas
 * reales; uno nuevo se muestra tal cual en vez de romper.
 */
const USER_STATUS_LABELS: Record<string, string> = {
  invited: 'Invitado',
  active: 'Activo',
  inactive: 'Inactivo',
}

// Mismo lenguaje que `StatusBadge` (rediseño P1): ícono + palabra + tono
// suave. Un usuario inactivo NO es una alarma: va neutro, no en rojo.
const USER_STATUS_STYLE: Record<string, { classes: string; Icon: LucideIcon }> = {
  invited: { classes: 'bg-neutral-soft text-body', Icon: Mail },
  active: { classes: 'bg-success-soft text-success', Icon: CircleCheck },
  inactive: { classes: 'bg-neutral-soft text-body', Icon: CircleMinus },
}

const FALLBACK = { classes: 'bg-neutral-soft text-body', Icon: Circle }

export function UserStatusBadge({ status, className }: { status: string; className?: string }) {
  const { classes, Icon } = USER_STATUS_STYLE[status] ?? FALLBACK
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.25 rounded-pill pr-2.25 pl-1.75 text-xs font-semibold whitespace-nowrap', classes, className)}>
      <Icon className="size-3.25 shrink-0" aria-hidden />
      {USER_STATUS_LABELS[status] ?? status}
    </span>
  )
}
