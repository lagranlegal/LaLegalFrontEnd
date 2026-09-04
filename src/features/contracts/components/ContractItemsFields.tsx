import { Controller, useFieldArray, type ArrayPath, type Control, type FieldErrors, type FieldPath, type FieldValues, type UseFormRegister } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { categoryLabel, emptyContractItem, type ContractItemFormValue } from '@/features/contracts/contractItemSchema'
import type { Category } from '@/lib/catalogs/categories'

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground'

/**
 * Sección "Prendas" compartida entre `ContractFormPage` y `ContractImportPage`
 * (paso 5b) — mismo array de `ContractItemIn` en ambos formularios. Genérico
 * sobre `TFieldValues` para no duplicar ~80 líneas de JSX entre los dos.
 */
export function ContractItemsFields<TFieldValues extends FieldValues & { items: ContractItemFormValue[] }>({
  control,
  register,
  errors,
  categories,
}: {
  control: Control<TFieldValues>
  register: UseFormRegister<TFieldValues>
  errors: FieldErrors<TFieldValues>
  categories: Category[] | undefined
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'items' as ArrayPath<TFieldValues> })
  const pawnCategories = (categories ?? []).filter((c) => c.level === 3 && c.active && (c.applies_to === 'pawn' || c.applies_to === 'both'))
  const itemErrors = errors.items as FieldErrors<ContractItemFormValue>[] | undefined

  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Prendas</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => append(emptyContractItem() as never)}>
          <Plus className="size-4" /> Agregar prenda
        </Button>
      </div>
      {errors.items?.message && typeof errors.items.message === 'string' && <p className="text-sm text-danger">{errors.items.message}</p>}

      <div className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-3 rounded-input border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Prenda {index + 1}</span>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar prenda" onClick={() => remove(index)}>
                  <Trash2 className="size-4 text-danger" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground">Categoría</label>
                <Controller
                  control={control}
                  name={`items.${index}.category_id` as FieldPath<TFieldValues>}
                  render={({ field: categoryField }) => (
                    <Select value={categoryField.value} onValueChange={categoryField.onChange}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue placeholder="Selecciona…" />
                      </SelectTrigger>
                      <SelectContent>
                        {pawnCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {categoryLabel(categories ?? [], category.id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {pawnCategories.length === 0 && <p className="mt-1 text-xs text-muted-foreground">No hay categorías de nivel 3 para empeño todavía — créalas en Catálogos.</p>}
                {itemErrors?.[index]?.category_id && <p className="mt-1 text-sm text-danger">{itemErrors[index]?.category_id?.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Descripción</label>
                <input className={inputClass} {...register(`items.${index}.description` as FieldPath<TFieldValues>)} />
                {itemErrors?.[index]?.description && <p className="mt-1 text-sm text-danger">{itemErrors[index]?.description?.message}</p>}
              </div>
              {/* Los tres campos de abajo NO mostraban su error. Daba igual
                  mientras nadie los marcara, pero el backend sí: un peso con
                  coma ("10,5") devuelve un 422 sobre `weight_grams`, y sin
                  este `<p>` ese error se marcaba en un campo mudo — el
                  formulario volvía a su estado inicial sin decir nada.
                  "Opcional" es sobre llenarlo, no sobre llenarlo mal. */}
              <div>
                <label className="text-sm font-medium text-foreground">Peso (gramos, opcional)</label>
                <input inputMode="decimal" className={inputClass} {...register(`items.${index}.weight_grams` as FieldPath<TFieldValues>)} />
                {itemErrors?.[index]?.weight_grams && <p className="mt-1 text-sm text-danger">{itemErrors[index]?.weight_grams?.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Serial / IMEI (opcional)</label>
                <input className={inputClass} {...register(`items.${index}.serial_imei` as FieldPath<TFieldValues>)} />
                {itemErrors?.[index]?.serial_imei && <p className="mt-1 text-sm text-danger">{itemErrors[index]?.serial_imei?.message}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Avalúo de la prenda (opcional)</label>
                <Controller
                  control={control}
                  name={`items.${index}.item_appraisal` as FieldPath<TFieldValues>}
                  render={({ field: appraisalField }) => <MoneyInput className="mt-1" value={appraisalField.value ?? ''} onChange={appraisalField.onChange} />}
                />
                {itemErrors?.[index]?.item_appraisal && <p className="mt-1 text-sm text-danger">{itemErrors[index]?.item_appraisal?.message}</p>}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Fotos (constancia del estado de la prenda)</label>
              <Controller
                control={control}
                name={`items.${index}.photos` as FieldPath<TFieldValues>}
                render={({ field: photosField }) => (
                  <div className="mt-1">
                    <PhotoUploader
                      value={photosField.value as string[]}
                      onChange={photosField.onChange}
                      folder={`contract-items/${field.id}`}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
