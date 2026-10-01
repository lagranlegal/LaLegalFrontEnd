import type { ReactNode } from 'react'
import { KpiCard, KpiRow, type KpiDelta } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import { changePercent, compareMoney } from '@/lib/money'
import { previousMonthName } from '@/lib/dates'
import type { Dashboard } from '@/features/dashboard/api'
import { openContractsCount } from '@/features/dashboard/model'

/**
 * El mes contra el anterior completo (lo calcula el backend; acá solo el %).
 * Sin mes anterior (0) no hay %: se dice cuánto fue, no un «100 %» inventado.
 */
function monthDelta(current: string, previous: string, monthName: string): { delta?: KpiDelta; hint?: ReactNode } {
  const pct = changePercent(current, previous)
  if (pct === null) return { hint: `Sin movimiento en ${monthName}` }
  return { delta: { pct, favorable: pct >= 0, label: `vs. ${monthName}` } }
}

/** «$ 800.000 vendidas − $ 300.000 devueltas», solo si hubo devoluciones (F7-07). */
function returnsHint(gross?: string, returns?: string): ReactNode {
  // Un backend anterior a F1 no manda el bruto: sin él no hay qué explicar.
  if (!gross || !returns || compareMoney(returns, '0') <= 0) return null
  return (
    <>
      <Money value={gross} /> vendidas − <Money value={returns} /> devueltas
    </>
  )
}

/**
 * KPIs del Inicio (rediseño P2-c), solo con `reports.view`. La cifra en color
 * de texto (F9-07); el color va en la flecha del mes.
 */
export function DashboardKpis({ data }: { data: Dashboard }) {
  const { contracts, sales, inventory } = data
  const previousMonth = previousMonthName(data.as_of)
  const interest = monthDelta(contracts.interest_collected_month, contracts.interest_collected_prev_month, previousMonth)
  const salesMonth = monthDelta(sales.month_total, sales.month_total_prev, previousMonth)
  const open = openContractsCount(contracts)
  const returns = returnsHint(sales.month_gross, sales.month_returns)

  return (
    <KpiRow tiles>
      <KpiCard
        label="Cartera activa"
        value={<Money value={contracts.capital_outstanding} />}
        hint={open === 1 ? '1 contrato abierto' : `${open} contratos abiertos`}
      />
      <KpiCard label="Intereses cobrados del mes" value={<Money value={contracts.interest_collected_month} />} {...interest} />
      {/* F7-07: `month_total` ya viene NETO de devoluciones. Si hubo alguna,
          la cifra baja sin explicación: se nombran el bruto y lo devuelto. */}
      <KpiCard
        label="Ventas del mes"
        value={<Money value={sales.month_total} />}
        delta={salesMonth.delta}
        hint={
          salesMonth.hint && returns ? (
            <>
              {salesMonth.hint} · {returns}
            </>
          ) : (
            (salesMonth.hint ?? returns)
          )
        }
      />
      <KpiCard
        label="Inventario disponible"
        value={<Money value={inventory.available_value} />}
        hint={inventory.available_count === 1 ? '1 artículo' : `${inventory.available_count} artículos`}
      />
    </KpiRow>
  )
}
