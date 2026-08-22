import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useCreateCategory, useUpdateCategory } from '@/features/catalogs/api'
import type { Category } from '@/features/catalogs/tree'

const APPLIES_TO_LABELS: Record<string, string> = { pawn: 'Empeño', store: 'Tienda', both: 'Ambos' }

import { resolveInheritedParams } from '@/features/catalogs/inheritance'
import { useCategories } from '@/lib/catalogs/categories'

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  code_letter: z
    .string()
    .min(1, 'La letra es obligatoria')
    .max(1, 'Una sola letra')
    .transform((v) => v.toUpperCase()),
  applies_to: z.enum(['pawn', 'store', 'both']),
  // Solo importan de verdad en categorías nivel 3 (las que se usan al armar
  // un contrato) — el backend rechaza `POST /contracts` con BAD_REQUEST si
  // la categoría de la prenda no las tiene configuradas. Se piden en
  // cualquier nivel igual: no sabemos el nivel hasta guardar (lo calcula el
  // backend a partir del padre), y no cuesta nada tenerlas de una vez.
  default_term_months: z.string().optional(),
  arrears_window_months: z.string().optional(),
  max_ltv_pct: z.string().optional(),
  active: z.boolean(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * El caller debe montar este componente con una `key` que cambie en CADA
 * apertura (un nonce que se incrementa al abrir, no solo `category?.id` —
 * dos "crear" seguidos también deben limpiar el draft) — así el form
 * arranca limpio siempre, sin un `useEffect` sincronizando `reset()`.
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  parentId,
  category,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Nivel del padre elegido en el árbol al pulsar "+ Subcategoría" — `undefined` crea una categoría raíz (nivel 1). */
  parentId?: string
  category?: Category
}) {
  const mode = category ? 'edit' : 'create'
  const { data: allCategories } = useCategories()
  const [formError, setFormError] = useState<string | null>(null)
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          code_letter: category.code_letter,
          applies_to: category.applies_to as CategoryFormValues['applies_to'],
          default_term_months: category.default_term_months != null ? String(category.default_term_months) : '',
          arrears_window_months: category.arrears_window_months != null ? String(category.arrears_window_months) : '',
          max_ltv_pct: category.max_ltv_pct ?? '',
          active: category.active,
        }
      : { name: '', code_letter: '', applies_to: 'both', default_term_months: '', arrears_window_months: '', max_ltv_pct: '', active: true },
  })

  // Al editar, la herencia se mide desde el PADRE de esta categoría — no
  // desde ella misma, o se heredaría a sí misma y el placeholder repetiría
  // el valor ya escrito.
  const heredado = resolveInheritedParams(allCategories ?? [], category ? (category.parent_id ?? undefined) : parentId)
  const hayHerencia = heredado.default_term_months != null || heredado.arrears_window_months != null || heredado.max_ltv_pct != null
  // Falta de verdad solo si NADIE en la rama lo define y esta categoría
  // tampoco lo está definiendo ahora mismo.
  const faltaEnLaRama =
    (heredado.default_term_months == null && !watch('default_term_months')) ||
    (heredado.arrears_window_months == null && !watch('arrears_window_months'))

  async function onSubmit(values: CategoryFormValues) {
    setFormError(null)
    const body = {
      ...values,
      default_term_months: values.default_term_months ? Number(values.default_term_months) : null,
      arrears_window_months: values.arrears_window_months ? Number(values.arrears_window_months) : null,
      max_ltv_pct: values.max_ltv_pct || null,
    }
    try {
      if (mode === 'create') {
        await createCategory.mutateAsync({ ...body, parent_id: parentId ?? null })
      } else if (category) {
        await updateCategory.mutateAsync({ categoryId: category.id, body })
      }
      onOpenChange(false)
    } catch (error) {
      const banner = applyServerErrors(error, setError, {
        conflictField: 'code_letter',
        conflictMessage: 'Ya existe una categoría con esa letra de código.',
      })
      if (banner) setFormError(banner)
    }
  }

  const isPending = createCategory.isPending || updateCategory.isPending

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'create' ? 'Nueva categoría' : 'Editar categoría'}
      footer={
        <Button form="category-form" type="submit" disabled={isPending} className="w-full rounded-pill">
          {isPending ? 'Guardando…' : mode === 'create' ? 'Crear categoría' : 'Guardar cambios'}
        </Button>
      }
    >
      <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="cat-name" className="text-sm font-medium text-foreground">
            Nombre
          </label>
          <input id="cat-name" className={inputClass} {...register('name')} />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cat-code" className="text-sm font-medium text-foreground">
              Letra de código
            </label>
            <input id="cat-code" maxLength={1} className={`${inputClass} uppercase`} {...register('code_letter')} />
            {errors.code_letter && <p className="mt-1 text-sm text-danger">{errors.code_letter.message}</p>}
          </div>
          <div>
            <label htmlFor="cat-applies" className="text-sm font-medium text-foreground">
              Aplica a
            </label>
            <Controller
              control={control}
              name="applies_to"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cat-applies" className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(APPLIES_TO_LABELS).map(([value, label]) => (
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

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="cat-term" className="text-sm font-medium text-foreground">
              Plazo (meses)
            </label>
            {/* El placeholder muestra lo HEREDADO: dejar el campo vacío ya no
                es un hueco sin explicación, es "usa el del padre". */}
            <input
              id="cat-term"
              inputMode="numeric"
              className={inputClass}
              placeholder={heredado.default_term_months != null ? `${heredado.default_term_months} (heredado)` : undefined}
              {...register('default_term_months')}
            />
          </div>
          <div>
            <label htmlFor="cat-arrears" className="text-sm font-medium text-foreground">
              Ventana de mora (meses)
            </label>
            <input
              id="cat-arrears"
              inputMode="numeric"
              className={inputClass}
              placeholder={heredado.arrears_window_months != null ? `${heredado.arrears_window_months} (heredado)` : undefined}
              {...register('arrears_window_months')}
            />
          </div>
          <div>
            <label htmlFor="cat-ltv" className="text-sm font-medium text-foreground">
              LTV máximo (%)
            </label>
            <input
              id="cat-ltv"
              inputMode="decimal"
              className={inputClass}
              placeholder={heredado.max_ltv_pct != null ? `${heredado.max_ltv_pct} (heredado)` : undefined}
              {...register('max_ltv_pct')}
            />
          </div>
        </div>

        {/* Tres mensajes distintos según lo que de verdad pasa, en vez del
            "obligatorios para nivel 3" de antes — que era falso desde que los
            parámetros se heredan, y encima no decía de dónde. */}
        {faltaEnLaRama ? (
          <p className="-mt-2 rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">
            Ni esta categoría ni sus categorías padre tienen plazo y ventana de mora. Sin eso no se podrá crear ningún contrato con
            prendas de esta rama — configúralos acá o en una categoría superior.
          </p>
        ) : hayHerencia ? (
          <p className="-mt-2 text-xs text-muted-foreground">
            Déjalos vacíos para heredar de las categorías superiores. Lo que escribas acá manda solo para esta categoría y las suyas.
          </p>
        ) : (
          <p className="-mt-2 text-xs text-muted-foreground">
            Se heredan hacia abajo: lo que pongas acá lo usan todas las categorías que cuelguen de esta, salvo que definan lo suyo.
          </p>
        )}

        {mode === 'edit' && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="size-4 rounded border-border" {...register('active')} />
            Activa
          </label>
        )}

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
