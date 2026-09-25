import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useCreateCustomer, useUpdateCustomer, type Customer } from '@/features/customers/api'
import { isValidEmailShape } from '@/features/customers/emailBasis'
import { formatDateTime } from '@/lib/dates'

const DOC_TYPE_LABELS: Record<string, string> = {
  cc: 'Cédula de ciudadanía',
  ce: 'Cédula de extranjería',
  passport: 'Pasaporte',
  nit: 'NIT',
}

/**
 * El esquema depende del correo YA GUARDADO: ese valor se acepta aunque no
 * tenga forma de correo (lo guardó alguien antes de que el backend validara,
 * F21-19). Si no, la ficha quedaría congelada: no se podría corregir ni el
 * teléfono sin tocar un campo que la persona quizá no sabe arreglar. El
 * backend hace exactamente lo mismo (`CustomerUpdateIn.email`); cualquier
 * OTRO valor se valida igual que siempre.
 */
function customerSchema(savedEmail: string) {
  return z.object({
    full_name: z.string().min(1, 'El nombre es obligatorio'),
    doc_type: z.enum(['cc', 'ce', 'passport', 'nit']),
    doc_number: z.string().min(1, 'El documento es obligatorio'),
    doc_issue_place: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().min(1, 'El teléfono es obligatorio'),
    email: z
      .string()
      .optional()
      .refine((v) => !v || (savedEmail !== '' && v === savedEmail) || isValidEmailShape(v), 'Correo inválido'),
    notes: z.string().optional(),
    doc_photos: z.array(z.string()),
    email_consent: z.boolean(),
    email_opt_out: z.boolean(),
  })
}

type CustomerFormValues = z.infer<ReturnType<typeof customerSchema>>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground'

function emptyValues(): CustomerFormValues {
  return {
    full_name: '',
    doc_type: 'cc',
    doc_number: '',
    doc_issue_place: '',
    address: '',
    phone: '',
    email: '',
    notes: '',
    doc_photos: [],
    email_consent: false,
    email_opt_out: false,
  }
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
    doc_photos: customer.doc_photos ?? [],
    email_consent: customer.email_basis === 'consent',
    email_opt_out: Boolean(customer.email_opt_out_at),
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
  // Al crear todavía no hay `customer.id` para la carpeta de Storage — un id
  // temporal estable por apertura del diálogo alcanza (mismo trade-off de
  // huérfanos aceptado en `PhotoUploader` si se cierra sin guardar).
  const [draftId] = useState(() => crypto.randomUUID())
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()
  const savedEmail = customer?.email ?? ''
  const savedEmailIsInvalid = savedEmail !== '' && !isValidEmailShape(savedEmail)
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema(savedEmail)),
    defaultValues: customer ? valuesFromCustomer(customer) : emptyValues(),
  })
  const hasEmail = Boolean(useWatch({ control, name: 'email' })?.trim())

  async function onSubmit(values: CustomerFormValues) {
    setFormError(null)
    const { email_consent: consent, email_opt_out: optOut, ...fields } = values
    const email = fields.email || null
    try {
      if (mode === 'create') {
        // `doc_photos` viaja tal cual: es el campo de la API. Antes había que
        // sacarlo del payload porque el formulario guardaba un arreglo y la
        // API pedía un solo `doc_photo_url` — esa traducción ya no existe.
        // La casilla solo viaja marcada y con correo: autorizar a escribirle a
        // una dirección que no existe no es una autorización de nada.
        await createCustomer.mutateAsync({ ...fields, email, ...(consent && email ? { email_consent: true } : {}) })
      } else if (customer) {
        const { doc_type: _docType, doc_number: _docNumber, ...editable } = fields
        // Las dos casillas viajan SOLO si cambiaron: reenviar «sí autoriza»
        // en cada edición no reescribe la fecha (el backend la conserva),
        // pero una casilla que nadie tocó no es una decisión de nadie.
        const initialConsent = customer.email_basis === 'consent'
        const initialOptOut = Boolean(customer.email_opt_out_at)
        await updateCustomer.mutateAsync({
          customerId: customer.id,
          body: {
            ...editable,
            email,
            ...(consent !== initialConsent && (email || !consent) ? { email_consent: consent } : {}),
            ...(optOut !== initialOptOut ? { email_opt_out: optOut } : {}),
          },
        })
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
        <div className="flex w-full gap-2">
          <Button type="button" variant="outline" className="flex-1 rounded-pill" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button form="customer-form" type="submit" disabled={isPending} className="flex-1 rounded-pill">
            {isPending ? 'Guardando…' : mode === 'create' ? 'Crear cliente' : 'Guardar cambios'}
          </Button>
        </div>
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
            {savedEmailIsInvalid && !errors.email && (
              <p className="mt-1 text-xs text-warning">El correo guardado no tiene forma de correo. Se puede dejar así, pero conviene corregirlo.</p>
            )}
          </div>
        </div>

        {/* §9.2-f de NOTIFICACIONES.md: la autorización EXPRESA, en una casilla
            aparte y con su texto. Sin marcarla, al cliente solo se le puede
            escribir sobre un contrato vigente suyo; con ella, también lo demás.
            Nunca se marca sola ni se vuelve obligatoria: el correo es opcional
            y la mayoría de los clientes no lo tiene (§1). */}
        <fieldset className="flex flex-col gap-3 rounded-input border border-border p-3">
          <legend className="px-1 text-sm font-medium text-foreground">Avisos por correo</legend>
          <Controller
            control={control}
            name="email_consent"
            render={({ field }) => (
              <label className="flex items-start gap-2 text-sm text-foreground">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  disabled={!hasEmail}
                  className="mt-0.5"
                  aria-describedby="email-consent-help"
                />
                <span>
                  El cliente autoriza expresamente recibir avisos por correo
                  <span id="email-consent-help" className="mt-0.5 block text-xs text-muted-foreground">
                    {hasEmail
                      ? 'Cuotas, abonos y demás avisos de sus contratos y compras, y otras comunicaciones de la compraventa. Puede retirarla cuando quiera. Sin esta casilla solo se le escribe sobre un contrato vigente suyo.'
                      : 'Primero escribe el correo.'}
                  </span>
                  {mode === 'edit' && customer?.email_basis === 'consent' && customer.email_consent_at && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Autorizó el {formatDateTime(customer.email_consent_at)}.
                    </span>
                  )}
                </span>
              </label>
            )}
          />
          {mode === 'edit' && (
            <Controller
              control={control}
              name="email_opt_out"
              render={({ field }) => (
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="mt-0.5"
                  />
                  <span>
                    Pidió no recibir avisos por correo
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {customer?.email_opt_out_at
                        ? `Desde el ${formatDateTime(customer.email_opt_out_at)}. Desmárcala solo si el cliente pide volver a recibirlos.`
                        : 'Gana sobre cualquier autorización: con esta casilla no se le escribe nada.'}
                    </span>
                  </span>
                </label>
              )}
            />
          )}
        </fieldset>

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

        <div>
          <p className="text-sm font-medium text-foreground">Fotos del documento</p>
          {/* Dos, no una: una cédula tiene frente y reverso, y hasta 00050 solo
              cabía una. El ORDEN es la semántica —la primera es el frente— así
              que el reordenar que `PhotoUploader` ya trae sirve para corregir
              si se suben al revés. Por eso el texto habla de orden y no de dos
              casillas separadas. */}
          <Controller
            control={control}
            name="doc_photos"
            render={({ field }) => (
              <div className="mt-1">
                <PhotoUploader value={field.value} onChange={field.onChange} folder={`customers/${customer?.id ?? draftId}`} maxPhotos={2} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Frente y reverso. La primera es el frente — si quedan al revés, se pueden reordenar.
                </p>
              </div>
            )}
          />
        </div>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
