import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * El campo de texto único (issue #4, F9-26). Había 27 copias locales de
 * `inputClass` y cada formulario resolvía por su cuenta el foco, el error y la
 * etiqueta. Acá quedan una vez:
 *
 * - **Foco**: el anillo sólido de 2 px en `--color-ring` lo pone `globals.css`
 *   para todo `input`/`textarea`/`select` (≥ 3:1 sobre los dos fondos, medido
 *   en `tests/token-contrast.test.ts`). La clase no lo repite: con dos fuentes
 *   para el mismo anillo, la segunda deriva.
 * - **Error**: con `invalid` y un `id`, el campo lleva `aria-invalid` (borde de
 *   peligro, `globals.css`) y `aria-describedby` al mensaje de `<FieldError>`
 *   del mismo `id`: el lector de pantalla dice «inválido» **y por qué**.
 * - **Etiqueta**: el `id` es obligatorio a propósito; sin él no hay `<label
 *   htmlFor>` que lo nombre ni mensaje de error que enlazar.
 *
 * React 19: `ref` es una prop, y `{...register('x')}` la pasa tal cual, así
 * que React Hook Form puede llevar el foco al primer error.
 */
/*
 * Rediseño P1 (§4 «Campo»): radio 10, 44 px de alto, fondo de superficie y el
 * borde de CONTROLES (`--border-strong`), que se distingue del de una card.
 * Al enfocar, el borde toma el color de foco y `globals.css` suma el anillo
 * de 2 px. Texto de 16 px en el celular (iOS no hace zoom al enfocar) y 14 en
 * escritorio.
 */
const FIELD_CLASS =
  'mt-1 min-h-11 w-full rounded-input border border-border-strong bg-card px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring disabled:bg-muted disabled:text-muted-foreground sm:text-sm'

/** El `id` del mensaje de error de un campo: lo que enlaza `aria-describedby`. */
export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`
}

/** `aria-invalid` + `aria-describedby` de un campo con error; nada sin él. */
export function invalidFieldProps(fieldId: string | undefined, invalid: boolean | undefined) {
  if (!invalid) return {}
  return { 'aria-invalid': true as const, 'aria-describedby': fieldId ? fieldErrorId(fieldId) : undefined }
}

type FieldProps = { id: string; invalid?: boolean }

export function Input({ id, invalid, className, ...props }: Omit<ComponentProps<'input'>, 'id'> & FieldProps) {
  return <input id={id} className={cn(FIELD_CLASS, className)} {...invalidFieldProps(id, invalid)} {...props} />
}

export function Textarea({ id, invalid, className, rows = 2, ...props }: Omit<ComponentProps<'textarea'>, 'id'> & FieldProps) {
  return <textarea id={id} rows={rows} className={cn(FIELD_CLASS, className)} {...invalidFieldProps(id, invalid)} {...props} />
}

/**
 * El mensaje de error bajo un campo, con el `id` que el campo enlaza. Sin
 * mensaje no pinta nada. `fieldId` es el `id` del campo, no el del mensaje.
 */
export function FieldError({ fieldId, children, className }: { fieldId: string; children?: ReactNode; className?: string }) {
  if (!children) return null
  return (
    <p id={fieldErrorId(fieldId)} className={cn('mt-1 text-sm text-danger', className)}>
      {children}
    </p>
  )
}
