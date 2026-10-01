import type { AttentionItem, Dashboard } from '@/features/dashboard/api'
import { formatDateShort } from '@/lib/dates'
import type { StackedBarSegment } from '@/components/shared/charts/StackedBar'

/**
 * Los contratos que siguen abiertos. `ready_for_auction_count` ya está dentro
 * de `in_extension_count` (el backend cuenta por `status`, y un listo para
 * remate sigue en `in_extension` con la prórroga vencida): no se suma dos veces.
 */
export function openContractsCount(contracts: Dashboard['contracts']): number {
  return contracts.active_count + contracts.in_arrears_count + contracts.in_extension_count
}

/**
 * Los tramos de «Contratos por estado», en orden de la maqueta. «Prórroga»
 * descuenta los listos para remate (que el backend cuenta dentro de
 * `in_extension_count`) para que ningún contrato se dibuje dos veces; los
 * rematados son los de ESTE MES (`auctioned_this_month`), no el histórico.
 */
export function contractStatusSegments(contracts: Dashboard['contracts']): StackedBarSegment[] {
  return [
    { key: 'active', label: 'Vigentes', labelOne: 'Vigente', count: contracts.active_count, tone: 'active' },
    { key: 'in_arrears', label: 'En mora', count: contracts.in_arrears_count, tone: 'arrears' },
    {
      key: 'in_extension',
      label: 'Prórroga',
      labelOne: 'En prórroga',
      count: Math.max(0, contracts.in_extension_count - contracts.ready_for_auction_count),
      tone: 'extension',
    },
    { key: 'ready_for_auction', label: 'Listos para remate', labelOne: 'Listo para remate', count: contracts.ready_for_auction_count, tone: 'danger-hatch' },
    { key: 'auctioned_month', label: 'Rematados este mes', labelOne: 'Rematado este mes', count: contracts.auctioned_this_month, tone: 'closed' },
  ]
}

/**
 * La pastilla sale del MOTIVO, no del `status`: el día del vencimiento el
 * contrato ya está `in_arrears` en la base, pero lo que pide es cobrar la
 * cuota de hoy, y la maqueta lo muestra «Vigente · vence hoy». Y un listo para
 * remate sigue `in_extension` con la prórroga vencida.
 */
export const REASON_BADGE = {
  ready_for_auction: 'ready_for_auction',
  in_arrears: 'in_arrears',
  in_extension: 'in_extension',
  due_today: 'active',
} as const satisfies Record<AttentionItem['reason_code'], string>

/** La subleyenda bajo el cliente, por motivo. */
export function reasonDetail(item: AttentionItem): string {
  switch (item.reason_code) {
    case 'ready_for_auction':
      return `prórroga vencida ${formatDateShort(item.reference_date)}`
    case 'in_arrears': {
      const days = item.days_overdue ?? 0
      return days === 1 ? '1 día de atraso' : `${days} días de atraso`
    }
    case 'in_extension':
      return `vence ${formatDateShort(item.reference_date)}`
    case 'due_today':
      return 'vence hoy'
  }
}

