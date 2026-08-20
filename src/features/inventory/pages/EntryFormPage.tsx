import { useRef, useState } from 'react'
import { useNavigate, useBlocker } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { DatePicker } from '@/components/shared/DatePicker'
import { Money } from '@/components/shared/Money'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { useCategories } from '@/lib/catalogs/categories'
import { useSuppliers } from '@/lib/catalogs/suppliers'
import { sumMoney, multiplyMoney } from '@/lib/money'
import { todayBogota } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useCreateEntry } from '@/features/inventory/api'

const ORIGIN_TYPE_LABELS: Record<'purchase' | 'other', string> = { purchase: 'Compra', other: 'Otro' }

const entryLineSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  cat1_id: z.string().min(1, 'Selecciona una categoría'),
  cat2_id: z.string().min(1, 'Selecciona una subcategoría'),
  cat3_id: z.string().min(1, 'Selecciona la categoría final'),
  description: z.string().optional(),
  unit_cost: z.string().refine((v) => Number(v) > 0, 'El costo debe ser mayor a cero'),
  quantity: z.number().int().min(1),
})

const entrySchema = z
  .object({
    origin_type: z.enum(['purchase', 'other']),
    supplier_id: z.string().optional(),
    supplier_invoice: z.string().optional(),
    // '' = pendiente de pago. No es lo mismo que "sin elegir": es una
    // decisión explícita del usuario, así que tiene su propia opción visible.
    payment_method: z.enum(['cash', 'transfer', 'other', '']).optional(),
    entry_date: z.string().min(1, 'Indica cuándo entró la mercancía'),
    notes: z.string().optional(),
    lines: z.array(entryLineSchema).min(1, 'Agrega al menos un artículo'),
  })
  // Hallazgo real probando en navegador: el backend rechaza con 400
  // BAD_REQUEST un ingreso "Compra" sin proveedor — el schema generado no
  // lo marca como obligatorio (es opcional en general, solo condicional a
  // origin_type), así que se valida acá para no depender del roundtrip.
  .refine((data) => data.origin_type !== 'purchase' || !!data.supplier_id, {
    message: 'Un ingreso de tipo "Compra" necesita un proveedor',
    path: ['supplier_id'],
  })
  // El medio de pago YA NO es obligatorio en una compra: dejarlo vacío la
  // registra como pendiente de pago, que es el camino para cargar facturas de
  // días anteriores o de noche con la caja cerrada.
  .refine((data) => data.entry_date <= todayBogota(), {
    message: 'La mercancía no puede haber entrado en una fecha futura',
    path: ['entry_date'],
  })

type EntryFormValues = z.infer<typeof entrySchema>

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground'

function emptyLine(): EntryFormValues['lines'][number] {
  return { name: '', cat1_id: '', cat2_id: '', cat3_id: '', description: '', unit_cost: '0.00', quantity: 1 }
}

export function EntryFormPage() {
  const navigate = useNavigate()
  const { data: categories } = useCategories()
  const { data: suppliers } = useSuppliers()
  const [formError, setFormError] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const submittedRef = useRef(false)
  const createEntry = useCreateEntry()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      origin_type: 'purchase',
      supplier_id: '',
      supplier_invoice: '',
      payment_method: 'cash',
      entry_date: todayBogota(),
      notes: '',
      lines: [emptyLine()],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines = watch('lines')
  const originType = watch('origin_type')
  const isPurchase = originType === 'purchase'

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !submittedRef.current,
    enableBeforeUnload: true,
    withResolver: true,
  })

  const totalCost = sumMoney(...lines.map((line) => multiplyMoney(line.unit_cost || '0.00', line.quantity || 0)))

  async function onSubmit(values: EntryFormValues) {
    setFormError(null)
    try {
      const entry = await createEntry.mutateAsync({
        origin_type: values.origin_type,
        supplier_id: values.supplier_id || null,
        supplier_invoice: values.supplier_invoice || null,
        // Solo la compra lo lleva — el backend rechaza un 'other' con medio
        // de pago (CHECK de la migración 00014).
        payment_method: values.origin_type === 'purchase' && values.payment_method ? values.payment_method : null,
        entry_date: values.entry_date,
        notes: values.notes || null,
        lines: values.lines.map((line) => ({
          name: line.name,
          cat1_id: line.cat1_id,
          cat2_id: line.cat2_id,
          cat3_id: line.cat3_id,
          description: line.description || null,
          unit_cost: line.unit_cost,
          quantity: line.quantity,
        })),
      })
      submittedRef.current = true
      toast.success(`Ingreso #${entry.number} registrado — ${entry.items.length} artículo(s) en borrador`)
      await navigate({ to: '/inventario' })
    } catch (error) {
      // Mismo manejo que la venta: una compra ahora exige caja abierta, así
      // que el 409 se resuelve ofreciendo abrirla, no con un error seco.
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
      <PageHeader title="Nuevo ingreso" description="Registra prendas o artículos comprados — quedan en borrador hasta publicarlos." />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Origen</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="origin_type" className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <Controller
                control={control}
                name="origin_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="origin_type" className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGIN_TYPE_LABELS).map(([value, label]) => (
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
              <label htmlFor="supplier_id" className="text-sm font-medium text-foreground">
                Proveedor (opcional)
              </label>
              <Controller
                control={control}
                name="supplier_id"
                render={({ field }) => (
                  <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                    <SelectTrigger id="supplier_id" className="mt-1 w-full">
                      <SelectValue placeholder="Sin proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin proveedor</SelectItem>
                      {suppliers
                        ?.filter((s) => s.active)
                        .map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplier_id && <p className="mt-1 text-sm text-danger">{errors.supplier_id.message}</p>}
            </div>
            <div>
              <label htmlFor="supplier_invoice" className="text-sm font-medium text-foreground">
                Factura del proveedor (opcional)
              </label>
              <input id="supplier_invoice" className={inputClass} {...register('supplier_invoice')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="entry_date" className="text-sm font-medium text-foreground">
                Fecha de entrada
              </label>
              <Controller
                control={control}
                name="entry_date"
                render={({ field }) => <DatePicker id="entry_date" value={field.value} onChange={field.onChange} maxDate={todayBogota()} />}
              />
              <p className="mt-1 text-xs text-muted-foreground">Cuándo llegó la mercancía, no cuándo la registras.</p>
              {errors.entry_date && <p className="mt-1 text-sm text-danger">{errors.entry_date.message}</p>}
            </div>

            {/* El medio de pago es OPCIONAL: vacío = pendiente de pago. Ese es
                el camino para cargar facturas de días anteriores o de noche
                con la caja cerrada, sin inventarle un movimiento a la caja. */}
            {isPurchase && (
              <div className="sm:col-span-2">
                <label htmlFor="payment_method" className="text-sm font-medium text-foreground">
                  Pago
                </label>
                <Controller
                  control={control}
                  name="payment_method"
                  render={({ field }) => (
                    <Select value={field.value || '__pending__'} onValueChange={(v) => field.onChange(v === '__pending__' ? '' : v)}>
                      <SelectTrigger id="payment_method" className="mt-1 w-full">
                        <SelectValue>
                          {field.value ? `Pagado — ${PAYMENT_METHOD_LABELS[field.value as 'cash' | 'transfer' | 'other']}` : 'Pendiente de pago'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__pending__">Pendiente de pago</SelectItem>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            Pagado — {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {watch('payment_method')
                    ? 'Sale de la caja ahora, así que requiere la caja abierta. Registra las compras en efectivo el mismo día: la caja se cuadra contra el conteo físico.'
                    : 'No toca la caja. Queda en “por pagar” y la saldas cuando entregues la plata — sirve para cargar facturas de días anteriores o con la caja cerrada.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Artículos</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine())}>
              <Plus className="size-4" /> Agregar artículo
            </Button>
          </div>
          {errors.lines?.message && <p className="text-sm text-danger">{errors.lines.message}</p>}

          <div className="flex flex-col gap-4">
            {fields.map((field, index) => {
              const cat1 = lines[index]?.cat1_id
              const cat2 = lines[index]?.cat2_id
              const level1Options = (categories ?? []).filter((c) => c.level === 1 && c.active)
              const level2Options = (categories ?? []).filter((c) => c.level === 2 && c.active && c.parent_id === cat1)
              const level3Options = (categories ?? []).filter((c) => c.level === 3 && c.active && c.parent_id === cat2)

              return (
                <div key={field.id} className="flex flex-col gap-3 rounded-input border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Artículo {index + 1}</span>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar artículo" onClick={() => remove(index)}>
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground">Nombre</label>
                      <input className={inputClass} {...register(`lines.${index}.name`)} />
                      {errors.lines?.[index]?.name && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.name?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Categoría</label>
                      <Controller
                        control={control}
                        name={`lines.${index}.cat1_id`}
                        render={({ field: cat1Field }) => (
                          <Select
                            value={cat1Field.value}
                            onValueChange={(v) => {
                              cat1Field.onChange(v)
                              setValue(`lines.${index}.cat2_id`, '')
                              setValue(`lines.${index}.cat3_id`, '')
                            }}
                          >
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue placeholder="Selecciona…" />
                            </SelectTrigger>
                            <SelectContent>
                              {level1Options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.lines?.[index]?.cat1_id && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.cat1_id?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Subcategoría</label>
                      <Controller
                        control={control}
                        name={`lines.${index}.cat2_id`}
                        render={({ field: cat2Field }) => (
                          <Select
                            value={cat2Field.value}
                            onValueChange={(v) => {
                              cat2Field.onChange(v)
                              setValue(`lines.${index}.cat3_id`, '')
                            }}
                            disabled={!cat1}
                          >
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue placeholder={cat1 ? 'Selecciona…' : 'Elige categoría primero'} />
                            </SelectTrigger>
                            <SelectContent>
                              {level2Options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.lines?.[index]?.cat2_id && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.cat2_id?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Categoría final</label>
                      <Controller
                        control={control}
                        name={`lines.${index}.cat3_id`}
                        render={({ field: cat3Field }) => (
                          <Select value={cat3Field.value} onValueChange={cat3Field.onChange} disabled={!cat2}>
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue placeholder={cat2 ? 'Selecciona…' : 'Elige subcategoría primero'} />
                            </SelectTrigger>
                            <SelectContent>
                              {level3Options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.lines?.[index]?.cat3_id && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.cat3_id?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Costo unitario</label>
                      <Controller
                        control={control}
                        name={`lines.${index}.unit_cost`}
                        render={({ field: costField }) => <MoneyInput className="mt-1" value={costField.value} onChange={costField.onChange} />}
                      />
                      {errors.lines?.[index]?.unit_cost && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.unit_cost?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Cantidad</label>
                      <input type="number" min={1} className={inputClass} {...register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground">Descripción (opcional)</label>
                      <input className={inputClass} {...register(`lines.${index}.description`)} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-card shadow-card">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas (opcional)
          </label>
          <textarea id="notes" rows={2} className={inputClass} {...register('notes')} />
        </section>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Costo total estimado <Money value={totalCost} className="font-medium text-foreground" />
          </p>
          <Button type="submit" disabled={createEntry.isPending} className="w-full rounded-pill sm:w-auto">
            {createEntry.isPending ? 'Registrando…' : 'Registrar ingreso'}
          </Button>
        </div>
      </form>

      <AppDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="¿Descartar el ingreso?"
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
