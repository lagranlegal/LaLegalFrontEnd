import { StackedBar } from '@/components/shared/charts/StackedBar'
import { contractStatusSegments, openContractsCount } from '@/features/dashboard/model'
import type { Dashboard } from '@/features/dashboard/api'

/**
 * «Contratos por estado» (rediseño P2-c): barra apilada con leyenda y conteo
 * en texto. Reemplaza la gráfica de barras, que a 390 px salía sin barras y
 * sin nombre por estado (F9-08) ni texto alternativo (F9-09).
 */
export function ContractsByStatusCard({ contracts }: { contracts: Dashboard['contracts'] }) {
  const open = openContractsCount(contracts)
  return (
    <section aria-labelledby="inicio-por-estado" className="enter-up flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="inicio-por-estado" className="text-md font-semibold text-foreground">
          Contratos por estado
        </h2>
        <span className="text-caption font-medium text-brand">{open === 1 ? '1 abierto' : `${open} abiertos`}</span>
      </div>
      <StackedBar segments={contractStatusSegments(contracts)} />
    </section>
  )
}
