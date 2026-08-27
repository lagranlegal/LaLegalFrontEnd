import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge, STATUS_LABELS, type KnownStatus } from '@/components/shared/StatusBadge'
import { LegacyCodeBadge } from '@/components/shared/LegacyCodeBadge'
import { Money } from '@/components/shared/Money'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate, todayBogota } from '@/lib/dates'
import { fetchAllContracts, useContractsList, useContractSearch, useReadyForAuction, type Contract } from '@/features/contracts/api'
import { fetchAllCustomers } from '@/features/customers/api'
import { effectiveContractStatus } from '@/features/contracts/contractStatus'
import { exportRowsToExcel } from '@/lib/export/xlsx'

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Vigentes' },
  { value: 'in_arrears', label: 'En mora' },
  { value: 'in_extension', label: 'Prórroga' },
  { value: 'ready_for_auction', label: 'Listos para remate' },
  { value: 'auctioned', label: 'Rematados' },
]

export function ContractsListPage() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const isSearching = q.trim().length > 0
  // "Listos para remate" NO es un status real (ver `contractStatus.ts`) — no
  // existe un `?status=ready_for_auction` en `GET /contracts`. Esa pestaña
  // usa el endpoint dedicado `GET /contracts/ready-for-auction` en su lugar;
  // `useContractsList` se sigue llamando con `''` mientras tanto (reusa el
  // cache de "Todos", sin pedir nada nuevo) porque los hooks no pueden
  // llamarse condicionalmente.
  const isReadyTab = status === 'ready_for_auction'
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useContractsList(isReadyTab ? '' : status)
  const { data: readyContracts, isPending: readyPending, isError: readyError, refetch: refetchReady } = useReadyForAuction()
  const { data: searchResults, isPending: searchPending, isError: searchError, refetch: refetchSearch } = useContractSearch(q)
  const [isExporting, setIsExporting] = useState(false)

  const contracts = isSearching ? (searchResults ?? []) : isReadyTab ? (readyContracts ?? []) : (data?.pages.flatMap((page) => page.items) ?? [])

  // Exporta por ESTADO (igual que la pestaña activa), no por el buscador
  // libre de arriba — ese es un parche client-side de 200 registros (ver
  // `useContractSearch`), no un filtro real del backend. "Listos para
  // remate" tampoco es un `status` real (`GET /contracts/ready-for-auction`
  // es su propio endpoint, sin cursor) — se exporta la lista completa tal
  // cual la trae ese endpoint, sin pasar por `fetchAllContracts`.
  async function handleExport() {
    setIsExporting(true)
    try {
      const allContracts = isReadyTab ? (readyContracts ?? []) : await fetchAllContracts(status)
      const customers = await fetchAllCustomers()
      const customerById = new Map(customers.map((c) => [c.id, c]))
      const rows = allContracts.map((contract) => {
        const customer = customerById.get(contract.customer_id)
        const effectiveStatus = effectiveContractStatus(contract) as KnownStatus
        return {
          Número: contract.number,
          'Código anterior': contract.legacy_code ?? '',
          Cliente: customer?.full_name ?? '',
          Documento: customer ? `${customer.doc_type.toUpperCase()} ${customer.doc_number}` : '',
          Capital: Number(contract.principal),
          Saldo: Number(contract.capital_balance),
          'Tasa mensual %': Number(contract.interest_rate_pct),
          Inicio: contract.start_date,
          Vencimiento: contract.due_date,
          Estado: STATUS_LABELS[effectiveStatus] ?? contract.status,
        }
      })
      exportRowsToExcel(`contratos-${todayBogota()}.xlsx`, 'Contratos', rows)
    } finally {
      setIsExporting(false)
    }
  }

  const columns: ColumnDef<Contract>[] = [
    {
      accessorKey: 'number',
      header: 'Número',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <span>#{info.getValue<number>()}</span>
          {info.row.original.legacy_code && <LegacyCodeBadge code={info.row.original.legacy_code} />}
        </div>
      ),
    },
    { accessorKey: 'principal', header: 'Capital', cell: (info) => <Money value={info.getValue<string>()} /> },
    { accessorKey: 'capital_balance', header: 'Saldo', cell: (info) => <Money value={info.getValue<string>()} /> },
    { accessorKey: 'due_date', header: 'Vencimiento', cell: (info) => formatDate(info.getValue<string>()) },
    { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={effectiveContractStatus(info.row.original)} /> },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contratos"
        actions={
          <div className="flex items-center gap-2">
            <Can permission="contracts.import">
              <Button variant="outline" onClick={() => navigate({ to: '/contratos/importar' })}>
                Registrar contrato existente
              </Button>
            </Can>
            <Can permission="contracts.create">
              <Button className="rounded-pill" onClick={() => navigate({ to: '/contratos/nuevo' })}>
                + Nuevo contrato
              </Button>
            </Can>
          </div>
        }
      />

      <SearchInput value={q} onChange={setQ} placeholder="Buscar por número o código anterior…" className="max-w-sm" />

      {!isSearching && (
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={cn(
                'rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
                status === tab.value ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent',
              )}
            >
              {tab.label}
            </button>
          ))}

          {/* Exporta la pestaña de estado activa completa, no solo la
              página ya cargada — mismo criterio que Inventario. */}
          <Button variant="outline" size="sm" className="ml-auto" disabled={isExporting} onClick={handleExport}>
            <Download className="size-4" />
            {isExporting ? 'Exportando…' : 'Exportar a Excel'}
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={contracts}
        getRowId={(row) => row.id}
        isLoading={isSearching ? searchPending : isReadyTab ? readyPending : isPending}
        isError={isSearching ? searchError : isReadyTab ? readyError : isError}
        onRetry={() => (isSearching ? refetchSearch() : isReadyTab ? refetchReady() : refetch())}
        emptyTitle={isSearching ? 'No encontramos contratos con eso' : status ? 'No hay contratos con ese estado' : 'Aún no tienes contratos'}
        emptyDescription={status || isSearching ? undefined : 'Crea el primero para empezar a prestar sobre prendas.'}
        onRowClick={(row) => navigate({ to: '/contratos/$contractId', params: { contractId: row.id } })}
        hasNextPage={isSearching ? false : isReadyTab ? false : hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  )
}
