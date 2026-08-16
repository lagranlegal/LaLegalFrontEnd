import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useCreateCustomer, useUpdateCustomer, type Customer } from '@/features/customers/api'

const DOC_TYPE_LABELS: Record<string, string> = {
  cc: 'Cédula de ciudadanía',
  ce: 'Cédula de extranjería',
  passport: 'Pasaporte',
  nit: 'NIT',
}

const customerSchema = z.object({
  full_name: z.string().min(1, 'El nombre es obligatorio'),
  doc_type: z.enum(['cc', 'ce', 'passport', 'nit']),
  doc_number: z.string().min(1, 'El documento es obligatorio'),
  doc_issue_place: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().min(1, 'El teléfono es obligatorio'),
  email: z.union([z.string().email('Correo inválido'), z.literal('')]).optional(),
  notes: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground'

function emptyValues(): CustomerFormValues {
  return { full_name: '', doc_type: 'cc', doc_number: '', doc_issue_place: '', address: '', phone: '', email: '', notes: '' }
}

function valuesFromCustomer(customer: Customer): CustomerFormValues {
  return {
    full_name: customer.full_name,
    doc_type: customer.doc_type as CustomerFormValues['doc_type'],
    doc_number: customer.doc_number,
    doc_issue_place: customer.doc_issue_place ?? '',
    address: customer.address ?? '',
    phone: customer.phone,
    email: customer.email ?? '',
    notes: customer.notes ?? '',
  }
}

/**
 * Crear/editar cliente. `doc_type`/`doc_number` son inmutables tras la
 * creación (la API no los acepta en el update).
 *
 * El caller debe montar este componente con una `key` que cambie en CADA
 * apertura (un nonce que se incrementa al abrir, no solo `customer?.id` —
 * dos "crear" seguidos también deben limpiar el draft) — así el form
 * arranca limpio siempre, sin un `useEffect` sincronizando `reset()`.
 */
export function CustomerFormDialog({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (open: boolean) => void; customer?: Customer }) {
  const mode = customer ? 'edit' : 'create'
  const [formError, setFormError] = useState<string | null>(null)
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? valuesFromCustomer(customer) : emptyValues(),
  })

  async function onSubmit(values: CustomerFormValues) {
    setFormError(null)
    const email = values.email || null
    try {
      if (mode === 'create') {
        await createCustomer.mutateAsync({ ...values, email })
      } else if (customer) {
        const { doc_type: _docType, doc_number: _docNumber, ...editable } = values
        await updateCustomer.mutateAsync({ customerId: customer.id, body: { ...editable, email } })
      }
      onOpenChange(false)
    } catch (error) {
      const banner = applyServerErrors(error, setError, {
        conflictField: 'doc_number',
        conflictMessage: 'Ya existe un cliente con ese documento.',
      })
      if (banner) setFormError(banner)
    }
  }

  const isPending = createCustomer.isPending || updateCustomer.isPending

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nuevo cliente' : 'Editar cliente'}
      size="lg"
      footer={
        <Button form="customer-form" type="submit" disabled={isPending} className="w-full rounded-pill">
          {isPending ? 'Guardando…' : mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}
        </Button>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="full_name" className="text-sm font-medium text-foreground">
            Nombre completo
          </label>
          <input id="full_name" className={inputClass} {...register('full_name')} />
          {errors.full_name && <p className="mt-1 text-sm text-danger">{errors.full_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="doc_type" className="text-sm font-medium text-foreground">
              Tipo de documento
            </label>
            <Controller
              control={control}
              name="doc_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={mode === 'edit'}>
                  <SelectTrigger id="doc_type" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <label htmlFor="doc_number" className="text-sm font-medium text-foreground">
              Número de documento
            </label>
            <input id="doc_number" className={inputClass} disabled={mode === 'edit'} {...register('doc_number')} />
            {errors.doc_number && <p className="mt-1 text-sm text-danger">{errors.doc_number.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="doc_issue_place" className="text-sm font-medium text-foreground">
            Lugar de expedición
          </label>
          <input id="doc_issue_place" className={inputClass} {...register('doc_issue_place')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="phone" className="text-sm font-medium text-foreground">
              Teléfono
            </label>
            <input id="phone" className={inputClass} {...register('phone')} />
            {errors.phone && <p className="mt-1 text-sm text-danger">{errors.phone.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Correo
            </label>
            <input id="email" type="email" className={inputClass} {...register('email')} />
            {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="address" className="text-sm font-medium text-foreground">
            Dirección
          </label>
          <input id="address" className={inputClass} {...register('address')} />
        </div>

        <div>
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas
          </label>
          <textarea id="notes" rows={2} className={inputClass} {...register('notes')} />
        </div>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
