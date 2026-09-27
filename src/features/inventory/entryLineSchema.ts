import { z } from 'zod'
import { normalizeDecimalInput } from '@/lib/money'

/**
 * Una línea del formulario de ingreso. Vive aparte de `EntryFormPage` para
 * poder probarla sin montar la página entera.
 */
export const entryLineSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  cat1_id: z.string().min(1, 'Selecciona una categoría'),
  cat2_id: z.string().min(1, 'Selecciona una subcategoría'),
  cat3_id: z.string().min(1, 'Selecciona la categoría final'),
  description: z.string().optional(),
  unit_cost: z.string().refine((v) => Number(v) > 0, 'El costo debe ser mayor a cero'),
  // Texto y no número: desde 00036 la cantidad puede tener decimales (12,5 g)
  // y un `<input type=number>` con `valueAsNumber` pierde el valor a medio
  // escribir ("12," es NaN). Se valida como cadena.
  //
  // Con la coma normalizada ANTES de validar (QA QTY-coma): "1,5" daba
  // `Number` NaN y el mensaje decía "debe ser mayor a cero", que es falso. El
  // `transform` hace que lo validado sea exactamente lo que viaja — el
  // formulario recibe "1.5" en `onSubmit`, igual que el peso del contrato.
  quantity: z
    .string()
    .transform((v) => normalizeDecimalInput(v.trim()))
    .refine((v) => Number(v) > 0, 'La cantidad debe ser mayor a cero'),
  unit: z.enum(['unit', 'gram', 'kilogram', 'meter', 'liter']),
  // `true` cuando la línea salió del buscador de productos, o sea que el
  // producto YA EXISTE. Su unidad manda y el backend ignora la que mandemos,
  // así que el selector no puede fingir que se puede elegir.
  from_existing_product: z.boolean().optional(),
  // Opcionales: sin ellos el lote entra en borrador, que sigue siendo válido.
  // Con los dos, el backend lo publica solo y queda listo para vender.
  sale_price: z.string().optional(),
  photos: z.array(z.string()).optional(),
})
