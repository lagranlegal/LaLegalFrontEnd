import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Button } from '@/components/ui/button'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useUpdateContract, type Contract } from '@/features/contracts/api'

const editSchema = z.object({
  appraisal_value: z.string().optional(),
  notes: z.string().optional(),
})

type EditFormValues = z.infer<typeof editSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * Solo `appraisal_value`/`notes` — `ContractUpdateIn` no acepta más (ni
 * `signed_photo_url`, que espera a `PhotoUploader`, todavía sin construir).
 * El caller debe pasar una `key` que cambie en cada apertura, mismo patrón
 * que `CustomerFormDialog` (docs/IMPLEMENTATION.md Paso 4).
 */
export function ContractEditDialog({ open, onOpenChange, contract }: { open: boolean; onOpenChange: (open: boolean) => void; contract: Contract }) {
  const [formError, setFormError] = useState<string | null>(null)
  const updateContract = useUpdateContract()
  const {
    register,
    handleSubmit,
    control,
    setError,
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { appraisal_value: contract.appraisal_value ?? '', notes: contract.notes ?? '' },
  })

  async function onSubmit(values: EditFormValues) {
    setFormError(null)
    try {
      await updateContract.mutateAsync({
        contractId: contract.id,
        body: { appraisal_value: values.appraisal_value || null, notes: values.notes || null },
      })
      toast.success('Contrato actualizado')
      onOpenChange(false)
    } catch (error) {
      const banner = applyServerErrors(error, setError)
      if (banner) setFormError(banner)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editar contrato"
      footer={
        <Button form="contract-edit-form" type="submit" disabled={updateContract.isPending} className="w-full rounded-pill">
          {updateContract.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      }
    >
      <form id="contract-edit-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="appraisal_value" className="text-sm font-medium text-foreground">
            Avalúo total
          </label>
          <Controller
            control={control}
            name="appraisal_value"
            render={({ field }) => <MoneyInput id="appraisal_value" className="mt-1" value={field.value ?? ''} onChange={field.onChange} />}
          />
        </div>
        <div>
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas
          </label>
          <textarea id="notes" rows={3} className={inputClass} {...register('notes')} />
        </div>
        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
