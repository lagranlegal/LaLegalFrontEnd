import { useEffect, useState, type ReactNode, type Ref } from 'react'
import { Search, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { invalidFieldProps } from '@/components/ui/input'

/** Búsqueda con debounce (300ms) conectada a `?q=` de la API (docs/DESIGN_SYSTEM.md §3). */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
  id,
  onEnter,
  ariaLabel,
  invalid,
  ref,
  autoFocus,
  size = 'default',
  icon: Icon = Search,
  trailing,
  onFocusChange,
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
  /** Nombre accesible. Sin él, el placeholder (que el lector no siempre anuncia) era lo único que lo nombraba (F9-15). */
  ariaLabel?: string
  /** Falta llenarlo: `aria-invalid` y, con `id`, `aria-describedby` a su `FieldError` (issue #5). */
  invalid?: boolean
  /** React 19: `ref` es una prop. El punto de venta devuelve el foco al escáner tras agregar (F9-27). */
  ref?: Ref<HTMLInputElement>
  autoFocus?: boolean
  /** `lg`: el escáner del punto de venta (56 px, 15 px de texto, ícono de código de barras). */
  size?: 'default' | 'lg'
  icon?: LucideIcon
  /** Lo que va a la derecha dentro del campo (el «Listo para escanear»). */
  trailing?: ReactNode
  onFocusChange?: (focused: boolean) => void
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
      <Icon
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground',
          size === 'lg' ? 'left-3.5 size-5 text-foreground' : 'left-3 size-4',
        )}
      />
      <input
        ref={ref}
        autoFocus={autoFocus}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        id={id}
        aria-label={ariaLabel ?? placeholder}
        {...invalidFieldProps(id, invalid)}
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
        className={cn(
          'w-full rounded-input border border-border-strong bg-card py-2 text-base text-foreground outline-none focus:border-ring',
          size === 'lg' ? 'min-h-14 pl-11 sm:text-md' : 'min-h-11 pl-9 sm:text-sm',
          trailing ? (size === 'lg' ? 'pr-12 min-[481px]:pr-44' : 'pr-28') : 'pr-3',
        )}
      />
      {trailing && <div className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2">{trailing}</div>}
    </div>
  )
}
