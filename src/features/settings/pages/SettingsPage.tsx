import { useId, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { FileEdit, Mail } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Textarea } from '@/components/ui/input'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useCompanySettings, useUpdateCompanySettings } from '@/features/settings/api'
import { deleteDetachedPhotos } from '@/lib/storage/detachedPhotos'

const settingsSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  logo_url: z.string().nullable(),
  signature_url: z.string().nullable(),
  header_note: z.string().max(200, 'Máximo 200 caracteres').optional(),
  footer_note: z.string().max(300, 'Máximo 300 caracteres').optional(),
  legal_notice: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
})

type SettingsFormValues = z.infer<typeof settingsSchema>

/** Lo que `Field` le pasa a su campo: el `id` de la etiqueta, si está inválido y, sin error, la ayuda como descripción. */
type FieldControlProps = { id: string; invalid: boolean; 'aria-describedby'?: string }

/**
 * Label arriba, ayuda o error abajo. Si el hijo es una función, recibe el `id`
 * y el estado de error para el campo (`<Input>`/`<Textarea>`): el label queda
 * ASOCIADO por `id` (F9-54: los 9 campos de Configuración no tenían: tocar la
 * etiqueta no enfocaba el campo y el lector de pantalla no los nombraba), con
 * error el campo lleva `aria-invalid` y `aria-describedby` al `FieldError`, y
 * sin error la ayuda queda como su descripción. Un hijo compuesto (el cargador
 * de fotos) queda con el label como título, sin asociación.
 */
function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode | ((field: FieldControlProps) => React.ReactNode)
}) {
  const id = useId()
  const hintId = `${id}-hint`
  const showHint = !!hint && !error
  const isControl = typeof children === 'function'
  // `aria-describedby` solo cuando hay ayuda que mostrar: con error lo pone el
  // propio `Input` (al `FieldError`), y una clave en `undefined` lo pisaría.
  const control = isControl ? children({ id, invalid: !!error, ...(showHint ? { 'aria-describedby': hintId } : {}) }) : children
  return (
    <div>
      <label htmlFor={isControl ? id : undefined} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {control}
      {showHint && (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError fieldId={id}>{error}</FieldError>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
      <div>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/**
 * Configuración de la empresa. Cubre tres cosas que estaban bloqueadas por no
 * existir `GET/PATCH /company/settings`: la firma que se estampa en los
 * contratos impresos, los textos de encabezado/pie de los documentos, y los
 * datos legales (razón social, NIT) que hasta ahora no aparecían en ningún
 * impreso.
 *
 * Un solo formulario con un solo botón de guardar, a propósito: son ajustes
 * que se tocan juntos y rara vez (DESIGN_SYSTEM.md, "una acción primaria por
 * pantalla").
 */
export function SettingsPage() {
  const { data: settings, isPending, isError, refetch } = useCompanySettings()
  const updateSettings = useUpdateCompanySettings()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: settings
      ? {
          name: settings.name,
          legal_name: settings.legal_name ?? '',
          tax_id: settings.tax_id ?? '',
          contact_email: settings.contact_email ?? '',
          contact_phone: settings.contact_phone ?? '',
          address: settings.address ?? '',
          logo_url: settings.logo_url,
          signature_url: settings.signature_url,
          header_note: settings.documents.header_note ?? '',
          footer_note: settings.documents.footer_note ?? '',
          legal_notice: settings.documents.legal_notice ?? '',
        }
      : undefined,
  })

  async function onSubmit(values: SettingsFormValues) {
    setFormError(null)
    try {
      const saved = await updateSettings.mutateAsync({
        name: values.name,
        legal_name: values.legal_name || null,
        tax_id: values.tax_id || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        address: values.address || null,
        logo_url: values.logo_url,
        signature_url: values.signature_url,
        documents: {
          header_note: values.header_note || null,
          footer_note: values.footer_note || null,
          legal_notice: values.legal_notice || null,
        },
      })
      // Logo y firma reemplazados se borran recién con la configuración ya
      // guardada (QA 03 H-04): antes los borraba la X del uploader.
      deleteDetachedPhotos([settings?.logo_url], [saved.logo_url], 'company/logo')
      deleteDetachedPhotos([settings?.signature_url], [saved.signature_url], 'company/signature')
      reset({
        name: saved.name,
        legal_name: saved.legal_name ?? '',
        tax_id: saved.tax_id ?? '',
        contact_email: saved.contact_email ?? '',
        contact_phone: saved.contact_phone ?? '',
        address: saved.address ?? '',
        logo_url: saved.logo_url,
        signature_url: saved.signature_url,
        header_note: saved.documents.header_note ?? '',
        footer_note: saved.documents.footer_note ?? '',
        legal_notice: saved.documents.legal_notice ?? '',
      })
      toast.success('Configuración guardada')
    } catch (error) {
      const banner = applyServerErrors(error, setError, { fields: ['name', 'legal_name', 'tax_id', 'contact_email', 'contact_phone', 'address', 'header_note', 'footer_note', 'legal_notice'] })
      if (banner) setFormError(banner)
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Configuración" description="Datos de la empresa, marca y documentos impresos." />
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-card border border-border bg-border" />
          ))}
        </div>
      </div>
    )
  }

  if (isError || !settings) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Configuración" />
        <EmptyState
          title="No se pudo cargar la configuración"
          description="Revisa tu conexión e intenta de nuevo."
          action={
            <Button onClick={() => refetch()} className="rounded-pill">
              Reintentar
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configuración" description="Datos de la empresa, marca y documentos impresos." />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <Section title="Datos de la empresa" description="Aparecen en los contratos, comprobantes y actas de cierre.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre comercial" error={errors.name?.message}>
              {(field) => <Input {...field} {...register('name')} />}
            </Field>
            <Field label="Razón social" hint="Nombre legal, si es distinto del comercial." error={errors.legal_name?.message}>
              {(field) => <Input {...field} {...register('legal_name')} />}
            </Field>
            <Field label="NIT / documento" error={errors.tax_id?.message}>
              {(field) => <Input {...field} {...register('tax_id')} />}
            </Field>
            <Field label="Teléfono" error={errors.contact_phone?.message}>
              {(field) => <Input {...field} {...register('contact_phone')} />}
            </Field>
            <Field label="Correo de contacto" error={errors.contact_email?.message}>
              {(field) => <Input type="email" {...field} {...register('contact_email')} />}
            </Field>
            <Field label="Dirección" error={errors.address?.message}>
              {(field) => <Input {...field} {...register('address')} />}
            </Field>
          </div>
        </Section>

        <Section title="Logo y firma">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Field label="Logo" hint="Se muestra en el encabezado de los documentos impresos.">
              <Controller
                control={control}
                name="logo_url"
                render={({ field }) => (
                  <div className="mt-1">
                    <PhotoUploader
                      value={field.value ? [field.value] : []}
                      onChange={(next) => field.onChange(next[0] ?? null)}
                      folder="company/logo"
                      maxPhotos={1}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                )}
              />
            </Field>
            <Field
              label="Firma de la empresa"
              hint="Se estampa automáticamente en los contratos impresos, junto a la línea de firma del cliente. Usa una imagen con fondo transparente o blanco."
            >
              <Controller
                control={control}
                name="signature_url"
                render={({ field }) => (
                  <div className="mt-1">
                    <PhotoUploader
                      value={field.value ? [field.value] : []}
                      onChange={(next) => field.onChange(next[0] ?? null)}
                      folder="company/signature"
                      maxPhotos={1}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                )}
              />
            </Field>
          </div>
        </Section>

        <Section title="Notificaciones" description="Correos que la empresa manda: el resumen diario y semanal, y los avisos al cliente.">
          <div className="flex items-start justify-between gap-4 rounded-input border border-border bg-background p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Avisos por correo</p>
              <p className="text-xs text-muted-foreground">Qué se manda, a quién, y cuáles correos salieron. Nacen apagados.</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/configuracion/notificaciones">
                <Mail className="size-4" /> Notificaciones
              </Link>
            </Button>
          </div>
        </Section>

        <Section
          title="Documentos impresos"
          description="Textos del contrato, el comprobante de venta y el acta de cierre de caja."
        >
          <div className="flex items-start justify-between gap-4 rounded-input border border-border bg-background p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Editar el contenido de cada documento</p>
              <p className="text-xs text-muted-foreground">
                Además del encabezado/pie de abajo, ahora puedes editar el texto completo del contrato (y del paz y salvo) con
                plantillas propias.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/configuracion/documentos">
                <FileEdit className="size-4" /> Documentos
              </Link>
            </Button>
          </div>
          <Field
            label="Nota de encabezado"
            hint="Línea corta bajo el nombre de la empresa. Ej.: “Casa de empeño y compraventa · Vigilado Supersociedades”."
            error={errors.header_note?.message}
          >
            {(field) => <Input {...field} {...register('header_note')} />}
          </Field>
          <Field
            label="Pie de página"
            hint="Ej.: horario de atención, teléfono, dirección de la sede."
            error={errors.footer_note?.message}
          >
            {(field) => <Input {...field} {...register('footer_note')} />}
          </Field>
          <Field
            label="Aviso legal"
            hint="Texto largo al final del documento. Ej.: tratamiento de datos personales (Ley 1581), condiciones del contrato."
            error={errors.legal_notice?.message}
          >
            {(field) => <Textarea rows={4} {...field} {...register('legal_notice')} />}
          </Field>
        </Section>

        <Section title="Parámetros regionales" description="No se editan desde acá — escríbenos si necesitas cambiarlos.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-foreground">Zona horaria</p>
              <p className="mt-1 text-sm text-muted-foreground">{settings.timezone}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Define el “hoy” con el que se calculan la mora de los contratos, las prórrogas y el cierre de caja.
                Cambiarla afecta cuentas ya en curso.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Moneda</p>
              <p className="mt-1 text-sm text-muted-foreground">{settings.currency}</p>
            </div>
          </div>
        </Section>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending || !isDirty} className="w-full rounded-pill sm:w-auto">
            {updateSettings.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
