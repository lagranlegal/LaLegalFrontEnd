import type { Dashboard } from '@/features/dashboard/api'
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
