import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useInviteUser, useRoles } from '@/features/identity/api'

const inviteSchema = z.object({
  full_name: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().min(1, 'El correo es obligatorio').email('Correo inválido'),
  role_id: z.string().min(1, 'Elige un rol'),
})

type InviteFormValues = z.infer<typeof inviteSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/** El caller monta este diálogo con una `key` que cambie en cada apertura (mismo patrón que `SupplierFormDialog`). */
export function InviteUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const { data: roles } = useRoles()
  const inviteUser = useInviteUser()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { full_name: '', email: '', role_id: '' },
  })

  async function onSubmit(values: InviteFormValues) {
    setFormError(null)
    try {
      await inviteUser.mutateAsync(values)
      onOpenChange(false)
    } catch (error) {
      const banner = applyServerErrors(error, setError, { conflictMessage: 'Ya existe un usuario invitado con ese correo.' })
      if (banner) setFormError(banner)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invitar usuario"
      description="Le llegará un correo para crear su contraseña — el alta es solo por invitación."
      footer={
        <Button form="invite-user-form" type="submit" disabled={inviteUser.isPending} className="w-full rounded-pill">
          {inviteUser.isPending ? 'Enviando…' : 'Enviar invitación'}
        </Button>
      }
    >
      <form id="invite-user-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="invite-name" className="text-sm font-medium text-foreground">
            Nombre completo
          </label>
          <input id="invite-name" className={inputClass} {...register('full_name')} />
          {errors.full_name && <p className="mt-1 text-sm text-danger">{errors.full_name.message}</p>}
        </div>

        <div>
          <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
            Correo
          </label>
          <input id="invite-email" type="email" className={inputClass} {...register('email')} />
          {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="invite-role" className="text-sm font-medium text-foreground">
            Rol
          </label>
          <Controller
            control={control}
            name="role_id"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="invite-role" className="mt-1 w-full">
                  <SelectValue placeholder="Elige un rol" />
                </SelectTrigger>
                <SelectContent>
                  {(roles ?? []).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.role_id && <p className="mt-1 text-sm text-danger">{errors.role_id.message}</p>}
        </div>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
