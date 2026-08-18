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

const USER_STATUS_CLASSES: Record<string, string> = {
  invited: 'bg-status-neutral/15 text-status-neutral',
  active: 'bg-status-active/15 text-status-active',
  inactive: 'bg-status-arrears/15 text-status-arrears',
}

const FALLBACK_CLASSES = 'bg-status-neutral/15 text-status-neutral'

export function UserStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium', USER_STATUS_CLASSES[status] ?? FALLBACK_CLASSES, className)}>
      {USER_STATUS_LABELS[status] ?? status}
    </span>
  )
}
