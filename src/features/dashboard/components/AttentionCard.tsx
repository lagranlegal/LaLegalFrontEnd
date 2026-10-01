import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Link, useNavigate } from '@tanstack/react-router'
import { PartyPopper } from 'lucide-react'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { Money } from '@/components/shared/Money'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { AttentionItem, ContractAttention } from '@/features/dashboard/api'
import { REASON_BADGE, reasonDetail } from '@/features/dashboard/model'

/**
 * «Requieren acción» (rediseño P2-c): los contratos de `GET /contracts/attention`
 * en orden de urgencia (lo ordena el backend). Toda la fila abre el contrato,
 * también con Enter o Espacio (F9-11, lo hace `DataTable`).
 */
export function AttentionCard({
  data,
  isPending,
  error,
  onRetry,
}: {
  data: ContractAttention | undefined
  isPending: boolean
  error: unknown
  onRetry: () => void
}) {
  const navigate = useNavigate()
  const columns = useMemo<ColumnDef<AttentionItem>[]>(
    () => [
      { accessorKey: 'number', header: 'Contrato', cell: (info) => <RecordNumber value={info.row.original.number} /> },
      {
        accessorKey: 'customer_name',
        header: 'Cliente',
        cell: (info) => (
          <span className="block">
            <span className="block font-medium text-foreground">{info.row.original.customer_name}</span>
            <span className="block text-xs text-muted-foreground">{reasonDetail(info.row.original)}</span>
          </span>
        ),
      },
      {
        accessorKey: 'reason_code',
        header: 'Estado',
        cell: (info) => <StatusBadge status={REASON_BADGE[info.row.original.reason_code]} />,
      },
      {
        accessorKey: 'amount_due_today',
        header: 'Debe hoy',
        meta: { align: 'right' },
        cell: (info) => <Money value={info.row.original.amount_due_today} className="font-semibold whitespace-nowrap text-foreground" />,
      },
    ],
    [],
  )

  const items = data?.items ?? []

  return (
    <section aria-labelledby="inicio-requieren-accion" className="enter-up flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="inicio-requieren-accion" className="text-md font-semibold text-foreground">
          Requieren acción
        </h2>
        <Link to="/contratos" className="text-caption font-medium text-brand hover:underline">
          {data && data.items_total > items.length ? `Ver todos (${data.items_total})` : 'Ver todos'}
        </Link>
      </div>
      {!isPending && !error && items.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="Nada pendiente por hoy"
          description="Ningún contrato en mora, por rematar ni con cuota que venza hoy."
        />
      ) : (
        <DataTable
          embedded
          columns={columns}
          data={items}
          getRowId={(row) => row.contract_id}
          isLoading={isPending}
          isError={!!error}
          error={error}
          onRetry={onRetry}
          onRowClick={(row) => void navigate({ to: '/contratos/$contractId', params: { contractId: row.contract_id } })}
        />
      )}
    </section>
  )
}
