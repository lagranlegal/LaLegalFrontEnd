import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { ApiError } from '@/lib/api/client'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { MODULE_LABELS } from '@/lib/modules'
import { useCreateExpense, useCreateExpenseCategory, useExpenseCategories } from '@/features/cashbox/api'

const expenseSchema = z.object({
  category_id: z.string().min(1, 'Selecciona una categoría'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  amount: z.string().refine((v) => Number(v) > 0, 'El monto debe ser mayor a cero'),
  payment_method: z.enum(['cash', 'transfer', 'other']),
  account_id: z.string().nullable(),
  module: z.enum(['pawn', 'store', 'general']),
  receipt: z.array(z.string()),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

function ExpenseCategoryField({ value, onChange }: { value: string; onChange: (categoryId: string) => void }) {
  const { data: categories } = useExpenseCategories()
  const createCategory = useCreateExpenseCategory()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  async function handleCreate() {
    if (!newName.trim()) return
    const category = await createCategory.mutateAsync({ name: newName.trim() })
    onChange(category.id)
    setNewName('')
    setCreating(false)
  }

  if (creating) {
    return (
      <div className="mt-1 flex gap-2">
        <input autoFocus className={inputClass + ' mt-0'} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de la categoría" />
        <Button type="button" size="sm" onClick={handleCreate} disabled={createCategory.isPending}>
          Agregar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setCreating(false)}>
          Cancelar
        </Button>
      </div>
    )
  }

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v === '__new__') setCreating(true)
        else onChange(v)
      }}
    >
      <SelectTrigger className="mt-1 w-full">
        <SelectValue placeholder="Selecciona…" />
      </SelectTrigger>
      <SelectContent>
        {categories
          ?.filter((c) => c.active)
          .map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        <SelectItem value="__new__">+ Nueva categoría…</SelectItem>
      </SelectContent>
    </Select>
  )
}

/**
 * "+ Nuevo gasto" (CLAUDE.md paso 6). Sin `Idempotency-Key` — el endpoint no
 * la acepta (ver `features/cashbox/api.ts`) — el botón deshabilitado
 * mientras está en vuelo es la única protección contra doble submit que el
 * front puede dar acá.
 */
export function ExpenseFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  // Un gasto no tiene id hasta creado — un id temporal por apertura del
  // diálogo alcanza para la carpeta de Storage (mismo criterio que
  // `CustomerFormDialog` al crear).
  const [draftId] = useState(() => crypto.randomUUID())
  const createExpense = useCreateExpense()
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category_id: '', description: '', amount: '0.00', payment_method: 'cash', account_id: null, module: 'general', receipt: [] },
  })

  // `useWatch` y no `watch()`: este último devuelve una función que el React
  // Compiler no puede memoizar (ver el warning de EntryFormPage).
  const selectedMethod = useWatch({ control, name: 'payment_method' })

  async function onSubmit(values: ExpenseFormValues) {
    setFormError(null)
    try {
      const { receipt, ...rest } = values
      await createExpense.mutateAsync({ ...rest, receipt_url: receipt[0] ?? null })
      toast.success('Gasto registrado')
      onOpenChange(false)
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
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Nuevo gasto"
        footer={
          <Button form="expense-form" type="submit" disabled={createExpense.isPending} className="w-full rounded-pill">
            {createExpense.isPending ? 'Registrando…' : 'Registrar gasto'}
          </Button>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="text-sm font-medium text-foreground">Categoría</label>
            <Controller control={control} name="category_id" render={({ field }) => <ExpenseCategoryField value={field.value} onChange={field.onChange} />} />
            {errors.category_id && <p className="mt-1 text-sm text-danger">{errors.category_id.message}</p>}
          </div>
          <div>
            <label htmlFor="expense-description" className="text-sm font-medium text-foreground">
              Descripción
            </label>
            <input id="expense-description" className={inputClass} {...register('description')} />
            {errors.description && <p className="mt-1 text-sm text-danger">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="expense-amount" className="text-sm font-medium text-foreground">
                Monto
              </label>
              <Controller control={control} name="amount" render={({ field }) => <MoneyInput id="expense-amount" className="mt-1" value={field.value} onChange={field.onChange} autoFocus />} />
              {errors.amount && <p className="mt-1 text-sm text-danger">{errors.amount.message}</p>}
            </div>
            <div>
              <label htmlFor="expense-method" className="text-sm font-medium text-foreground">
                Medio de pago
              </label>
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="expense-method" className="mt-1 w-full">
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
          </div>
          {/* De qué cuenta salió: un gasto pagado por transferencia no toca
              el cajón, y contarlo ahí dejaba el arqueo descuadrado. */}
          <div>
            <label htmlFor="expense-account" className="text-sm font-medium text-foreground">
              ¿De dónde sale?
            </label>
            <Controller
              control={control}
              name="account_id"
              render={({ field }) => (
                <AccountPicker id="expense-account" paymentMethod={selectedMethod} value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          <div>
            <label htmlFor="expense-module" className="text-sm font-medium text-foreground">
              Módulo
            </label>
            <Controller
              control={control}
              name="module"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="expense-module" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODULE_LABELS).map(([value, label]) => (
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
            <label className="text-sm font-medium text-foreground">Comprobante (opcional)</label>
            <Controller
              control={control}
              name="receipt"
              render={({ field }) => (
                <div className="mt-1">
                  <PhotoUploader value={field.value} onChange={field.onChange} folder={`expenses/${draftId}`} maxPhotos={1} />
                </div>
              )}
            />
          </div>
          {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
        </form>
      </AppDialog>
      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </>
  )
}
