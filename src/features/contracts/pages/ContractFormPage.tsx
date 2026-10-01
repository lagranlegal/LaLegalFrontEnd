import { useRef, useState } from 'react'
import { CashClosedNotice } from '@/components/shared/CashClosedNotice'
import { useNavigate, useBlocker } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form'
import { z } from 'zod'
import { positiveMoneyField } from '@/lib/forms/rules'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { BackLink } from '@/components/shared/BackLink'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Money } from '@/components/shared/Money'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Textarea } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDateTime } from '@/lib/dates'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCategories } from '@/lib/catalogs/categories'
import { normalizeDecimalInput } from '@/lib/money'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { collectErrorNames, revealFirstError } from '@/lib/forms/revealFirstError'
import { serverErrorFieldNames } from '@/lib/forms/applyServerErrors'
import { ApiError } from '@/lib/api/client'
import { useCreateContract } from '@/features/contracts/api'
import type { Customer } from '@/lib/customers/search'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { ContractItemsFields } from '@/features/contracts/components/ContractItemsFields'
import { contractItemSchema, emptyContractItem } from '@/features/contracts/contractItemSchema'
import { appraisalRequirement, evaluarLtv, resolveMaxLtvPct } from '@/features/contracts/ltv'
import { usePermission } from '@/lib/permissions/usePermission'
import { LtvHint } from '@/features/contracts/components/LtvHint'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { customerNoticePayload, customerNoticeState } from '@/features/contracts/customerNotice'
import { preventImplicitSubmit } from '@/lib/forms/preventImplicitSubmit'

const contractSchema = z.object({
  principal: positiveMoneyField('El monto del préstamo debe ser mayor a cero'),
  // `normalizeDecimalInput` antes del `Number`: sin eso, "5,5" da NaN y el
  // usuario recibe "debe ser mayor a cero" por haber escrito una coma.
  interest_rate_pct: z.string().refine((v) => Number(normalizeDecimalInput(v)) > 0, 'La tasa de interés debe ser mayor a cero'),
  appraisal_value: z.string().optional(),
  payment_method: z.enum(['cash', 'transfer', 'other']),
  account_id: z.string().nullable(),
  extension_months: z.number().int().min(0),
  // Vacío = usar la política de la empresa. No se precarga con 28 a propósito:
  // el 28 es el default del SISTEMA, y cada compraventa maneja el suyo — si
  // acá apareciera un número, el contrato congelaría ese en vez de la
  // política vigente.
  extension_window_days: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(contractItemSchema).min(1, 'Agrega al menos una prenda'),
  // backend-starter/docs/DOMINIO.md §9.2: el correo (solo si el cliente no tiene) y la
  // casilla de autorización, capturados donde se firma el contrato. Viven en
  // el formulario —y no como estado aparte— para que un 422 del backend con
  // `customer_email` en `loc` se pinte debajo de su campo sin traducción.
  customer_email: z
    .string()
    .optional()
    .refine((v) => !v?.trim() || z.string().email().safeParse(v.trim()).success, 'Escribe un correo válido'),
  customer_email_consent: z.boolean(),
})

type ContractFormValues = z.infer<typeof contractSchema>

export function ContractFormPage() {
  const navigate = useNavigate()
  const { data: categories } = useCategories()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const submittedRef = useRef(false)
  const createContract = useCreateContract()

  const {
    register,
    handleSubmit,
    control,
    setError,
    setValue,
    resetField,
    watch,
    formState: { errors, isDirty },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    // El foco lo lleva `revealFirstError` al error más arriba; el de RHF
    // llegaba después y lo pisaba (issue #5).
    shouldFocusError: false,
    defaultValues: {
      principal: '0.00',
      interest_rate_pct: '',
      appraisal_value: '',
      payment_method: 'cash',
      account_id: null,
      extension_months: 1,
      extension_window_days: '',
      notes: '',
      items: [emptyContractItem()],
      customer_email: '',
      customer_email_consent: false,
    },
  })
  const principal = watch('principal')
  // `useWatch` y no `watch()` para lo nuevo: este último devuelve una función
  // que el React Compiler no puede memoizar.
  const disbursementMethod = useWatch({ control, name: 'payment_method' })

  // El correo y la autorización del cliente elegido (§9.2-f, reglas en
  // `customerNotice.ts`).
  const correoEscrito = useWatch({ control, name: 'customer_email' })
  const { savedEmail: correoGuardado, hasEmail: tieneCorreo } = customerNoticeState(customer, correoEscrito)

  // El cupo del LTV, en vivo. El tope sale de la categoría de la PRIMERA
  // prenda porque es lo que hace el backend (`max_ltv_pct = first[...]`) —
  // espejar otro criterio mostraría un número y el servidor aplicaría otro.
  const appraisalValue = useWatch({ control, name: 'appraisal_value' })
  const primeraCategoria = useWatch({ control, name: 'items.0.category_id' })
  const maxLtvPct = resolveMaxLtvPct(categories, primeraCategoria || undefined)
  const ltv = evaluarLtv({ principal, appraisalValue, maxLtvPct })
  // Con LTV en la categoría, el avalúo es obligatorio salvo override (F4-05).
  const canOverrideLtv = usePermission('contracts.override_ltv')
  const avaluo = appraisalRequirement({ maxLtvPct, appraisalValue, canOverride: canOverrideLtv })

  const blocker = useBlocker({
    shouldBlockFn: () => (isDirty || customer !== null) && !submittedRef.current,
    enableBeforeUnload: true,
    withResolver: true,
  })

  /**
   * Señala TODO lo que falta y lleva a la vista lo primero.
   *
   * El botón está al final de un formulario largo: sin esto, con todo lleno
   * menos el cliente el único mensaje quedaba ~800px por encima, sin foco ni
   * scroll — el botón parecía no hacer nada (reportado en vivo). El cliente
   * se revisa acá y no en el schema de Zod porque no vive en el formulario:
   * es estado aparte, así que RHF no sabe que existe.
   */
  function señalarProblemas(errores?: FieldErrors<ContractFormValues>) {
    const nombres = errores ? collectErrorNames(errores) : []
    if (customer) {
      setCustomerError(null)
    } else {
      setCustomerError('Selecciona un cliente')
      nombres.push('customer-picker')
    }
    revealFirstError(nombres)
  }

  async function onSubmit(values: ContractFormValues) {
    setFormError(null)
    if (!customer) {
      señalarProblemas()
      return
    }
    setCustomerError(null)
    if (avaluo.error) {
      setError('appraisal_value', { message: avaluo.error })
      revealFirstError(['appraisal_value'])
      return
    }
    try {
      const contract = await createContract.mutateAsync({
        customer_id: customer.id,
        principal: values.principal,
        interest_rate_pct: normalizeDecimalInput(values.interest_rate_pct),
        appraisal_value: values.appraisal_value || null,
        payment_method: values.payment_method,
        account_id: values.account_id,
        extension_months: values.extension_months,
        extension_window_days: values.extension_window_days
          ? Number(values.extension_window_days)
          : null,
        notes: values.notes || null,
        ...customerNoticePayload(customer, values),
        items: values.items.map((item) => ({
          category_id: item.category_id,
          description: item.description,
          // La coma decimal se traduce acá, no se rechaza: "10,5" gramos es lo
          // natural de escribir en Colombia y lo que ofrece el teclado del
          // celular. Antes llegaba tal cual al backend, que respondía 422 —
          // y ese 422 era invisible (ver `applyServerErrors`).
          weight_grams: item.weight_grams ? normalizeDecimalInput(item.weight_grams) : null,
          serial_imei: item.serial_imei || null,
          item_appraisal: item.item_appraisal ? normalizeDecimalInput(item.item_appraisal) : null,
          photos: item.photos,
        })),
      })
      submittedRef.current = true
      toast.success(`Contrato #${contract.number} creado`)
      await navigate({ to: '/contratos/$contractId', params: { contractId: contract.id } })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      // La categoría pudo ganar su LTV después de cargar el formulario: el
      // mensaje del backend va junto al campo del avalúo, que es donde se
      // resuelve.
      if (error instanceof ApiError && error.code === 'CONTRACT_APPRAISAL_REQUIRED') {
        setError('appraisal_value', { message: error.message })
        revealFirstError(['appraisal_value'])
        return
      }
      const banner = applyServerErrors(error, setError, { fields: ['principal', 'interest_rate_pct', 'appraisal_value', 'notes', 'customer_email', 'customer_email_consent', 'items', 'items.*.category_id', 'items.*.description', 'items.*.weight_grams', 'items.*.serial_imei', 'items.*.item_appraisal'] })
      if (banner) setFormError(banner)
      // Los nombres salen del error del SERVIDOR, no de `errors` del formState:
      // ese todavía es el del render anterior — React no lo ha actualizado en
      // este mismo tick, así que apuntaría al campo equivocado o a ninguno.
      revealFirstError(serverErrorFieldNames(error))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/contratos" label="Contratos" />
      <PageHeader title="Nuevo contrato" description="Registra el préstamo y las prendas que quedan en garantía." />
      <CashClosedNotice paymentMethod={disbursementMethod} />

      <form onKeyDown={preventImplicitSubmit} onSubmit={handleSubmit(onSubmit, señalarProblemas)} className="flex flex-col gap-6" noValidate>
        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card">
          <h2 className="text-sm font-medium text-foreground">Cliente</h2>
          <CustomerPicker
            id="customer-picker"
            invalid={!!customerError}
            value={customer}
            onChange={(next) => {
              setCustomer(next)
              // Lo capturado era de OTRO cliente: la autorización es de una
              // persona, no del formulario.
              setValue('customer_email', '')
              setValue('customer_email_consent', false)
              if (next) setCustomerError(null)
            }}
          />
          <FieldError fieldId="customer-picker" className="mt-0">
            {customerError}
          </FieldError>

          {/* backend-starter/docs/DOMINIO.md §9.2: la autorización EXPRESA se pregunta donde
              se firma el contrato, en una casilla aparte y con su texto. Nunca
              se marca sola ni vuelve obligatorio el correo: la mayoría de los
              clientes no lo tiene (§1), y eso es lo normal. */}
          {customer && (
            <fieldset className="flex flex-col gap-3 rounded-input border border-border p-3">
              <legend className="px-1 text-sm font-medium text-foreground">Avisos por correo</legend>
              {correoGuardado ? (
                <p className="text-sm text-muted-foreground">
                  Correo: <span className="break-all font-medium text-foreground">{correoGuardado}</span>
                  {customer.email_invalid_at && (
                    <span className="mt-0.5 block text-xs text-warning">El correo rebotó: corrígelo en su ficha.</span>
                  )}
                </p>
              ) : (
                <div>
                  <label htmlFor="customer_email" className="text-sm font-medium text-foreground">
                    Correo del cliente (opcional)
                  </label>
                  <Input id="customer_email" type="email" inputMode="email" invalid={!!errors.customer_email} {...register('customer_email')} />
                  {errors.customer_email ? (
                    <FieldError fieldId="customer_email">{errors.customer_email.message}</FieldError>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sin correo no recibe avisos de sus cuotas ni de sus abonos. Si lo da, queda guardado en su ficha.
                    </p>
                  )}
                </div>
              )}
              {customer.email_opt_out_at ? (
                <p className="text-sm text-warning">
                  Pidió no recibir avisos por correo ({formatDateTime(customer.email_opt_out_at)}). Solo se levanta desde su ficha.
                </p>
              ) : customer.email_basis === 'consent' && customer.email_consent_at ? (
                <p className="text-sm text-muted-foreground">
                  Autorizó recibir avisos por correo el {formatDateTime(customer.email_consent_at)}.
                </p>
              ) : (
                <Controller
                  control={control}
                  name="customer_email_consent"
                  render={({ field }) => (
                    <label className="flex items-start gap-2 text-sm text-foreground">
                      <Checkbox
                        id="customer_email_consent"
                        checked={field.value && tieneCorreo}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                        disabled={!tieneCorreo}
                        className="mt-0.5"
                        aria-describedby="customer-email-consent-help"
                      />
                      <span>
                        El cliente autoriza recibir avisos por correo
                        <span id="customer-email-consent-help" className="mt-0.5 block text-xs text-muted-foreground">
                          {tieneCorreo
                            ? 'Cuotas, abonos y demás avisos de sus contratos y compras, y otras comunicaciones de la compraventa. Puede retirarla cuando quiera desde su ficha. Sin esta casilla solo se le escribe sobre sus contratos vigentes.'
                            : 'Primero escribe el correo.'}
                        </span>
                        {errors.customer_email_consent && (
                          <span className="mt-0.5 block text-sm text-danger">{errors.customer_email_consent.message}</span>
                        )}
                      </span>
                    </label>
                  )}
                />
              )}
            </fieldset>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card">
          <h2 className="text-sm font-medium text-foreground">Condiciones del préstamo</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="principal" className="text-sm font-medium text-foreground">
                Monto del préstamo
              </label>
              <Controller control={control} name="principal" render={({ field }) => <MoneyInput ref={field.ref} invalid={!!errors.principal} id="principal" className="mt-1" value={field.value} onChange={field.onChange} />} />
              <FieldError fieldId="principal">{errors.principal?.message}</FieldError>
            </div>
            <div>
              <label htmlFor="interest_rate_pct" className="text-sm font-medium text-foreground">
                Tasa de interés mensual (%)
              </label>
              <Input id="interest_rate_pct" inputMode="decimal" invalid={!!errors.interest_rate_pct} {...register('interest_rate_pct')} />
              <FieldError fieldId="interest_rate_pct">{errors.interest_rate_pct?.message}</FieldError>
            </div>
            <div>
              <label htmlFor="appraisal_value" className="text-sm font-medium text-foreground">
                Avalúo total {avaluo.required ? <span className="text-danger">*</span> : <span className="text-muted-foreground">(opcional)</span>}
              </label>
              <Controller
                control={control}
                name="appraisal_value"
                render={({ field }) => <MoneyInput ref={field.ref} invalid={!!errors.appraisal_value} optional id="appraisal_value" className="mt-1" value={field.value ?? ''} onChange={field.onChange} />}
              />
              <FieldError fieldId="appraisal_value">{errors.appraisal_value?.message}</FieldError>
              {avaluo.required && !errors.appraisal_value && (
                <p className="mt-1 text-xs text-muted-foreground">Obligatorio: la categoría presta sobre un porcentaje del avalúo.</p>
              )}
              {canOverrideLtv && maxLtvPct !== null && !appraisalValue && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Sin avalúo no se puede comprobar el cupo: tu rol puede registrarlo igual y el contrato queda marcado.
                </p>
              )}
              <LtvHint estado={ltv} />
            </div>
            <div>
              <label htmlFor="extension_window_days" className="text-sm font-medium text-foreground">
                Días para ampliar (opcional)
              </label>
              <Input
                id="extension_window_days"
                inputMode="numeric"
                placeholder="Política de la empresa"
                {...register('extension_window_days')}
              />
              {/* Se congela en el contrato al firmarlo, como la tasa: cambiar
                  la política mañana no puede alterar lo que el cliente firmó
                  hoy. `0` = este contrato no admite ampliaciones. */}
              <p className="mt-1 text-xs text-muted-foreground">
                Hasta cuántos días después puede volver a retirar sobre esta garantía. Vacío usa la
                política de la empresa; 0 la desactiva.
              </p>
            </div>
            <div>
              <label htmlFor="payment_method" className="text-sm font-medium text-foreground">
                Medio de pago del desembolso
              </label>
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="payment_method" className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {/* De qué cuenta SALE el préstamo — el desembolso es un egreso. */}
            <div>
              <label htmlFor="contract-account" className="text-sm font-medium text-foreground">
                ¿De dónde sale?
              </label>
              <Controller
                control={control}
                name="account_id"
                render={({ field }) => (
                  <AccountPicker
                    id="contract-account"
                    paymentMethod={disbursementMethod}
                    direction="out"
                    value={field.value}
                    onChange={field.onChange}
                    onAutoSelect={(accountId) => resetField('account_id', { defaultValue: accountId })}
                  />
                )}
              />
            </div>
            <div>
              <label htmlFor="extension_months" className="text-sm font-medium text-foreground">
                Meses de prórroga permitidos
              </label>
              <Input id="extension_months" type="number" min={0} {...register('extension_months', { valueAsNumber: true })} />
            </div>
          </div>
        </section>

        <ContractItemsFields control={control} register={register} errors={errors} categories={categories} />

        <section className="rounded-card border border-border bg-card p-card">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas (opcional)
          </label>
          <Textarea id="notes" rows={2} invalid={!!errors.notes} {...register('notes')} />
          <FieldError fieldId="notes">{errors.notes?.message}</FieldError>
        </section>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

        <Button type="submit" disabled={createContract.isPending} className="w-full sm:w-auto sm:self-end">
          {createContract.isPending ? 'Creando…' : (
            <>
              Crear contrato <Money value={principal || '0.00'} className="ml-1" />
            </>
          )}
        </Button>
      </form>

      <AppDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="¿Descartar el contrato?"
        description="Vas a perder los datos que ya escribiste."
        size="sm"
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button variant="danger-solid" className="w-full" onClick={() => blocker.proceed?.()}>
              Descartar cambios
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => blocker.reset?.()}>
              Seguir editando
            </Button>
          </div>
        }
      />

      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </div>
  )
}
