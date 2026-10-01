import { useId, type ReactNode } from 'react'
import { useActiveSection } from '@/lib/useActiveSection'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface IndexSection {
  /** El `id` del bloque en la página: el ancla del índice. */
  id: string
  label: string
}

/** Lleva la sección a la vista y le pasa el foco: el lector de pantalla sigue leyendo desde ahí, no desde el índice. */
function jumpTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

/**
 * Un bloque de una página con índice: el destino del ancla. Recibe el foco al
 * saltar (`tabIndex={-1}`, sin anillo: no es un control) y deja aire arriba
 * para que el selector fijo del celular no lo tape.
 */
export function IndexedSection({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <div id={id} tabIndex={-1} className={cn('flex min-w-0 scroll-mt-20 flex-col gap-3 outline-none lg:scroll-mt-4', className)}>
      {children}
    </div>
  )
}

/**
 * Página larga con índice lateral (rediseño P3, Reportes): desde 1024 px una
 * columna fija (sticky) a la izquierda con un enlace por sección; la que se
 * está leyendo va en tinta y negrita con su barra (`aria-current`), las demás
 * en `--text-muted`, como `PageTabs`: nunca en el oro del primario. Los
 * enlaces son anclas reales (`#id`), así que el índice funciona sin JavaScript
 * de por medio y se puede abrir en otra pestaña.
 *
 * Debajo de 1024 px, un selector «Ir a la sección» fijo arriba, que también
 * dice en qué sección se está.
 */
export function SectionIndexLayout({ sections, label, children }: { sections: IndexSection[]; label: string; children: ReactNode }) {
  const [active, pin] = useActiveSection(sections.map((s) => s.id))
  const selectId = useId()
  const go = (id: string) => {
    pin(id)
    jumpTo(id)
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[12.5rem_minmax(0,1fr)] lg:gap-6">
      <nav aria-label={label} className="hidden lg:block">
        <ul className="sticky top-4 flex flex-col border-l border-border">
          {sections.map((section) => {
            const current = section.id === active
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={current ? 'location' : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    go(section.id)
                  }}
                  className={cn(
                    '-ml-px flex min-h-9 items-center border-l-2 border-transparent py-1.5 pr-2 pl-3 text-sm leading-snug text-muted-foreground',
                    'transition-colors duration-(--duration-fast) hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
                    current && 'border-foreground font-semibold text-foreground',
                  )}
                >
                  {section.label}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background py-2 lg:hidden">
        <label htmlFor={selectId} className="shrink-0 text-sm text-muted-foreground">
          Ir a
        </label>
        <Select value={active} onValueChange={go}>
          <SelectTrigger id={selectId} aria-label={`${label}: ir a la sección`} className="min-w-0 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </div>
  )
}
