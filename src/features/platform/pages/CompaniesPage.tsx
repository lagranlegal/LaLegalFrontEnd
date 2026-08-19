import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime, todayBogota } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useCompaniesList, type Company } from '@/features/platform/api'
import { CompanyStatusBadge } from '@/features/platform/components/CompanyStatusBadge'
import { CompanyFormDialog } from '@/features/platform/components/CompanyFormDialog'
import { CompanyDetailDialog } from '@/features/platform/components/CompanyDetailDialog'

const columns: ColumnDef<Company>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'status', header: 'Estado', cell: (info) => <CompanyStatusBadge status={info.getValue<string>()} /> },
  { accessorKey: 'plan_name', header: 'Plan', cell: (info) => info.getValue<string | null>() ?? '—' },
  {
    accessorKey: 'subscription_expires_at',
    header: 'Suscripción vence',
    cell: (info) => {
      const value = info.getValue<string | null>()
      if (!value) return '—'
      const expired = value < todayBogota()
      return <span className={cn(expired && 'font-medium text-danger')}>{formatDate(value)}</span>
    },
  },
  { accessorKey: 'created_at', header: 'Creada el', cell: (info) => formatDateTime(info.getValue<string>()) },
]

export function CompaniesPage() {
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useCompaniesList()
  const [formOpen, setFormOpen] = useState(false)
  const [formNonce, setFormNonce] = useState(0)
  const [detailCompany, setDetailCompany] = useState<Company | undefined>(undefined)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailNonce, setDetailNonce] = useState(0)

  const companies = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Empresas"
        description="Tenants de la plataforma — crear, suspender, extender suscripción."
        actions={
          <Button
            className="rounded-pill"
            onClick={() => {
              setFormNonce((n) => n + 1)
              setFormOpen(true)
            }}
          >
            + Nueva empresa
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={companies}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="Aún no hay empresas"
        emptyDescription="Crea la primera para dar de alta un tenant nuevo."
        onRowClick={(row) => {
          setDetailCompany(row)
          setDetailNonce((n) => n + 1)
          setDetailOpen(true)
        }}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      <CompanyFormDialog key={`form-${formNonce}`} open={formOpen} onOpenChange={setFormOpen} />
      {detailCompany && (
        <CompanyDetailDialog key={`detail-${detailNonce}`} open={detailOpen} onOpenChange={setDetailOpen} company={detailCompany} />
      )}
    </div>
  )
}
