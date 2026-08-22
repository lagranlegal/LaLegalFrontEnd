import { useCallback } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { InventorySearch } from '@/app/router'

/**
 * Los filtros de inventario, leídos y escritos en la URL.
 *
 * Reemplaza el `useState` que tenía cada pestaña. Con estado local los filtros
 * se perdían al recargar y no se podían compartir — "mirá las compras por
 * pagar de este proveedor" era un link imposible de mandar. En la dirección
 * sobreviven al F5, el botón «atrás» vuelve al filtro anterior, y el link se
 * pasa por WhatsApp.
 *
 * `replace: true` a propósito: escribir cada tecla del buscador como una
 * entrada nueva del historial dejaría el botón «atrás» inservible — habría
 * que pulsarlo una vez por letra para salir de la pantalla.
 *
 * Un valor vacío se BORRA del objeto en vez de guardarse como `''`. Si no, la
 * URL se llenaría de `?q=&status=&cat1=` al limpiar los filtros: ruidoso de
 * leer e imposible de compartir con dignidad.
 */
/**
 * Mezcla los cambios sobre los filtros actuales y BORRA lo vacío.
 *
 * Guardar `''` dejaría la URL llena de `?q=&status=&cat1=` al limpiar
 * filtros: ruidosa de leer e incómoda de compartir. Y `false` se borra por lo
 * mismo — `?stock=false` no dice nada que la ausencia no diga mejor.
 *
 * Pura y exportada para poder probarla: es la única parte con lógica de todo
 * el hook, y equivocarse acá se nota en cada URL de la app.
 */
export function mergeSearch(prev: InventorySearch, cambios: Partial<InventorySearch>): InventorySearch {
  const next: Record<string, unknown> = { ...prev, ...cambios }
  for (const [clave, valor] of Object.entries(next)) {
    if (valor === '' || valor === undefined || valor === false) delete next[clave]
  }
  return next as InventorySearch
}

export function useInventorySearch() {
  const search = useSearch({ from: '/app-layout/inventario' }) as InventorySearch
  const navigate = useNavigate()

  const setSearch = useCallback(
    (cambios: Partial<InventorySearch>) => {
      void navigate({
        to: '/inventario',
        search: (prev: InventorySearch) => mergeSearch(prev, cambios),
        replace: true,
      })
    },
    [navigate],
  )

  return { search, setSearch }
}
