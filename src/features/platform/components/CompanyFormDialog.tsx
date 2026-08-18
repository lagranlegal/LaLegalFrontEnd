import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/shared/DatePicker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { todayBogota } from '@/lib/dates'
import { useCreateCompany, usePlans } from '@/features/platform/api'

const companySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  plan_code: z.string().min(1, 'Elige un plan'),
  subscription_expires_at: z.string().min(1, 'Elige una fecha'),
  first_admin_email: z.string().min(1, 'El correo es obligatorio').email('Correo inválido'),
  first_admin_full_name: z.string().min(1, 'El nombre es obligatorio'),
})

type CompanyFormValues = z.infer<typeof companySchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/** El caller monta este diálogo con una `key` que cambie en cada apertura (mismo patrón que `SupplierFormDialog`). */
export function CompanyFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const { data: plans } = usePlans()
  const createCompany = useCreateCompany()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name: '', plan_code: '', subscription_expires_at: '', first_admin_email: '', first_admin_full_name: '' },
  })

  async function onSubmit(values: CompanyFormValues) {
    setFormError(null)
    try {
      await createCompany.mutateAsync(values)
      onOpenChange(false)
    } catch (error) {
      const banner = applyServerErrors(error, setError, { conflictMessage: 'Ya existe una empresa con ese nombre.' })
      if (banner) setFormError(banner)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nueva empresa"
      description="Crea el tenant y su primer usuario Admin — le llega una invitación por correo."
      footer={
        <Button form="company-form" type="submit" disabled={createCompany.isPending} className="w-full rounded-pill">
          {createCompany.isPending ? 'Creando…' : 'Crear empresa'}
        </Button>
      }
    >
      <form id="company-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="company-name" className="text-sm font-medium text-foreground">
            Nombre de la empresa
          </label>
          <input id="company-name" className={inputClass} {...register('name')} />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="company-plan" className="text-sm font-medium text-foreground">
              Plan
            </label>
            <Controller
              control={control}
              name="plan_code"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="company-plan" className="mt-1 w-full">
                    <SelectValue placeholder="Elige un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {(plans ?? []).map((plan) => (
                      <SelectItem key={plan.id} value={plan.code}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.plan_code && <p className="mt-1 text-sm text-danger">{errors.plan_code.message}</p>}
          </div>
          <div>
            <label htmlFor="company-expires" className="text-sm font-medium text-foreground">
              Suscripción vence
            </label>
            <Controller
              control={control}
              name="subscription_expires_at"
              render={({ field }) => <DatePicker id="company-expires" value={field.value} onChange={field.onChange} minDate={todayBogota()} />}
            />
            {errors.subscription_expires_at && <p className="mt-1 text-sm text-danger">{errors.subscription_expires_at.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="company-admin-name" className="text-sm font-medium text-foreground">
            Nombre del primer Admin
          </label>
          <input id="company-admin-name" className={inputClass} {...register('first_admin_full_name')} />
          {errors.first_admin_full_name && <p className="mt-1 text-sm text-danger">{errors.first_admin_full_name.message}</p>}
        </div>

        <div>
          <label htmlFor="company-admin-email" className="text-sm font-medium text-foreground">
            Correo del primer Admin
          </label>
          <input id="company-admin-email" type="email" className={inputClass} {...register('first_admin_email')} />
          {errors.first_admin_email && <p className="mt-1 text-sm text-danger">{errors.first_admin_email.message}</p>}
        </div>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
