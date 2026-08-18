import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { Button } from '@/components/ui/button'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useUpdateContract, type Contract } from '@/features/contracts/api'

const editSchema = z.object({
  appraisal_value: z.string().optional(),
  notes: z.string().optional(),
  signed_photo: z.array(z.string()),
})

type EditFormValues = z.infer<typeof editSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * `appraisal_value`/`notes`/`signed_photo_url` — todo lo que `ContractUpdateIn`
 * acepta (nunca `status`/`capital_balance`, los calcula el backend). La foto
 * del contrato firmado va como arreglo de 1 elemento en el form (mismo
 * componente `PhotoUploader` que el resto, `maxPhotos={1}`) y se aplana a
 * `signed_photo_url: string | null` al enviar. El caller debe pasar una
 * `key` que cambie en cada apertura, mismo patrón que `CustomerFormDialog`
 * (docs/IMPLEMENTATION.md Paso 4).
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
    defaultValues: {
      appraisal_value: contract.appraisal_value ?? '',
      notes: contract.notes ?? '',
      signed_photo: contract.signed_photo_url ? [contract.signed_photo_url] : [],
    },
  })

  async function onSubmit(values: EditFormValues) {
    setFormError(null)
    try {
      await updateContract.mutateAsync({
        contractId: contract.id,
        body: {
          appraisal_value: values.appraisal_value || null,
          notes: values.notes || null,
          signed_photo_url: values.signed_photo[0] ?? null,
        },
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
        <div>
          <p className="text-sm font-medium text-foreground">Foto del contrato firmado</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Imprime el contrato, que el cliente lo firme, y sube una foto del documento firmado.</p>
          <Controller
            control={control}
            name="signed_photo"
            render={({ field }) => (
              <div className="mt-1">
                <PhotoUploader value={field.value} onChange={field.onChange} folder={`contracts/${contract.id}`} maxPhotos={1} />
              </div>
            )}
          />
        </div>
        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
