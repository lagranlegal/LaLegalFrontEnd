import { useRef, useState } from 'react'
import { useNavigate, useBlocker } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { DatePicker } from '@/components/shared/DatePicker'
import { Button } from '@/components/ui/button'
import { useCategories } from '@/lib/catalogs/categories'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { ApiError } from '@/lib/api/client'
import { addMonthsToDateOnly, formatDate, todayBogota } from '@/lib/dates'
import { useImportContract, type Customer } from '@/features/contracts/api'
import { CustomerPicker } from '@/features/contracts/components/CustomerPicker'
import { ContractItemsFields } from '@/features/contracts/components/ContractItemsFields'
import { contractItemSchema, emptyContractItem } from '@/features/contracts/contractItemSchema'

const importSchema = z
  .object({
    legacy_code: z.string().min(1, 'El código del contrato anterior es obligatorio'),
    principal: z.string().refine((v) => Number(v) > 0, 'El monto prestado debe ser mayor a cero'),
    capital_balance: z.string().refine((v) => Number(v) > 0, 'El saldo debe ser mayor a cero'),
    interest_rate_pct: z.string().refine((v) => Number(v) > 0, 'La tasa de interés debe ser mayor a cero'),
    term_months: z.number().int().min(1, 'Debe ser al menos 1 mes'),
    arrears_window_months: z.number().int().min(1, 'Debe ser al menos 1 mes'),
    extension_months: z.number().int().min(0),
    start_date: z.string().min(1, 'Selecciona la fecha de inicio'),
    months_interest_paid: z.number().int().min(0),
    appraisal_value: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(contractItemSchema).min(1, 'Agrega al menos una prenda'),
  })
  .refine((data) => Number(data.capital_balance) <= Number(data.principal), {
    message: 'El saldo no puede ser mayor al monto que se prestó originalmente',
    path: ['capital_balance'],
  })

type ImportFormValues = z.infer<typeof importSchema>

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground'

/**
 * "Registrar contrato existente" (paso 5b, docs/RECOMENDACIONES.md §1.6):
 * migra un contrato vivo del sistema anterior con su saldo real. Pantalla
 * separada de `ContractFormPage` — campos distintos (trae fechas/saldos que
 * la creación normal nunca pide), sin medio de pago ni paso de caja (no
 * desembolsa), tasa/plazo/ventana/prórroga a mano en vez de la categoría.
 */
export function ContractImportPage() {
  const navigate = useNavigate()
  const { data: categories } = useCategories()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerError, setCustomerError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const submittedRef = useRef(false)
  const importContract = useImportContract()

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      legacy_code: '',
      principal: '0.00',
      capital_balance: '0.00',
      interest_rate_pct: '',
      term_months: 1,
      arrears_window_months: 1,
      extension_months: 1,
      start_date: '',
      months_interest_paid: 0,
      appraisal_value: '',
      notes: '',
      items: [emptyContractItem()],
    },
  })

  const startDate = watch('start_date')
  const monthsInterestPaid = watch('months_interest_paid')
  const interestPaidUntilPreview = startDate ? addMonthsToDateOnly(startDate, monthsInterestPaid || 0) : null

  const blocker = useBlocker({
    shouldBlockFn: () => (isDirty || customer !== null) && !submittedRef.current,
    enableBeforeUnload: true,
    withResolver: true,
  })

  async function onSubmit(values: ImportFormValues) {
    setFormError(null)
    if (!customer) {
      setCustomerError('Selecciona un cliente')
      return
    }
    setCustomerError(null)
    try {
      const contract = await importContract.mutateAsync({
        legacy_code: values.legacy_code,
        customer_id: customer.id,
        principal: values.principal,
        capital_balance: values.capital_balance,
        interest_rate_pct: values.interest_rate_pct,
        term_months: values.term_months,
        arrears_window_months: values.arrears_window_months,
        extension_months: values.extension_months,
        start_date: values.start_date,
        interest_paid_until: addMonthsToDateOnly(values.start_date, values.months_interest_paid),
        appraisal_value: values.appraisal_value || null,
        notes: values.notes || null,
        items: values.items.map((item) => ({
          category_id: item.category_id,
          description: item.description,
          weight_grams: item.weight_grams || null,
          serial_imei: item.serial_imei || null,
          item_appraisal: item.item_appraisal || null,
        })),
      })
      submittedRef.current = true
      toast.success(`Contrato #${contract.number} registrado`)
      await navigate({ to: '/contratos/$contractId', params: { contractId: contract.id } })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CONTRACT_LEGACY_CODE_EXISTS') {
        setError('legacy_code', { message: 'Ya existe un contrato con ese código.' })
        return
      }
      if (error instanceof ApiError && error.code === 'IMPORT_CAPITAL_EXCEEDS_PRINCIPAL') {
        setError('capital_balance', { message: error.message })
        return
      }
      const banner = applyServerErrors(error, setError)
      if (banner) setFormError(banner)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Registrar contrato existente"
        description="Migra un contrato de empeño del sistema anterior con su saldo real. No desembolsa dinero — ese préstamo ya se entregó afuera."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Referencia y cliente</h2>
          <div>
            <label htmlFor="legacy_code" className="text-sm font-medium text-foreground">
              Código en el sistema anterior
            </label>
            <input id="legacy_code" className={inputClass} placeholder="ej. C-1042" {...register('legacy_code')} />
            {errors.legacy_code && <p className="mt-1 text-sm text-danger">{errors.legacy_code.message}</p>}
          </div>
          <CustomerPicker
            value={customer}
            onChange={(next) => {
              setCustomer(next)
              if (next) setCustomerError(null)
            }}
          />
          {customerError && <p className="text-sm text-danger">{customerError}</p>}
        </section>

        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Condiciones del contrato viejo</h2>
          <p className="-mt-2 text-xs text-muted-foreground">A diferencia de un contrato nuevo, acá se digitan a mano: son las condiciones reales pactadas en el sistema anterior.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="principal" className="text-sm font-medium text-foreground">
                Monto que se prestó originalmente
              </label>
              <Controller control={control} name="principal" render={({ field }) => <MoneyInput id="principal" className="mt-1" value={field.value} onChange={field.onChange} />} />
              {errors.principal && <p className="mt-1 text-sm text-danger">{errors.principal.message}</p>}
            </div>
            <div>
              <label htmlFor="capital_balance" className="text-sm font-medium text-foreground">
                Saldo de capital hoy
              </label>
              <Controller
                control={control}
                name="capital_balance"
                render={({ field }) => <MoneyInput id="capital_balance" className="mt-1" value={field.value} onChange={field.onChange} />}
              />
              {errors.capital_balance && <p className="mt-1 text-sm text-danger">{errors.capital_balance.message}</p>}
            </div>
            <div>
              <label htmlFor="interest_rate_pct" className="text-sm font-medium text-foreground">
                Tasa de interés mensual pactada (%)
              </label>
              <input id="interest_rate_pct" inputMode="decimal" className={inputClass} {...register('interest_rate_pct')} />
              {errors.interest_rate_pct && <p className="mt-1 text-sm text-danger">{errors.interest_rate_pct.message}</p>}
            </div>
            <div>
              <label htmlFor="appraisal_value" className="text-sm font-medium text-foreground">
                Avalúo total (opcional)
              </label>
              <Controller
                control={control}
                name="appraisal_value"
                render={({ field }) => <MoneyInput id="appraisal_value" className="mt-1" value={field.value ?? ''} onChange={field.onChange} />}
              />
            </div>
            <div>
              <label htmlFor="term_months" className="text-sm font-medium text-foreground">
                Plazo (meses)
              </label>
              <input id="term_months" type="number" min={1} className={inputClass} {...register('term_months', { valueAsNumber: true })} />
              {errors.term_months && <p className="mt-1 text-sm text-danger">{errors.term_months.message}</p>}
            </div>
            <div>
              <label htmlFor="arrears_window_months" className="text-sm font-medium text-foreground">
                Ventana de mora (meses)
              </label>
              <input id="arrears_window_months" type="number" min={1} className={inputClass} {...register('arrears_window_months', { valueAsNumber: true })} />
              {errors.arrears_window_months && <p className="mt-1 text-sm text-danger">{errors.arrears_window_months.message}</p>}
            </div>
            <div>
              <label htmlFor="extension_months" className="text-sm font-medium text-foreground">
                Meses de prórroga permitidos
              </label>
              <input id="extension_months" type="number" min={0} className={inputClass} {...register('extension_months', { valueAsNumber: true })} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Fechas</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="start_date" className="text-sm font-medium text-foreground">
                Fecha real de inicio del préstamo
              </label>
              <Controller
                control={control}
                name="start_date"
                render={({ field }) => <DatePicker id="start_date" value={field.value} onChange={field.onChange} maxDate={todayBogota()} />}
              />
              {errors.start_date && <p className="mt-1 text-sm text-danger">{errors.start_date.message}</p>}
            </div>
            <div>
              <label htmlFor="months_interest_paid" className="text-sm font-medium text-foreground">
                Meses de interés ya cubiertos
              </label>
              <input id="months_interest_paid" type="number" min={0} className={inputClass} {...register('months_interest_paid', { valueAsNumber: true })} />
              <p className="mt-1 text-xs text-muted-foreground">
                {interestPaidUntilPreview ? <>Intereses pagados hasta el {formatDate(interestPaidUntilPreview)}.</> : 'Selecciona primero la fecha de inicio.'}
              </p>
            </div>
          </div>
        </section>

        <ContractItemsFields control={control} register={register} errors={errors} categories={categories} />

        <section className="rounded-card border border-border bg-card p-card shadow-card">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas (opcional)
          </label>
          <textarea id="notes" rows={2} className={inputClass} {...register('notes')} />
        </section>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

        <Button type="submit" disabled={importContract.isPending} className="w-full rounded-pill sm:w-auto sm:self-end">
          {importContract.isPending ? 'Registrando…' : 'Registrar contrato'}
        </Button>
      </form>

      <AppDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="¿Descartar el registro?"
        description="Vas a perder los datos que ya escribiste."
        size="sm"
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button className="w-full rounded-pill bg-danger hover:bg-danger/90" onClick={() => blocker.proceed?.()}>
              Descartar cambios
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => blocker.reset?.()}>
              Seguir editando
            </Button>
          </div>
        }
      />
    </div>
  )
}
