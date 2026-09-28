import { z } from 'zod'
import { normalizeDecimalInput } from '@/lib/money'

/**
 * Reglas de forma que el backend exige con 422 desde la auditoría 27/09/2026
 * (`app/common/money.py`, `app/common/text.py`, `catalogs/schemas.py`). Se
 * repiten acá para que el error aparezca junto al campo ANTES de enviar; el
 * backend sigue siendo la autoridad y su 422 se pinta igual
 * (`applyServerErrors`). Un solo lugar para no tener seis versiones de
 * "mayor a cero" que diverjan.
 */

/** Decimales escritos (`"10.555"` → 3). Con coma o punto. */
export function decimalPlaces(value: string): number {
  const [, fraction = ''] = normalizeDecimalInput(value.trim()).split('.')
  return fraction.length
}

const DECIMAL = /^-?\d+(\.\d+)?$/

/**
 * Por qué un monto que TIENE que mover plata no sirve, o `null`.
 * `PositiveMoney`: mayor que cero y hasta dos decimales. `MoneyInput` ya
 * emite dos decimales, así que en la práctica lo que se ataja es el cero.
 */
export function positiveMoneyError(value: string | null | undefined, emptyMessage = 'El monto debe ser mayor a cero'): string | null {
  const v = normalizeDecimalInput((value ?? '').trim())
  if (!DECIMAL.test(v) || Number(v) <= 0) return emptyMessage
  if (decimalPlaces(v) > 2) return 'Máximo 2 decimales.'
  return null
}

/** `PositiveMoney` como campo de Zod. */
export function positiveMoneyField(message: string) {
  return z.string().superRefine((v, ctx) => {
    const error = positiveMoneyError(v, message)
    if (error) ctx.addIssue({ code: 'custom', message: error })
  })
}

/**
 * Por qué una cantidad de inventario no sirve, o `null`. `Quantity`: mayor
 * que cero y hasta TRES decimales, los de `numeric(14,3)`. Acepta coma.
 */
export function quantityError(value: string | null | undefined): string | null {
  const v = normalizeDecimalInput((value ?? '').trim())
  if (!DECIMAL.test(v) || Number(v) <= 0) return 'La cantidad debe ser mayor a cero'
  if (decimalPlaces(v) > 3) return 'La cantidad admite máximo 3 decimales.'
  return null
}

/** `Quantity` como campo de Zod: normaliza la coma y valida lo que viaja. */
export const quantityField = z
  .string()
  .transform((v) => normalizeDecimalInput(v.trim()))
  .superRefine((v, ctx) => {
    const error = quantityError(v)
    if (error) ctx.addIssue({ code: 'custom', message: error })
  })

/**
 * `Reason`: el motivo de una acción auditada se recorta y tiene que quedar
 * algo. `min(1)` solo no alcanza: `" "` lo cumple y el backend lo rechaza.
 */
export function reasonField(message: string) {
  return z.string().trim().min(1, message)
}

/** ¿El motivo quedaría vacío después de recortarlo? */
export function isBlankReason(value: string | null | undefined): boolean {
  return !(value ?? '').trim()
}

/**
 * Plazo o ventana de mora de una categoría (`TermMonths`): vacío = hereda
 * del padre; si se escribe, un entero de al menos 1.
 */
export const termMonthsField = z
  .string()
  .optional()
  .refine((v) => !v?.trim() || /^\d+$/.test(v.trim()), 'Escribe un número entero de meses.')
  .refine((v) => !v?.trim() || Number(v) >= 1, 'Tiene que ser al menos 1 mes.')

/**
 * LTV máximo de una categoría (`LtvPct`): vacío = hereda; si se escribe,
 * mayor que 0, hasta 100 % y con máximo dos decimales.
 */
export const ltvPctField = z
  .string()
  .optional()
  .refine((v) => {
    if (!v?.trim()) return true
    const n = normalizeDecimalInput(v.trim())
    return DECIMAL.test(n) && Number(n) > 0 && Number(n) <= 100
  }, 'El LTV tiene que ser mayor que 0 y hasta 100 %.')
  .refine((v) => !v?.trim() || decimalPlaces(v) <= 2, 'Máximo 2 decimales.')
