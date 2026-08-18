import { useState } from 'react'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ApiError } from '@/lib/api/client'
import { useRolePermissions, useUpdateRolePermissions, usePermissionsCatalog, type Permission, type Role } from '@/features/identity/api'

/**
 * Módulo de `PermissionOut.module` (ej. `contracts`, `cashbox`) — dominio
 * DISTINTO de `lib/modules.ts` (`pawn|store|general`, módulo de negocio de
 * caja/gastos). Mismo criterio de mapa-parcial-con-fallback: un módulo no
 * mapeado se muestra tal cual.
 */
const PERMISSION_MODULE_LABELS: Record<string, string> = {
  audit: 'Auditoría',
  cashbox: 'Caja',
  catalogs: 'Catálogos',
  company: 'Empresa',
  contracts: 'Contratos',
  customers: 'Clientes',
  identity: 'Identidad',
  inventory: 'Inventario',
  payments: 'Pagos',
  reports: 'Reportes',
  sales: 'Ventas',
}

function moduleLabel(module: string): string {
  return PERMISSION_MODULE_LABELS[module] ?? module
}

function groupByModule(catalog: Permission[]): [string, Permission[]][] {
  const map = new Map<string, Permission[]>()
  for (const permission of catalog) {
    const list = map.get(permission.module) ?? []
    list.push(permission)
    map.set(permission.module, list)
  }
  return Array.from(map.entries())
}

/**
 * Se monta SOLO cuando ya llegaron catálogo + permisos actuales del rol
 * (`PermissionsMatrixDialog` de abajo lo gatea) — así `checked` se siembra
 * una única vez con `useState(() => ...)`, sin `useEffect` sincronizando.
 */
function PermissionsChecklist({ role, catalog, initialCodes, onSaved }: { role: Role; catalog: Permission[]; initialCodes: string[]; onSaved: () => void }) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(initialCodes))
  const [error, setError] = useState<string | null>(null)
  const updatePermissions = useUpdateRolePermissions()
  const grouped = groupByModule(catalog)

  function toggle(code: string, next: boolean) {
    setChecked((prev) => {
      const copy = new Set(prev)
      if (next) copy.add(code)
      else copy.delete(code)
      return copy
    })
  }

  async function handleSave() {
    setError(null)
    try {
      await updatePermissions.mutateAsync({ roleId: role.id, permissionCodes: Array.from(checked) })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
        {grouped.map(([module, permissions]) => (
          <div key={module}>
            <h3 className="mb-2 text-sm font-semibold text-foreground">{moduleLabel(module)}</h3>
            <div className="flex flex-col gap-2">
              {permissions.map((permission) => (
                <label key={permission.code} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={checked.has(permission.code)}
                    onCheckedChange={(next) => toggle(permission.code, next === true)}
                  />
                  <span className="flex flex-col">
                    <span className="text-foreground">{permission.description ?? permission.code}</span>
                    {permission.is_special && <span className="text-xs text-muted-foreground">Permiso especial</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <Button disabled={updatePermissions.isPending} onClick={handleSave} className="w-full rounded-pill">
        {updatePermissions.isPending ? 'Guardando…' : 'Guardar permisos'}
      </Button>
    </div>
  )
}

/** El caller monta este diálogo con una `key` que cambie en cada apertura (mismo patrón que `SupplierFormDialog`). */
export function PermissionsMatrixDialog({ open, onOpenChange, role }: { open: boolean; onOpenChange: (open: boolean) => void; role: Role }) {
  const { data: catalog, isPending: catalogPending, isError: catalogError, refetch: refetchCatalog } = usePermissionsCatalog()
  const { data: currentCodes, isPending: currentPending, isError: currentError, refetch: refetchCurrent } = useRolePermissions(role.id)

  const isPending = catalogPending || currentPending
  const isError = catalogError || currentError

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={role.name} description={role.description ?? undefined} size="lg">
      {isPending && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-border" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">No se pudieron cargar los permisos.</p>
          <Button
            variant="outline"
            onClick={() => {
              refetchCatalog()
              refetchCurrent()
            }}
          >
            Reintentar
          </Button>
        </div>
      )}

      {!isPending && !isError && catalog && currentCodes && (
        <PermissionsChecklist role={role} catalog={catalog} initialCodes={currentCodes} onSaved={() => onOpenChange(false)} />
      )}
    </AppDialog>
  )
}
