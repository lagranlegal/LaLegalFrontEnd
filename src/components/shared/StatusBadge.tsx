import { cn } from '@/lib/utils'

/**
 * Único lugar donde se traducen estados de la API (docs/DESIGN_SYSTEM.md
 * §3). Ninguna feature escribe su propio mapa estado→texto — si falta un
 * estado, se agrega acá.
 */
export const STATUS_LABELS = {
  active: 'Vigente',
  in_arrears: 'En mora',
  in_extension: 'Prórroga',
  ready_for_auction: 'Listo para remate',
  auctioned: 'Rematado',
  paid: 'Pagado',
  draft: 'Borrador',
  available: 'Disponible',
  sold: 'Vendido',
  written_off: 'Dado de baja',
  invited: 'Invitado',
  open: 'Abierta',
  closed: 'Cerrada',
  // Estado de `ContractItemOut.status` mientras la prenda respalda un
  // contrato vigente — visto en pruebas reales (paso 5, contracts).
  in_custody: 'En custodia',
} as const

export type KnownStatus = keyof typeof STATUS_LABELS

// Clases completas y estáticas a propósito — Tailwind no genera CSS para
// nombres de clase construidos con interpolación (`bg-${token}/15`).
const STATUS_CLASSES: Record<KnownStatus, string> = {
  active: 'bg-status-active/15 text-status-active',
  in_arrears: 'bg-status-arrears/15 text-status-arrears',
  in_extension: 'bg-status-extension/15 text-status-extension',
  ready_for_auction: 'bg-status-arrears/15 text-status-arrears',
  auctioned: 'bg-status-auctioned/15 text-status-auctioned',
  paid: 'bg-status-paid/15 text-status-paid',
  draft: 'bg-status-arrears/15 text-status-arrears',
  available: 'bg-status-active/15 text-status-active',
  sold: 'bg-status-paid/15 text-status-paid',
  written_off: 'bg-status-neutral/15 text-status-neutral',
  invited: 'bg-status-neutral/15 text-status-neutral',
  open: 'bg-status-active/15 text-status-active',
  closed: 'bg-status-neutral/15 text-status-neutral',
  in_custody: 'bg-status-active/15 text-status-active',
}

const FALLBACK_CLASSES = 'bg-status-neutral/15 text-status-neutral'

function isKnownStatus(status: string): status is KnownStatus {
  return status in STATUS_LABELS
}

export function statusLabel(status: string): string {
  return isKnownStatus(status) ? STATUS_LABELS[status] : status
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const statusClasses = isKnownStatus(status) ? STATUS_CLASSES[status] : FALLBACK_CLASSES
  return (
    <span className={cn('inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium', statusClasses, className)}>
      {statusLabel(status)}
    </span>
  )
}
