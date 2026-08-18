import { cn } from '@/lib/utils'

/**
 * Estado de EMPRESA (`CompanyOut.status`), separado del `StatusBadge`
 * compartido por la misma razón que `UserStatusBadge` (paso 8): `"active"`
 * ya significa "Vigente" para un contrato ahí — reusarlo mostraría eso para
 * una empresa activa, sin sentido en español. Mapa parcial con fallback,
 * mismo criterio que el resto de badges de estado del proyecto.
 */
const COMPANY_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  suspended: 'Suspendida',
}

const COMPANY_STATUS_CLASSES: Record<string, string> = {
  active: 'bg-status-active/15 text-status-active',
  suspended: 'bg-status-auctioned/15 text-status-auctioned',
}

const FALLBACK_CLASSES = 'bg-status-neutral/15 text-status-neutral'

export function CompanyStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium', COMPANY_STATUS_CLASSES[status] ?? FALLBACK_CLASSES, className)}>
      {COMPANY_STATUS_LABELS[status] ?? status}
    </span>
  )
}
