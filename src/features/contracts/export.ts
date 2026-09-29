import { STATUS_LABELS, type KnownStatus } from '@/components/shared/StatusBadge'
import { effectiveContractStatus } from '@/features/contracts/contractStatus'
import { sumMoney } from '@/lib/money'
import type { Contract } from '@/features/contracts/api'

/**
 * Los estados cuyo saldo ES cartera: la misma lista con la que el backend
 * suma `capital_outstanding` (`reports/repository.py`, `status in ('active',
 * 'in_arrears', 'in_extension')`).
 *
 * Un contrato rematado o sucedido por un recargo conserva su
 * `capital_balance` en la base —es la foto de cuando dejó de estar vivo—,
 * pero esa plata ya no está prestada: la del rematado se volvió inventario y
 * la del sucedido vive en el contrato nuevo. Exportarla como «Saldo» y
 * sumarla contaba dos veces la misma cartera (F7-10).
 */
const LIVE_STATUSES = new Set(['active', 'in_arrears', 'in_extension'])

export interface CustomerRef {
  full_name: string
  doc_type: string
  doc_number: string
}

/**
 * Filas de la hoja Contratos. «Saldo en cartera» es 0 en todo contrato que no
 * está vivo; la última fila es el total, que así cuadra con «Cartera activa».
 */
export function contractsExportRows(contracts: Contract[], customerById: Map<string, CustomerRef>): Record<string, string | number>[] {
  let cartera = '0.00'
  const rows: Record<string, string | number>[] = contracts.map((contract) => {
    const customer = customerById.get(contract.customer_id)
    const effectiveStatus = effectiveContractStatus(contract) as KnownStatus
    const vivo = LIVE_STATUSES.has(contract.status)
    if (vivo) cartera = sumMoney(cartera, contract.capital_balance)
    return {
      Número: contract.number,
      'Código anterior': contract.legacy_code ?? '',
      Cliente: customer?.full_name ?? '',
      Documento: customer ? `${customer.doc_type.toUpperCase()} ${customer.doc_number}` : '',
      Capital: Number(contract.principal),
      'Saldo en cartera': vivo ? Number(contract.capital_balance) : 0,
      'Tasa mensual %': Number(contract.interest_rate_pct),
      Inicio: contract.start_date,
      Vencimiento: contract.due_date,
      Estado: STATUS_LABELS[effectiveStatus] ?? contract.status,
    }
  })
  rows.push({
    Número: '',
    'Código anterior': '',
    Cliente: 'TOTAL EN CARTERA',
    Documento: 'Rematados y ampliados (recargo) van en 0: ese saldo ya no está prestado',
    Capital: '',
    'Saldo en cartera': Number(cartera),
    'Tasa mensual %': '',
    Inicio: '',
    Vencimiento: '',
    Estado: '',
  })
  return rows
}
