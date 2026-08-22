import type { Category } from '@/lib/catalogs/categories'

/** Los tres parámetros que un contrato toma de la categoría de la prenda. */
export interface CategoryParams {
  default_term_months: number | null
  arrears_window_months: number | null
  max_ltv_pct: string | null
}

/**
 * Resuelve qué plazo, ventana y LTV va a heredar una categoría de sus
 * ancestros — espeja `catalogs.resolve_category_params` del backend.
 *
 * Cada campo se resuelve POR SEPARADO y sube hasta el ancestro más cercano
 * que lo defina: una hoja puede heredar el plazo de su padre y el LTV de su
 * abuelo. Copiar en bloque el primer ancestro que tenga *algo* daría un
 * resultado distinto al del backend, y el formulario estaría mintiendo.
 *
 * Existe para que el formulario pueda MOSTRAR lo que se hereda en vez de
 * dejar tres campos vacíos sin explicación. Antes esos campos se pedían en
 * los tres niveles y solo se leían los de la hoja, así que no había forma de
 * saber si dejarlos en blanco era seguro.
 *
 * `null` en un campo significa que nadie en la rama lo definió — y en plazo o
 * ventana eso es un problema real: ningún contrato con esa prenda va a poder
 * crearse.
 */
export function resolveInheritedParams(categories: Category[], startParentId: string | undefined): CategoryParams {
  const result: CategoryParams = { default_term_months: null, arrears_window_months: null, max_ltv_pct: null }
  if (!startParentId) return result

  const byId = new Map(categories.map((c) => [c.id, c]))
  // Tope defensivo: el backend garantiza un árbol de 3 niveles, pero un ciclo
  // por datos corruptos colgaría el navegador — y un formulario congelado es
  // peor que uno que muestra un dato incompleto.
  let current = byId.get(startParentId)
  let guard = 0
  while (current && guard < 10) {
    if (result.default_term_months === null && current.default_term_months != null) {
      result.default_term_months = current.default_term_months
    }
    if (result.arrears_window_months === null && current.arrears_window_months != null) {
      result.arrears_window_months = current.arrears_window_months
    }
    if (result.max_ltv_pct === null && current.max_ltv_pct != null) {
      result.max_ltv_pct = current.max_ltv_pct
    }
    current = current.parent_id ? byId.get(current.parent_id) : undefined
    guard += 1
  }
  return result
}
