import { useState } from 'react'
import { Copy, Check, Link2, Mail } from 'lucide-react'
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
  /** El enlace generado, cuando se invitó sin correo. Cambia el diálogo a modo "copia esto". */
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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

  /**
   * `sendEmail` decide cómo se entrega la invitación, no si el usuario se
   * crea: en los dos casos queda dado de alta igual. Por eso es un parámetro
   * del mismo submit y no otro formulario.
   */
  async function submitInvite(values: InviteFormValues, sendEmail: boolean) {
    setFormError(null)
    try {
      const created = await inviteUser.mutateAsync({ ...values, send_email: sendEmail })
      if (sendEmail) {
        onOpenChange(false)
        return
      }
      // Sin correo el diálogo NO se cierra: el enlace solo existe acá. Si se
      // cerrara, el admin se quedaría con un usuario creado y sin forma de
      // que entre — el enlace no se puede volver a pedir.
      setInviteLink(created.invite_link ?? null)
    } catch (error) {
      const banner = applyServerErrors(error, setError, { conflictMessage: 'Ya existe un usuario invitado con ese correo.' })
      if (banner) setFormError(banner)
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={inviteLink ? 'Invitación lista' : 'Invitar usuario'}
      description={
        inviteLink
          ? 'Pásale este enlace a la persona. No se envió ningún correo.'
          : 'El alta es solo por invitación: por correo, o con un enlace que tú entregas.'
      }
      footer={
        inviteLink ? (
          <Button onClick={() => onOpenChange(false)} className="w-full rounded-pill">
            Listo
          </Button>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <Button
              type="button"
              disabled={inviteUser.isPending}
              onClick={handleSubmit((values) => submitInvite(values, true))}
              className="w-full rounded-pill"
            >
              <Mail className="size-4" />
              {inviteUser.isPending ? 'Enviando…' : 'Enviar por correo'}
            </Button>
            {/* Segunda opción, no escondida: cuando el correo no llega o la
                persona está al lado, este es el camino corto. */}
            <Button
              type="button"
              variant="outline"
              disabled={inviteUser.isPending}
              onClick={handleSubmit((values) => submitInvite(values, false))}
              className="w-full rounded-pill"
            >
              <Link2 className="size-4" />
              Generar enlace
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)} disabled={inviteUser.isPending}>
              Cancelar
            </Button>
          </div>
        )
      }
    >
      {inviteLink ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-input border border-border bg-muted px-3 py-2 font-mono text-xs break-all text-foreground">
            {inviteLink}
          </p>
          <Button type="button" variant="outline" onClick={copyLink} className="w-full rounded-pill">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copiado' : 'Copiar enlace'}
          </Button>
          {/* Advertencia y no letra chica: el enlace ES la credencial, y
              además no se puede volver a generar desde acá. */}
          <p className="text-xs text-muted-foreground">
            Sirve una sola vez y caduca. Quien lo tenga puede entrar como esta persona, así que envíalo por un
            medio privado — y guárdalo antes de cerrar: no se puede volver a mostrar.
          </p>
        </div>
      ) : (
      <form id="invite-user-form" onSubmit={handleSubmit((values) => submitInvite(values, true))} className="flex flex-col gap-4" noValidate>
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
      )}
    </AppDialog>
  )
}
