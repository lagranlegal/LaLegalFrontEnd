import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SearchInput } from '@/components/shared/SearchInput'
import { Money } from '@/components/shared/Money'
import {
  availableItemsSearchOptions,
  transformableItemsSearchOptions,
  useTransformableItemsSearch,
  useAvailableItemsSearch,
  pickOnEnter,
  type Item,
} from '@/lib/inventory/items'

/**
 * Buscar-y-agregar artículo disponible — usado por egresos (inventory) y el
 * carrito de venta (sales), por eso vive en `components/shared` (CLAUDE.md
 * regla 3: compartido entre 2+ features). A diferencia de `CustomerPicker`
 * (un valor fijo, con "Cambiar"), acá cada selección dispara `onSelect` y el
 * buscador se limpia solo — es un patrón "agregar de a uno", no "elegir
 * uno y quedarse con ese valor".
 */
export function ItemPicker({
  onSelect,
  placeholder = 'Buscar artículo por código o nombre…',
  scope = 'available',
}: {
  onSelect: (item: Item) => void
  placeholder?: string
  /**
   * `available` — lo vendible, para el carrito y los egresos.
   * `transformable` — incluye BORRADORES, porque fundir una prenda que nunca
   * se publicó es el caso más común: no se le puso precio justo porque ya se
   * sabía que iba al crisol.
   */
  scope?: 'available' | 'transformable'
}) {
  const [q, setQ] = useState('')
  const queryClient = useQueryClient()
  // Los dos hooks se llaman siempre (regla de hooks); el que no aplica queda
  // deshabilitado por término vacío y no dispara ninguna request.
  const disponibles = useAvailableItemsSearch(scope === 'available' ? q : '')
  const transformables = useTransformableItemsSearch(scope === 'transformable' ? q : '')
  const { data, isFetching } = scope === 'transformable' ? transformables : disponibles

  /**
   * Enter AGREGA, no envía (QA F6-03). Un lector de código de barras teclea
   * el código y manda Enter de una, antes de que venza el debounce del
   * buscador, así que no se puede leer la lista pintada: se pide (o se toma
   * de cache) la búsqueda de ESE término, la misma que pinta la lista.
   */
  async function handleEnter(term: string) {
    const t = term.trim()
    if (!t) return
    let items: Item[]
    try {
      items =
        scope === 'transformable'
          ? await queryClient.fetchQuery(transformableItemsSearchOptions(t))
          : await queryClient.fetchQuery(availableItemsSearchOptions(t))
    } catch {
      // Un fallo de red en el Enter no agrega nada ni envía nada: el cajero
      // sigue teniendo la lista y el clic.
      return
    }
    const elegido = pickOnEnter(items, t)
    if (!elegido) return
    onSelect(elegido)
    setQ('')
  }

  return (
    <div className="relative">
      <SearchInput value={q} onChange={setQ} placeholder={placeholder} onEnter={handleEnter} />
      {q.trim() && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-input border border-border bg-card shadow-card">
          {isFetching && <p className="px-3 py-2 text-sm text-muted-foreground">Buscando…</p>}
          {!isFetching && data?.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</p>}
          {!isFetching &&
            data?.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onSelect(item)
                  setQ('')
                }}
              >
                <div>
                  <span className="font-medium text-foreground">{item.name}</span>
                  {item.code && <span className="ml-2 font-mono text-xs text-muted-foreground">{item.code}</span>}
                </div>
                {item.sale_price && <Money value={item.sale_price} className="shrink-0 text-sm" />}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
