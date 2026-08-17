import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LegacyCodeBadge } from '@/components/shared/LegacyCodeBadge'
import { Money } from '@/components/shared/Money'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/dates'
import { useContractsList, type Contract } from '@/features/contracts/api'

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
  const navigate = useNavigate()
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useContractsList(status)

  const contracts = data?.pages.flatMap((page) => page.items) ?? []

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
    { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={info.getValue<string>()} /> },
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

      <div className="flex flex-wrap gap-2">
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
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle={status ? 'No hay contratos con ese estado' : 'Aún no tienes contratos'}
        emptyDescription={status ? undefined : 'Crea el primero para empezar a prestar sobre prendas.'}
        onRowClick={(row) => navigate({ to: '/contratos/$contractId', params: { contractId: row.id } })}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  )
}
