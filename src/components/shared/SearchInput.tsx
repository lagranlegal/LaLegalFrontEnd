import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Búsqueda con debounce (300ms) conectada a `?q=` de la API (docs/DESIGN_SYSTEM.md §3). */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
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
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-input border border-border bg-background py-2 pr-3 pl-9 text-sm text-foreground outline-none focus:border-primary"
      />
    </div>
  )
}
