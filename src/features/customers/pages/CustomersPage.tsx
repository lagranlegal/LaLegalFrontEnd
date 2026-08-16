import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { SearchInput } from '@/components/shared/SearchInput'
import { DataTable } from '@/components/shared/DataTable'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { useCustomersList, type Customer } from '@/features/customers/api'
import { CustomerFormDialog } from '@/features/customers/components/CustomerFormDialog'

const columns: ColumnDef<Customer>[] = [
  { accessorKey: 'full_name', header: 'Nombre' },
  { accessorKey: 'doc_number', header: 'Documento', cell: (info) => `${info.row.original.doc_type.toUpperCase()} ${info.getValue<string>()}` },
  { accessorKey: 'phone', header: 'Teléfono' },
  { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={info.getValue<string>()} /> },
]

export function CustomersPage() {
  const [q, setQ] = useState('')
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useCustomersList(q)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>(undefined)
  // Fuerza remount del form en CADA apertura (no solo al cambiar de cliente)
  // — si no, un "+ Nuevo cliente" después de otro hereda el draft anterior.
  const [dialogNonce, setDialogNonce] = useState(0)

  const customers = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Clientes"
        actions={
          <Can permission="customers.create">
            <Button
              className="rounded-pill"
              onClick={() => {
                setEditingCustomer(undefined)
                setDialogNonce((n) => n + 1)
                setDialogOpen(true)
              }}
            >
              + Nuevo cliente
            </Button>
          </Can>
        }
      />

      <SearchInput value={q} onChange={setQ} placeholder="Buscar por nombre…" className="max-w-sm" />

      <DataTable
        columns={columns}
        data={customers}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle={q ? 'No encontramos clientes con ese nombre' : 'Aún no tienes clientes'}
        emptyDescription={q ? undefined : 'Crea el primero para empezar a registrar contratos y ventas.'}
        onRowClick={(row) => {
          setEditingCustomer(row)
          setDialogNonce((n) => n + 1)
          setDialogOpen(true)
        }}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      <CustomerFormDialog key={dialogNonce} open={dialogOpen} onOpenChange={setDialogOpen} customer={editingCustomer} />
    </div>
  )
}
