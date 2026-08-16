import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useCreateSupplier, useUpdateSupplier, type Supplier } from '@/features/catalogs/api'

const DOC_TYPE_LABELS: Record<string, string> = { cc: 'Cédula de ciudadanía', ce: 'Cédula de extranjería', passport: 'Pasaporte', nit: 'NIT' }
const NONE = '__none__'

const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  code_letter: z
    .string()
    .min(1, 'La letra es obligatoria')
    .max(1, 'Una sola letra')
    .transform((v) => v.toUpperCase()),
  doc_type: z.string(),
  doc_number: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email('Correo inválido'), z.literal('')]).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type SupplierFormValues = z.infer<typeof supplierSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

function emptyValues(): SupplierFormValues {
  return { name: '', code_letter: '', doc_type: NONE, doc_number: '', phone: '', email: '', address: '', notes: '' }
}

function valuesFromSupplier(supplier: Supplier): SupplierFormValues {
  return {
    name: supplier.name,
    code_letter: supplier.code_letter,
    doc_type: supplier.doc_type ?? NONE,
    doc_number: supplier.doc_number ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    notes: supplier.notes ?? '',
  }
}

/**
 * El caller debe montar este componente con una `key` que cambie en CADA
 * apertura (un nonce que se incrementa al abrir, no solo `supplier?.id` —
 * dos "crear" seguidos también deben limpiar el draft) — así el form
 * arranca limpio siempre, sin un `useEffect` sincronizando `reset()`.
 */
export function SupplierFormDialog({ open, onOpenChange, supplier }: { open: boolean; onOpenChange: (open: boolean) => void; supplier?: Supplier }) {
  const mode = supplier ? 'edit' : 'create'
  const [formError, setFormError] = useState<string | null>(null)
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier ? valuesFromSupplier(supplier) : emptyValues(),
  })

  async function onSubmit(values: SupplierFormValues) {
    setFormError(null)
    const body = {
      ...values,
      doc_type: values.doc_type === NONE ? null : (values.doc_type as 'cc' | 'ce' | 'passport' | 'nit'),
      email: values.email || null,
    }
    try {
      if (mode === 'create') {
        await createSupplier.mutateAsync(body)
      } else if (supplier) {
        await updateSupplier.mutateAsync({ supplierId: supplier.id, body })
      }
      onOpenChange(false)
    } catch (error) {
      const banner = applyServerErrors(error, setError, {
        conflictField: 'code_letter',
        conflictMessage: 'Ya existe un proveedor con esa letra de código.',
      })
      if (banner) setFormError(banner)
    }
  }

  const isPending = createSupplier.isPending || updateSupplier.isPending

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nuevo proveedor' : 'Editar proveedor'}
      size="lg"
      footer={
        <Button form="supplier-form" type="submit" disabled={isPending} className="w-full rounded-pill">
          {isPending ? 'Guardando…' : mode === 'create' ? 'Crear proveedor' : 'Guardar cambios'}
        </Button>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sup-name" className="text-sm font-medium text-foreground">
              Nombre
            </label>
            <input id="sup-name" className={inputClass} {...register('name')} />
            {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="sup-code" className="text-sm font-medium text-foreground">
              Letra de código
            </label>
            <input id="sup-code" maxLength={1} className={`${inputClass} uppercase`} {...register('code_letter')} />
            {errors.code_letter && <p className="mt-1 text-sm text-danger">{errors.code_letter.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sup-doc-type" className="text-sm font-medium text-foreground">
              Tipo de documento
            </label>
            <Controller
              control={control}
              name="doc_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="sup-doc-type" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Sin especificar</SelectItem>
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
            <label htmlFor="sup-doc-number" className="text-sm font-medium text-foreground">
              Número de documento
            </label>
            <input id="sup-doc-number" className={inputClass} {...register('doc_number')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sup-phone" className="text-sm font-medium text-foreground">
              Teléfono
            </label>
            <input id="sup-phone" className={inputClass} {...register('phone')} />
          </div>
          <div>
            <label htmlFor="sup-email" className="text-sm font-medium text-foreground">
              Correo
            </label>
            <input id="sup-email" type="email" className={inputClass} {...register('email')} />
            {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="sup-address" className="text-sm font-medium text-foreground">
            Dirección
          </label>
          <input id="sup-address" className={inputClass} {...register('address')} />
        </div>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
