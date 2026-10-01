import { AlertTriangle, Hourglass } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePaymentOptions, type Contract } from '@/features/contracts/api'
import { contractStatusHeadline } from '@/features/contracts/contractStatus'

/**
 * Encabezado de estado del detalle (F9-16). Solo se monta para estados que
 * piden acción. Rediseño P1: el titular va en Archivo 700 a 22 px (como el
 * título de página, es tipografía de marca) y el tono sigue al estado: la mora
 * en rojo, la prórroga en ámbar, con el mismo ícono que su pastilla.
 */
export function ContractStatusHeadline({ contract }: { contract: Contract }) {
  const needsHeadline = contract.status === 'in_arrears' || contract.status === 'in_extension'
  if (!needsHeadline) return null
  return <ContractStatusHeadlineInner contract={contract} />
}

function ContractStatusHeadlineInner({ contract }: { contract: Contract }) {
  // Misma key que `PaymentOptionsPanel`: no es un request más.
  const { data: quote } = usePaymentOptions(contract.id)
  const headline = contractStatusHeadline(contract, quote)
  if (!headline) return null
  return <StatusHeadlineView tone={contract.status === 'in_extension' ? 'warning' : 'danger'} title={headline.title} detail={headline.detail} />
}

const TONES = {
  danger: { box: 'border-danger/35 bg-danger-soft', icon: 'text-danger', Icon: AlertTriangle },
  warning: { box: 'border-warning/35 bg-warning-soft', icon: 'text-warning', Icon: Hourglass },
} as const

/** La vista, sin datos: el titular y su detalle con el tono del estado. */
export function StatusHeadlineView({ tone, title, detail }: { tone: keyof typeof TONES; title: string; detail?: string | null }) {
  const { box, icon, Icon } = TONES[tone]
  return (
    <div role="status" data-tone={tone} className={cn('flex gap-3 rounded-card border p-card', box)}>
      <Icon className={cn('mt-0.5 size-5.5 shrink-0', icon)} aria-hidden />
      <div className="flex flex-col gap-0.5">
        <p className="font-display text-headline font-bold tracking-headline text-foreground">{title}</p>
        {detail && <p className="tnum text-sm text-body">{detail}</p>}
      </div>
    </div>
  )
}
