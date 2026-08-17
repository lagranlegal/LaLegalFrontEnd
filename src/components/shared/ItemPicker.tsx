import { useState } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { Money } from '@/components/shared/Money'
import { useAvailableItemsSearch, type Item } from '@/lib/inventory/items'

/**
 * Buscar-y-agregar artículo disponible — usado por egresos (inventory) y el
 * carrito de venta (sales), por eso vive en `components/shared` (CLAUDE.md
 * regla 3: compartido entre 2+ features). A diferencia de `CustomerPicker`
 * (un valor fijo, con "Cambiar"), acá cada selección dispara `onSelect` y el
 * buscador se limpia solo — es un patrón "agregar de a uno", no "elegir
 * uno y quedarse con ese valor".
 */
export function ItemPicker({ onSelect, placeholder = 'Buscar artículo por código o nombre…' }: { onSelect: (item: Item) => void; placeholder?: string }) {
  const [q, setQ] = useState('')
  const { data, isFetching } = useAvailableItemsSearch(q)

  return (
    <div className="relative">
      <SearchInput value={q} onChange={setQ} placeholder={placeholder} />
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
