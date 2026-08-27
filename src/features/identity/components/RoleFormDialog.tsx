import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useCreateRole, useRenameRole, useRoles, type Role } from '@/features/identity/api'

const NONE = '__none__'

const roleSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  clone_from_role_id: z.string(),
})

type RoleFormValues = z.infer<typeof roleSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/** El caller monta este diálogo con una `key` que cambie en cada apertura (mismo patrón que `SupplierFormDialog`). */
export function RoleFormDialog({ open, onOpenChange, role }: { open: boolean; onOpenChange: (open: boolean) => void; role?: Role }) {
  const mode = role ? 'edit' : 'create'
  const [formError, setFormError] = useState<string | null>(null)
  const { data: roles } = useRoles()
  const createRole = useCreateRole()
  const renameRole = useRenameRole()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: role?.name ?? '', description: role?.description ?? '', clone_from_role_id: NONE },
  })

  async function onSubmit(values: RoleFormValues) {
    setFormError(null)
    try {
      if (mode === 'create') {
        await createRole.mutateAsync({
          name: values.name,
          description: values.description || null,
          clone_from_role_id: values.clone_from_role_id === NONE ? null : values.clone_from_role_id,
        })
      } else if (role) {
        await renameRole.mutateAsync({ roleId: role.id, body: { name: values.name, description: values.description || null } })
      }
      onOpenChange(false)
    } catch (error) {
      const banner = applyServerErrors(error, setError, { conflictField: 'name', conflictMessage: 'Ya existe un rol con ese nombre.' })
      if (banner) setFormError(banner)
    }
  }

  const isPending = createRole.isPending || renameRole.isPending

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nuevo rol' : 'Editar rol'}
      description={mode === 'create' ? 'Los permisos se ajustan después, desde "Ver permisos".' : undefined}
      footer={
        <div className="flex w-full gap-2">
          <Button type="button" variant="outline" className="flex-1 rounded-pill" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button form="role-form" type="submit" disabled={isPending} className="flex-1 rounded-pill">
            {isPending ? 'Guardando…' : mode === 'create' ? 'Crear rol' : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      <form id="role-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="role-name" className="text-sm font-medium text-foreground">
            Nombre
          </label>
          <input id="role-name" className={inputClass} {...register('name')} />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="role-description" className="text-sm font-medium text-foreground">
            Descripción
          </label>
          <input id="role-description" className={inputClass} {...register('description')} />
        </div>

        {mode === 'create' && (
          <div>
            <label htmlFor="role-clone" className="text-sm font-medium text-foreground">
              Clonar permisos desde
            </label>
            <Controller
              control={control}
              name="clone_from_role_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="role-clone" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Ninguno (sin permisos)</SelectItem>
                    {(roles ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
