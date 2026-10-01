import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ltvPctField, termMonthsField } from '@/lib/forms/rules'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { FieldError, Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { formatCOP, normalizeDecimalInput } from '@/lib/money'
import { useCreateCategory, useUpdateCategory } from '@/features/catalogs/api'
import type { Category } from '@/features/catalogs/tree'

const APPLIES_TO_LABELS: Record<string, string> = { pawn: 'Empeño', store: 'Tienda', both: 'Ambos' }

/** Prenda de referencia del ejemplo de LTV. Un millón redondo: la cuenta se
 *  hace de cabeza y el porcentaje se lee solo. */
const LTV_PRENDA_EJEMPLO = 1_000_000

import { resolveInheritedParams } from '@/features/catalogs/inheritance'
import { useCategories } from '@/lib/catalogs/categories'
import { formatPercent } from '@/lib/percent'

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  // 1 a 3 letras, igual que el backend (`CodeLetter` en catalogs/schemas.py) y
  // que el `check (char_length between 1 and 3)` de la migración 00004. Este
  // formulario lo limitaba a UNA sola por su cuenta, cerrando un margen que el
  // modelo ya tenía abierto — ver la nota en el input de abajo.
  code_letter: z
    .string()
    .min(1, 'La letra es obligatoria')
    .max(3, 'Máximo 3 letras')
    .regex(/^[A-Za-z]+$/, 'Solo letras de la A a la Z')
    .transform((v) => v.toUpperCase()),
  applies_to: z.enum(['pawn', 'store', 'both']),
  // Solo importan de verdad en categorías nivel 3 (las que se usan al armar
  // un contrato) — el backend rechaza `POST /contracts` con BAD_REQUEST si
  // la categoría de la prenda no las tiene configuradas. Se piden en
  // cualquier nivel igual: no sabemos el nivel hasta guardar (lo calcula el
  // backend a partir del padre), y no cuesta nada tenerlas de una vez.
  // Rangos del backend desde el 27/09/2026 (`TermMonths`, `LtvPct`): vacío
  // hereda del padre; escrito, plazo y ventana ≥ 1 y LTV en (0, 100].
  default_term_months: termMonthsField,
  arrears_window_months: termMonthsField,
  max_ltv_pct: ltvPctField,
  active: z.boolean(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

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
  // El LTV que va a REGIR: lo que se está escribiendo, o lo heredado si el
  // campo está vacío. Mismo criterio que el placeholder de al lado.
  const ltvEscrito = watch('max_ltv_pct')
  const ltvVigente = ltvEscrito || heredado.max_ltv_pct
  const ltvNumero = ltvVigente != null ? Number(normalizeDecimalInput(String(ltvVigente))) : NaN
  const ltvEjemplo =
    Number.isFinite(ltvNumero) && ltvNumero > 0
      ? { pct: ltvVigente, maximo: Math.round((LTV_PRENDA_EJEMPLO * ltvNumero) / 100) }
      : null

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
      max_ltv_pct: values.max_ltv_pct?.trim() ? normalizeDecimalInput(values.max_ltv_pct.trim()) : null,
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
        fields: ['name', 'code_letter', 'default_term_months', 'arrears_window_months', 'max_ltv_pct'],
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
        <div className="flex w-full gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button form="category-form" type="submit" disabled={isPending} className="flex-1">
            {isPending ? 'Guardando…' : mode === 'create' ? 'Crear categoría' : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="cat-name" className="text-sm font-medium text-foreground">
            Nombre
          </label>
          <Input id="cat-name" invalid={!!errors.name} {...register('name')} />
          <FieldError fieldId="cat-name">{errors.name?.message}</FieldError>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
          <div>
            <label htmlFor="cat-code" className="text-sm font-medium text-foreground">
              Letra de código
            </label>
            {/* En categorías la letra solo tiene que ser única entre HERMANAS
                (`unique (company_id, parent_id, code_letter)`), así que una
                sola letra alcanza de sobra: nadie cuelga 26 subcategorías del
                mismo padre. Se admiten hasta 3 igual, por consistencia con
                proveedores —donde sí hacía falta— y porque el modelo ya lo
                soportaba. */}
            <Input id="cat-code" invalid={!!errors.code_letter} maxLength={3} className="uppercase" {...register('code_letter')} />
            <p className="mt-1 text-xs text-muted-foreground">1 a 3 letras. Forma el código: {'{Nivel1}{Nivel2}{Nivel3}'}0001</p>
            <FieldError fieldId="cat-code">{errors.code_letter?.message}</FieldError>
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

        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
          <div>
            <label htmlFor="cat-term" className="text-sm font-medium text-foreground">
              Plazo (meses)
            </label>
            {/* El placeholder muestra lo HEREDADO: dejar el campo vacío ya no
                es un hueco sin explicación, es "usa el del padre". */}
            <Input
              id="cat-term"
              invalid={!!errors.default_term_months}
              inputMode="numeric"
              placeholder={heredado.default_term_months != null ? `${heredado.default_term_months} (heredado)` : undefined}
              {...register('default_term_months')}
            />
            <FieldError fieldId="cat-term" className="text-xs">{errors.default_term_months?.message}</FieldError>
          </div>
          <div>
            <label htmlFor="cat-arrears" className="text-sm font-medium text-foreground">
              Ventana de mora (meses)
            </label>
            <Input
              id="cat-arrears"
              invalid={!!errors.arrears_window_months}
              inputMode="numeric"
              placeholder={heredado.arrears_window_months != null ? `${heredado.arrears_window_months} (heredado)` : undefined}
              {...register('arrears_window_months')}
            />
            <FieldError fieldId="cat-arrears" className="text-xs">{errors.arrears_window_months?.message}</FieldError>
          </div>
          <div>
            <label htmlFor="cat-ltv" className="text-sm font-medium text-foreground">
              LTV máximo (%)
            </label>
            <Input
              id="cat-ltv"
              invalid={!!errors.max_ltv_pct}
              inputMode="decimal"
              placeholder={heredado.max_ltv_pct != null ? `${heredado.max_ltv_pct} (heredado)` : undefined}
              {...register('max_ltv_pct')}
            />
            <FieldError fieldId="cat-ltv" className="text-xs">{errors.max_ltv_pct?.message}</FieldError>
          </div>
        </div>

        {/* "LTV máximo (%)" no le dice nada a quien no conoce la sigla, y el
            campo se prestaba a entenderse al revés. Un ejemplo con plata sobre
            una prenda de un millón lo vuelve inmediato, y se recalcula con lo
            que la persona escribe (o hereda) en vez de ser un texto fijo.
            El caso real que lo motivó: una empresa quedó con LTV 10% en todo
            el árbol, así que casi cualquier préstamo disparaba la alerta y la
            alerta dejó de significar algo. */}
        <p className="-mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">LTV</span> es cuánto se presta sobre el avalúo de la prenda.{' '}
          {ltvEjemplo ? (
            <>
              Con <span className="font-medium text-foreground">{formatPercent(ltvEjemplo.pct ?? '', 'auto')}</span>, sobre una prenda avaluada en{' '}
              {formatCOP(LTV_PRENDA_EJEMPLO)} se presta hasta{' '}
              <span className="font-medium text-foreground">{formatCOP(ltvEjemplo.maximo)}</span>.
            </>
          ) : (
            <>Referencia habitual: oro 70%, plata 60%, tecnología 40%.</>
          )}{' '}
          {/* Decía «solo advierte… nunca lo impide» (G-01): falso desde
              00051, y más desde F4-05 del backend (27/09/2026). Es un tope. */}
          Es un tope: al crear el contrato, pasarse del cupo lo{' '}
          <span className="font-medium text-foreground">bloquea</span> y el avalúo es obligatorio, salvo para quien tenga permiso
          de autorizarlo.
        </p>

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
