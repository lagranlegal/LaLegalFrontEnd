import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Búsqueda con debounce (300ms) conectada a `?q=` de la API (docs/DESIGN_SYSTEM.md §3). */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
  id,
  onEnter,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** Para poder señalarlo desde fuera (`revealFirstError`) cuando falta llenarlo. */
  id?: string
  /**
   * Qué hace Enter con el término tal como está escrito (sin esperar el
   * debounce: el lector de código de barras teclea el código y el Enter en
   * el mismo instante).
   */
  onEnter?: (term: string) => void
}) {
  const [draft, setDraft] = useState(value)
  // Ajusta `draft` durante el render si `value` cambió por fuera (ej. un
  // filtro que se limpia desde otro lado) — sin useEffect, siguiendo el
  // patrón que recomienda React para "adjusting state when a prop changes".
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setDraft(value)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (draft !== value) onChange(draft)
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          // Un buscador busca: Enter nunca envía el formulario que lo
          // contenga (QA F6-03 — en el punto de venta cobraba el carrito).
          e.preventDefault()
          if (draft !== value) onChange(draft)
          onEnter?.(draft)
        }}
        placeholder={placeholder}
        className="w-full rounded-input border border-border bg-background py-2 pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary"
      />
    </div>
  )
}
