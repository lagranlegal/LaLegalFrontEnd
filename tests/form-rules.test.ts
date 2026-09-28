import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ltvPctField, positiveMoneyField, quantityField, reasonField, termMonthsField } from '@/lib/forms/rules'
import { entryLineSchema } from '@/features/inventory/entryLineSchema'

/**
 * Validaciones que el backend endureció en la auditoría 27/09/2026 (commits
 * c982b91 y f711858; `app/common/money.py`, `app/common/text.py`,
 * `catalogs/schemas.py`). Cada una responde 422: acá se atajan ANTES de
 * enviar, con el mensaje junto al campo. Los casos son los mismos que
 * `tests/integration/test_validacion_entrada.py` del backend manda y ve
 * rechazados: `0`, `0.001`, `10.555`, `-1`; `1.0001` en cantidad; `""` y
 * `"   "` en motivos; LTV `0`, `-5`, `1000`; plazo `0` y `-1`.
 */
const ok = (schema: z.ZodType, v: unknown) => schema.safeParse(v).success

describe('montos que mueven plata (PositiveMoney)', () => {
  const monto = positiveMoneyField('El monto debe ser mayor a cero')
  it.each(['0', '0.00', '0.001', '10.555', '-1', ''])('rechaza %j', (v) => expect(ok(monto, v)).toBe(false))
  it.each(['1', '10.55', '1000000.00'])('acepta %j', (v) => expect(ok(monto, v)).toBe(true))
})

describe('cantidades (Quantity, hasta 3 decimales)', () => {
  it.each(['1.0001', '0', '-1', 'abc'])('rechaza %j', (v) => expect(ok(quantityField, v)).toBe(false))
  it.each(['1', '12.5', '1,125', '0.001'])('acepta %j', (v) => expect(ok(quantityField, v)).toBe(true))

  it('la línea de ingreso usa la misma regla', () => {
    const linea = {
      name: 'Oro',
      cat1_id: 'a',
      cat2_id: 'b',
      cat3_id: 'c',
      unit_cost: '1000.00',
      quantity: '1,0001',
      unit: 'gram' as const,
    }
    const r = entryLineSchema.safeParse(linea)
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toMatch(/3 decimales/)
  })
})

describe('motivos (Reason: se recorta y tiene que quedar algo)', () => {
  const motivo = reasonField('El motivo es obligatorio')
  it.each(['', '   '])('rechaza %j', (v) => expect(ok(motivo, v)).toBe(false))
  it('recorta lo que viaja', () => expect(motivo.parse('  papelería ')).toBe('papelería'))
})

describe('parámetros de categoría', () => {
  it.each(['0', '-5', '1000', '100.5', '10.555'])('LTV %j se rechaza', (v) => expect(ok(ltvPctField, v)).toBe(false))
  it.each(['', undefined, '70', '100', '70,5'])('LTV %j se acepta (vacío = hereda)', (v) => expect(ok(ltvPctField, v)).toBe(true))
  it.each(['0', '-1', '1.5'])('plazo %j se rechaza', (v) => expect(ok(termMonthsField, v)).toBe(false))
  it.each(['', undefined, '1', '4'])('plazo %j se acepta', (v) => expect(ok(termMonthsField, v)).toBe(true))
})
