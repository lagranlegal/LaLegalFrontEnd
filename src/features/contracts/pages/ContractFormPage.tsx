import { useRef, useState } from 'react'
import { useNavigate, useBlocker } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { BackLink } from '@/components/shared/BackLink'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Money } from '@/components/shared/Money'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCategories } from '@/lib/catalogs/categories'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { ApiError } from '@/lib/api/client'
import { useCreateContract } from '@/features/contracts/api'
import type { Customer } from '@/lib/customers/search'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { ContractItemsFields } from '@/features/contracts/components/ContractItemsFields'
import { contractItemSchema, emptyContractItem } from '@/features/contracts/contractItemSchema'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'

const contractSchema = z.object({
  principal: z.string().refine((v) => Number(v) > 0, 'El monto del préstamo debe ser mayor a cero'),
  interest_rate_pct: z.string().refine((v) => Number(v) > 0, 'La tasa de interés debe ser mayor a cero'),
  appraisal_value: z.string().optional(),
  payment_method: z.enum(['cash', 'transfer', 'other']),
  account_id: z.string().nullable(),
  extension_months: z.number().int().min(0),
  notes: z.string().optional(),
  items: z.array(contractItemSchema).min(1, 'Agrega al menos una prenda'),
})

type ContractFormValues = z.infer<typeof contractSchema>

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground'

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
    watch,
    formState: { errors, isDirty },
  } = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      principal: '0.00',
      interest_rate_pct: '',
      appraisal_value: '',
      payment_method: 'cash',
      account_id: null,
      extension_months: 1,
      notes: '',
      items: [emptyContractItem()],
    },
  })
  const principal = watch('principal')
  // `useWatch` y no `watch()` para lo nuevo: este último devuelve una función
  // que el React Compiler no puede memoizar.
  const disbursementMethod = useWatch({ control, name: 'payment_method' })

  const blocker = useBlocker({
    shouldBlockFn: () => (isDirty || customer !== null) && !submittedRef.current,
    enableBeforeUnload: true,
    withResolver: true,
  })

  async function onSubmit(values: ContractFormValues) {
    setFormError(null)
    if (!customer) {
      setCustomerError('Selecciona un cliente')
      return
    }
    setCustomerError(null)
    try {
      const contract = await createContract.mutateAsync({
        customer_id: customer.id,
        principal: values.principal,
        interest_rate_pct: values.interest_rate_pct,
        appraisal_value: values.appraisal_value || null,
        payment_method: values.payment_method,
        account_id: values.account_id,
        extension_months: values.extension_months,
        notes: values.notes || null,
        items: values.items.map((item) => ({
          category_id: item.category_id,
          description: item.description,
          weight_grams: item.weight_grams || null,
          serial_imei: item.serial_imei || null,
          item_appraisal: item.item_appraisal || null,
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
      const banner = applyServerErrors(error, setError)
      if (banner) setFormError(banner)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/contratos" label="Contratos" />
      <PageHeader title="Nuevo contrato" description="Registra el préstamo y las prendas que quedan en garantía." />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Cliente</h2>
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
          <h2 className="text-sm font-medium text-foreground">Condiciones del préstamo</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="principal" className="text-sm font-medium text-foreground">
                Monto del préstamo
              </label>
              <Controller control={control} name="principal" render={({ field }) => <MoneyInput id="principal" className="mt-1" value={field.value} onChange={field.onChange} />} />
              {errors.principal && <p className="mt-1 text-sm text-danger">{errors.principal.message}</p>}
            </div>
            <div>
              <label htmlFor="interest_rate_pct" className="text-sm font-medium text-foreground">
                Tasa de interés mensual (%)
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
                  />
                )}
              />
            </div>
            <div>
              <label htmlFor="extension_months" className="text-sm font-medium text-foreground">
                Meses de prórroga permitidos
              </label>
              <input id="extension_months" type="number" min={0} className={inputClass} {...register('extension_months', { valueAsNumber: true })} />
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

        <Button type="submit" disabled={createContract.isPending} className="w-full rounded-pill sm:w-auto sm:self-end">
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
            <Button className="w-full rounded-pill bg-danger hover:bg-danger/90" onClick={() => blocker.proceed?.()}>
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
