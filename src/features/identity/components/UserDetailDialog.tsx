import { useState } from 'react'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserStatusBadge } from '@/features/identity/components/UserStatusBadge'
import { confirm } from '@/components/shared/confirmStore'
import { ApiError } from '@/lib/api/client'
import { formatDateTime } from '@/lib/dates'
import { useDeactivateUser, useReactivateUser, useRoles, useUpdateUserRole, type User } from '@/features/identity/api'

/**
 * Modal explicativo de `LAST_ADMIN_SAFEGUARD` (CLAUDE.md regla 9): a
 * diferencia de `confirm()`, acá no hay nada que confirmar — solo mostrar
 * por qué la acción no se pudo completar y NO reintentar.
 */
function LastAdminSafeguardDialog({ open, onOpenChange, message }: { open: boolean; onOpenChange: (open: boolean) => void; message: string }) {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="No se puede completar esta acción"
      description={message}
      size="sm"
      footer={
        <Button className="w-full rounded-pill" onClick={() => onOpenChange(false)}>
          Entendido
        </Button>
      }
    />
  )
}

/** El caller monta este diálogo con una `key` que cambie en cada apertura (mismo patrón que `SupplierFormDialog`). */
export function UserDetailDialog({ open, onOpenChange, user, isSelf }: { open: boolean; onOpenChange: (open: boolean) => void; user: User; isSelf: boolean }) {
  const { data: roles } = useRoles()
  const updateUserRole = useUpdateUserRole()
  const deactivateUser = useDeactivateUser()
  const reactivateUser = useReactivateUser()
  const [roleId, setRoleId] = useState(user.role_id)
  const [error, setError] = useState<string | null>(null)
  const [safeguardMessage, setSafeguardMessage] = useState<string | null>(null)

  const roleChanged = roleId !== user.role_id
  const isPending = updateUserRole.isPending || deactivateUser.isPending || reactivateUser.isPending

  async function handleSaveRole() {
    setError(null)
    try {
      await updateUserRole.mutateAsync({ userId: user.id, body: { role_id: roleId } })
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'LAST_ADMIN_SAFEGUARD') {
        setSafeguardMessage(err.message)
        return
      }
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.')
    }
  }

  async function handleToggleStatus() {
    setError(null)
    const isActive = user.status !== 'inactive'
    const { confirmed } = await confirm({
      title: isActive ? 'Desactivar usuario' : 'Reactivar usuario',
      description: isActive
        ? `${user.full_name} no podrá iniciar sesión hasta que se reactive.`
        : `${user.full_name} podrá volver a iniciar sesión.`,
      tone: isActive ? 'danger' : 'default',
      confirmLabel: isActive ? 'Desactivar' : 'Reactivar',
    })
    if (!confirmed) return
    try {
      if (isActive) {
        await deactivateUser.mutateAsync(user.id)
      } else {
        await reactivateUser.mutateAsync(user.id)
      }
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'LAST_ADMIN_SAFEGUARD') {
        setSafeguardMessage(err.message)
        return
      }
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.')
    }
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title={user.full_name}
        description={user.email}
        footer={
          <div className="flex w-full flex-col gap-2">
            {roleChanged && (
              <Button disabled={isPending} onClick={handleSaveRole} className="w-full rounded-pill">
                {updateUserRole.isPending ? 'Guardando…' : 'Guardar rol'}
              </Button>
            )}
            {/* NADIE SE DESACTIVA A SÍ MISMO.
                Reportado probando: el único usuario de una empresa recién
                creada —su administrador— veía el botón para desactivarse.
                El backend lo rechaza (`LAST_ADMIN_SAFEGUARD`, así que no hay
                riesgo de dejar la empresa sin acceso), pero ofrecer una
                acción que siempre falla es peor que no ofrecerla: invita a
                intentarla y enseña que los errores son normales.

                Se oculta para uno mismo y no solo para "el último admin"
                porque el front no sabe quién es admin —eso depende de qué
                permisos tenga cada rol— pero sí sabe quién es uno. Y la
                regla es más simple de entender: si alguien se va, lo
                desactiva otro. */}
            {isSelf ? (
              <p className="w-full rounded-input bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
                No puedes desactivar tu propia cuenta. Si te vas de la empresa, pídele a otro administrador que lo haga.
              </p>
            ) : (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={handleToggleStatus}
                className={
                  user.status !== 'inactive' ? 'w-full rounded-pill border-danger text-danger hover:bg-danger-soft' : 'w-full rounded-pill'
                }
              >
                {isPending
                  ? 'Procesando…'
                  : user.status !== 'inactive'
                    ? 'Desactivar usuario'
                    : 'Reactivar usuario'}
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estado</span>
            <div className="flex items-center gap-2">
              <UserStatusBadge status={user.status} />
              {isSelf && <span className="text-xs text-muted-foreground">(Tú)</span>}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Invitado el</span>
            <span className="text-foreground">{formatDateTime(user.created_at)}</span>
          </div>

          <div>
            <label htmlFor="user-role" className="text-sm font-medium text-foreground">
              Rol
            </label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="user-role" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(roles ?? []).map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
      </AppDialog>

      <LastAdminSafeguardDialog open={!!safeguardMessage} onOpenChange={(next) => !next && setSafeguardMessage(null)} message={safeguardMessage ?? ''} />
    </>
  )
}
