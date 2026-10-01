import { usePermission } from '@/lib/permissions/usePermission'
import { useContractAttention, useDashboard } from '@/features/dashboard/api'
import { InicioHeader } from '@/features/dashboard/components/InicioHeader'
import { TodayTasks } from '@/features/dashboard/components/TodayTasks'
import { DashboardKpis } from '@/features/dashboard/components/DashboardKpis'
import { ContractsByStatusCard } from '@/features/dashboard/components/ContractsByStatusCard'
import { AttentionCard } from '@/features/dashboard/components/AttentionCard'
import { QuickActions } from '@/features/dashboard/components/QuickActions'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** La forma de los KPIs en tarjetas, mientras carga. */
function KpisSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2.5" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-card border border-border bg-card p-card">
          <div className="h-3 w-24 animate-pulse rounded bg-border" />
          <div className="h-6 w-32 animate-pulse rounded bg-border" />
          <div className="h-3 w-20 animate-pulse rounded bg-border" />
        </div>
      ))}
    </div>
  )
}

/**
 * El Inicio (rediseño P2-c): encabezado → «Para hoy» → KPIs → «Contratos por
 * estado» y «Requieren acción». Cada bloque con su permiso y sin pedir lo que
 * el rol no puede ver (issue #9):
 * - `contracts.view` (también el Asesor): «Para hoy» y «Requieren acción».
 * - `reports.view` (Admin): los KPIs y la barra por estado.
 * - Ninguno de los dos (Bodega): los accesos directos a lo que sí puede hacer.
 */
export function DashboardPage() {
  const canViewReports = usePermission('reports.view')
  const canViewContracts = usePermission('contracts.view')
  const dashboard = useDashboard({ enabled: canViewReports })
  const attention = useContractAttention({ enabled: canViewContracts })
  // El 403 se sigue atendiendo por si `/me` quedó viejo: no es una falla.
  const showReports = canViewReports && !(dashboard.isError && isPermissionError(dashboard.error))
  const showStatus = showReports && !!dashboard.data
  const retryAttention = () => void attention.refetch()

  return (
    <div className="flex flex-col gap-4.5">
      <InicioHeader />

      {canViewContracts && (
        <TodayTasks data={attention.data} isPending={attention.isPending} error={attention.error} onRetry={retryAttention} />
      )}

      {/* `/inicio` es el destino de TODOS los guards: un rol sin contratos ni
          reportes ve sus accesos directos, no una pantalla vacía (F9-60). */}
      {!showReports && !canViewContracts && (
        <>
          <QuickActions />
          <p className="text-xs text-muted-foreground">
            El resumen de cifras del inicio es para quien tiene el permiso «Dashboard y reportes».
          </p>
        </>
      )}

      {showReports &&
        (dashboard.isPending ? (
          <KpisSkeleton />
        ) : dashboard.isError ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar el resumen de cifras.</p>
            <Button variant="outline" onClick={() => void dashboard.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <DashboardKpis data={dashboard.data} />
        ))}

      {(showStatus || canViewContracts) && (
        <div className={cn('grid grid-cols-1 gap-4', showStatus && canViewContracts && 'xl:grid-cols-[minmax(250px,1fr)_minmax(0,2fr)]')}>
          {showStatus && dashboard.data && <ContractsByStatusCard contracts={dashboard.data.contracts} />}
          {canViewContracts && (
            <AttentionCard data={attention.data} isPending={attention.isPending} error={attention.error} onRetry={retryAttention} />
          )}
        </div>
      )}
    </div>
  )
}
