import { Link } from '@tanstack/react-router'
import { useMe } from '@/lib/auth/me'
import { useDashboard, useReadyForAuction } from '@/features/dashboard/api'
import { PageHeader } from '@/components/shared/PageHeader'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { EmptyState } from '@/components/shared/EmptyState'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { ContractsStatusChart, type StatusDatum } from '@/components/shared/charts/ContractsStatusChart'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-8 w-64 animate-pulse rounded-input bg-border" />
      <div className="grid grid-cols-2 gap-4 rounded-card border border-border bg-card p-card sm:grid-cols-3 lg:grid-cols-6">
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

export function DashboardPage() {
  const { data: me } = useMe()
  const { data, isPending, isError, error, refetch } = useDashboard()
  const { data: readyForAuction } = useReadyForAuction()

  if (isPending) return <DashboardSkeleton />

  if (isError) {
    // `/` es el destino al que redirigen TODOS los guards de ruta, así que es
    // la pantalla que ve un usuario cuyo rol no le da acceso a casi nada. Sin
    // `reports.view` el dashboard no carga, y decirle "no se pudo" lo deja
    // creyendo que la app está rota — cuando en realidad no tiene permiso.
    // Se le explica y se le señala el menú, que sí muestra lo que sí puede.
    if (isPermissionError(error)) {
      return (
        <EmptyState
          title={`Hola, ${me?.user.full_name ?? ''}`.trim()}
          description="Tu rol no incluye el resumen del inicio. Usa el menú de la izquierda para ir a lo que sí tienes habilitado, o pídele a un administrador el permiso 'Dashboard y reportes'."
        />
      )
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-card p-card text-center">
        <p className="text-sm text-muted-foreground">No se pudo cargar el dashboard.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const contractsByStatus: StatusDatum[] = [
    { key: 'active', label: 'Vigentes', count: data.contracts.active_count, color: 'var(--status-active)' },
    { key: 'in_arrears', label: 'En mora', count: data.contracts.in_arrears_count, color: 'var(--status-arrears)' },
    { key: 'in_extension', label: 'Prórroga', count: data.contracts.in_extension_count, color: 'var(--status-extension)' },
    { key: 'ready_for_auction', label: 'Listos p/ remate', count: data.contracts.ready_for_auction_count, color: 'var(--status-arrears)' },
    { key: 'auctioned', label: 'Rematados', count: data.contracts.auctioned_count, color: 'var(--status-auctioned)' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Hola, ${me?.user.full_name ?? ''}`} description={`Actualizado al ${formatDate(data.as_of)}`} />

      <KpiRow>
        <KpiCard label="Cartera activa" value={<Money value={data.contracts.capital_outstanding} />} tone="danger" />
        <KpiCard label="Ventas de hoy" value={<Money value={data.sales.today_total} />} tone="brand" />
        <KpiCard label="Ventas del mes" value={<Money value={data.sales.month_total} />} tone="brand" />
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
        <KpiCard label="Estado de caja" value={data.cashbox.session_open ? 'Abierta' : 'Cerrada'} tone={data.cashbox.session_open ? 'success' : 'danger'} />
      </KpiRow>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Contratos por estado</h2>
          <ContractsStatusChart data={contractsByStatus} />
        </div>

        <div className="rounded-card border border-border bg-card p-card shadow-card">
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
                  <span className="text-muted-foreground">Vencido el {formatDate(contract.due_date)}</span>
                  <Money value={contract.capital_balance} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
