import { z } from 'zod'

/**
 * Compartido entre `ContractFormPage` (crear) y `ContractImportPage` (paso
 * 5b) — ambos arman el mismo array de prendas (`ContractItemIn`), solo
 * cambian los campos alrededor. Vive fuera de `components/` porque no es
 * JSX: el schema y el tipo los necesita también quien arma el body del
 * request.
 */
export const contractItemSchema = z.object({
  category_id: z.string().min(1, 'Selecciona una categoría'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  weight_grams: z.string().optional(),
  serial_imei: z.string().optional(),
  item_appraisal: z.string().optional(),
})

export type ContractItemFormValue = z.infer<typeof contractItemSchema>

export function emptyContractItem(): ContractItemFormValue {
  return { category_id: '', description: '', weight_grams: '', serial_imei: '', item_appraisal: '' }
}

/** Categorías nivel 3 (hoja) para "empeño" — CLAUDE.md paso 5: solo esas se ofrecen para clasificar prendas. */
export function categoryLabel(categories: { id: string; name: string; parent_id: string | null }[], categoryId: string): string {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const category = byId.get(categoryId)
  if (!category) return ''
  const parts = [category.name]
  let parentId = category.parent_id
  while (parentId) {
    const parent = byId.get(parentId)
    if (!parent) break
    parts.unshift(parent.name)
    parentId = parent.parent_id
  }
  return parts.join(' / ')
}
