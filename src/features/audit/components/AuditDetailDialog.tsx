import { AppDialog } from '@/components/shared/AppDialog'
import { formatDateTime } from '@/lib/dates'
import { businessModuleLabel } from '@/lib/businessModules'
import { auditActionLabel, auditEntityTypeLabel } from '@/features/audit/labels'
import type { AuditLogEntry } from '@/features/audit/api'
import type { User } from '@/lib/identity/users'

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {value ? (
        <pre className="mt-1 overflow-x-auto rounded-input bg-muted px-3 py-2 text-xs text-foreground">{JSON.stringify(value, null, 2)}</pre>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">—</p>
      )}
    </div>
  )
}

export function AuditDetailDialog({
  open,
  onOpenChange,
  entry,
  users,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: AuditLogEntry
  users: User[] | undefined
}) {
  const user = users?.find((u) => u.id === entry.user_id)

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={auditActionLabel(entry.action)} description={formatDateTime(entry.created_at)} size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Usuario</p>
            <p className="text-foreground">{user?.full_name ?? (entry.user_id ? '—' : 'Sistema')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Módulo</p>
            <p className="text-foreground">{businessModuleLabel(entry.module)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entidad</p>
            <p className="text-foreground">{auditEntityTypeLabel(entry.entity_type)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Id de la entidad</p>
            <p className="break-all font-mono text-xs text-foreground">{entry.entity_id ?? '—'}</p>
          </div>
        </div>

        <JsonBlock label="Antes" value={entry.before} />
        <JsonBlock label="Después" value={entry.after} />
      </div>
    </AppDialog>
  )
}
