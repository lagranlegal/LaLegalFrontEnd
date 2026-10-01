import { Link } from '@tanstack/react-router'
import { usePermission } from '@/lib/permissions/usePermission'
import { useContractAttention, useDashboard, useReadyForAuction } from '@/features/dashboard/api'
import { TodayTasks } from '@/features/dashboard/components/TodayTasks'
import { InicioHeader } from '@/features/dashboard/components/InicioHeader'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { QuickActions } from '@/features/dashboard/components/QuickActions'
import { Money } from '@/components/shared/Money'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { EmptyState } from '@/components/shared/EmptyState'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { ContractsStatusChart, type StatusDatum } from '@/components/shared/charts/ContractsStatusChart'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'
import { compareMoney } from '@/lib/money'

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-input bg-border" />
      <div className="grid grid-cols-2 gap-4 rounded-card border border-border bg-card p-card sm:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="h-3 w-20 animate-pulse rounded bg-border" />
            <div className="h-6 w-16 animate-pulse rounded bg-border" />
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-card border border-border bg-card" />
    </div>
  )
}

/** «$ 800.000 vendidas − $ 300.000 devueltas», solo si hubo devoluciones. */
function ReturnsHint({ gross, returns }: { gross?: string; returns?: string }) {
  // Un backend anterior a F1 no manda el bruto: sin él no hay qué explicar.
  if (!gross || !returns || compareMoney(returns, '0') <= 0) return null
  return (
    <>
      <Money value={gross} /> vendidas − <Money value={returns} /> devueltas
    </>
  )
}

export function DashboardPage() {
  // Sin el permiso la consulta no sale: el 403 era seguro, pero evitable
  // (issue #9). El 403 se sigue atendiendo abajo por si `/me` quedó viejo.
  const canViewReports = usePermission('reports.view')
  const canViewContracts = usePermission('contracts.view')
  const canAuction = usePermission('contracts.auction')
  const { data, isPending, isError, error, refetch } = useDashboard({ enabled: canViewReports })
  const attention = useContractAttention({ enabled: canViewContracts })
  const { data: readyForAuction } = useReadyForAuction({ enabled: canAuction })
  const reportsDenied = !canViewReports || (isError && isPermissionError(error))

  return (
    <div className="flex flex-col gap-4.5">
      <InicioHeader />
      {/* «Para hoy» es de todo el que ve contratos, también el Asesor (F9-60). */}
      {canViewContracts && (
        <TodayTasks data={attention.data} isPending={attention.isPending} error={attention.error} onRetry={() => void attention.refetch()} />
      )}
      {/* `/` es el destino de TODOS los guards de ruta: un rol sin contratos ni
          reportes (Bodega) ve sus accesos directos, no una pantalla vacía. */}
      {reportsDenied && !canViewContracts && (
        <>
          <QuickActions />
          <p className="text-xs text-muted-foreground">
            El resumen de cifras del inicio es para quien tiene el permiso «Dashboard y reportes».
          </p>
        </>
      )}
      {!reportsDenied &&
        (isPending ? (
          <DashboardSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar el resumen de cifras.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <ReportsSection data={data} readyForAuction={readyForAuction} />
        ))}
    </div>
  )
}

function ReportsSection({
  data,
  readyForAuction,
}: {
  data: NonNullable<ReturnType<typeof useDashboard>['data']>
  readyForAuction: ReturnType<typeof useReadyForAuction>['data']
}) {
  const contractsByStatus: StatusDatum[] = [
    { key: 'active', label: 'Vigentes', count: data.contracts.active_count, color: 'var(--status-active)' },
    { key: 'in_arrears', label: 'En mora', count: data.contracts.in_arrears_count, color: 'var(--status-arrears)' },
    { key: 'in_extension', label: 'Prórroga', count: data.contracts.in_extension_count, color: 'var(--status-extension)' },
    { key: 'ready_for_auction', label: 'Listos p/ remate', count: data.contracts.ready_for_auction_count, color: 'var(--status-arrears)' },
    { key: 'auctioned', label: 'Rematados', count: data.contracts.auctioned_count, color: 'var(--status-auctioned)' },
  ]

  return (
    <>
      <KpiRow>
        <KpiCard label="Cartera activa" value={<Money value={data.contracts.capital_outstanding} />} />
        {/* F7-07: `today_total`/`month_total` ya vienen NETOS de
            devoluciones. Si hubo alguna, la cifra baja sin explicación —
            se nombran el bruto y lo devuelto debajo. */}
        <KpiCard
          label="Ventas de hoy"
          value={<Money value={data.sales.today_total} />}
          hint={<ReturnsHint gross={data.sales.today_gross} returns={data.sales.today_returns} />}
        />
        <KpiCard
          label="Ventas del mes"
          value={<Money value={data.sales.month_total} />}
          hint={<ReturnsHint gross={data.sales.month_gross} returns={data.sales.month_returns} />}
        />
        <KpiCard label="Contratos activos" value={data.contracts.active_count} />
        <KpiCard
          label="Artículos disponibles"
          value={
            <>
              {data.inventory.available_count}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                · <Money value={data.inventory.available_value} />
              </span>
            </>
          }
        />
        <KpiCard label="Estado de caja" value={data.cashbox.session_open ? 'Abierta' : 'Cerrada'} />
      </KpiRow>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="enter-up rounded-card border border-border bg-card p-card">
          <h2 className="text-sm font-medium text-foreground">Contratos por estado</h2>
          <ContractsStatusChart data={contractsByStatus} />
        </div>

        <div className="enter-up rounded-card border border-border bg-card p-card">
          <h2 className="text-sm font-medium text-foreground">Listos para remate</h2>
          {!readyForAuction || readyForAuction.length === 0 ? (
            <EmptyState title="Nada pendiente de remate" description="Los contratos vencidos que agotan su prórroga aparecen aquí." />
          ) : (
            <div className="mt-3 flex flex-col divide-y divide-border">
              {readyForAuction.slice(0, 5).map((contract) => (
                <Link
                  key={contract.id}
                  to="/contratos/$contractId"
                  params={{ contractId: contract.id }}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-input px-2 py-2.5 text-sm transition-colors hover:bg-accent"
                >
                  <span className="font-medium text-foreground">
                    Contrato <RecordNumber value={contract.number} />
                  </span>
                  {/* `extension_ends_at`, NO `due_date`. Lo que pone a un
                      contrato en esta lista es que se le venció la PRÓRROGA
                      (`list_ready_for_auction` filtra por
                      `extension_ends_at < hoy`), y las dos fechas no tienen
                      relación: un cliente que pagó interés un año tiene el
                      vencimiento del papel pasado hace meses y la prórroga
                      vencida la semana pasada. La card mostraba la fecha
                      equivocada como si fuera la causa. */}
                  <span className="text-muted-foreground">
                    Prórroga vencida el {contract.extension_ends_at ? formatDate(contract.extension_ends_at) : '—'}
                  </span>
                  <Money value={contract.capital_balance} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
