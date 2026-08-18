import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/dates'
import { businessModuleLabel, BUSINESS_MODULE_LABELS } from '@/lib/businessModules'
import { useUsersFlat } from '@/lib/identity/users'
import { useAuditLog, type AuditLogEntry, type AuditLogFilters } from '@/features/audit/api'
import { AUDIT_ENTITY_TYPE_LABELS, auditActionLabel, auditEntityTypeLabel } from '@/features/audit/labels'
import { AuditDetailDialog } from '@/features/audit/components/AuditDetailDialog'

const ALL = '__all__'

export function AuditPage() {
  const [moduleFilter, setModuleFilter] = useState(ALL)
  const [entityTypeFilter, setEntityTypeFilter] = useState(ALL)
  const [userFilter, setUserFilter] = useState(ALL)
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)

  const { data: users } = useUsersFlat()

  const filters: AuditLogFilters = {
    module: moduleFilter === ALL ? undefined : moduleFilter,
    entity_type: entityTypeFilter === ALL ? undefined : entityTypeFilter,
    user_id: userFilter === ALL ? undefined : userFilter,
  }

  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useAuditLog(filters)
  const entries = data?.pages.flatMap((page) => page.items) ?? []

  function userName(userId: string | null): string {
    if (!userId) return 'Sistema'
    return users?.find((u) => u.id === userId)?.full_name ?? '—'
  }

  const columns: ColumnDef<AuditLogEntry>[] = [
    { accessorKey: 'created_at', header: 'Fecha', cell: (info) => formatDateTime(info.getValue<string>()) },
    { id: 'user', header: 'Usuario', cell: ({ row }) => userName(row.original.user_id) },
    { accessorKey: 'module', header: 'Módulo', cell: (info) => businessModuleLabel(info.getValue<string>()) },
    { accessorKey: 'action', header: 'Acción', cell: (info) => auditActionLabel(info.getValue<string>()) },
    { accessorKey: 'entity_type', header: 'Entidad', cell: (info) => auditEntityTypeLabel(info.getValue<string>()) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Auditoría" description="Registro de acciones sensibles — quién hizo qué y cuándo." />

      <div className="flex flex-wrap gap-3">
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los módulos</SelectItem>
            {Object.entries(BUSINESS_MODULE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo de entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las entidades</SelectItem>
            {Object.entries(AUDIT_ENTITY_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los usuarios</SelectItem>
            {(users ?? []).map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={entries}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="Sin registros de auditoría"
        emptyDescription="No hay acciones que coincidan con estos filtros."
        onRowClick={(row) => setSelectedEntry(row)}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      {selectedEntry && (
        <AuditDetailDialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)} entry={selectedEntry} users={users} />
      )}
    </div>
  )
}
