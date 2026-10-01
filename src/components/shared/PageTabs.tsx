import { useEffect, useRef, type ReactNode } from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export interface PageTab<T extends string> {
  value: T
  label: string
  /** Contador al lado de la etiqueta («Abonos 3»). */
  count?: ReactNode
}

/**
 * Pestañas de sección de una página de detalle (rediseño P2-a, «Detalle de
 * contrato»): subrayado en el color de texto, no una cápsula, sobre un divisor
 * de ancho completo; 44 px de alto (objetivo táctil) y scroll horizontal
 * propio si no caben, para que el documento no desborde a 360 px. La activa va
 * en tinta y negrita, nunca en el oro del primario (F9-13).
 *
 * Sobre Radix: flechas, Home/End y `aria-selected` vienen de ahí. El contenido
 * va en `PageTabsContent`.
 */
export function PageTabs<T extends string>({
  value,
  onValueChange,
  tabs,
  label,
  children,
}: {
  value: T
  onValueChange: (value: T) => void
  tabs: PageTab<T>[]
  label: string
  children: ReactNode
}) {
  // Con scroll horizontal (celular), la activa puede quedar cortada al abrir
  // desde la URL: se corre la tira, no la página (sin `scrollIntoView`, que
  // también movería la página en vertical).
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    const active = list?.querySelector<HTMLElement>('[data-state="active"]')
    if (!list || !active) return
    const overflowRight = active.offsetLeft + active.offsetWidth - (list.scrollLeft + list.clientWidth)
    if (overflowRight > 0) list.scrollLeft += overflowRight
    else if (active.offsetLeft < list.scrollLeft) list.scrollLeft = active.offsetLeft
  }, [value])
  return (
    <TabsPrimitive.Root value={value} onValueChange={(v) => onValueChange(v as T)} className="flex flex-col gap-4">
      <TabsPrimitive.List ref={listRef} aria-label={label} className="relative flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              '-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3.5 text-sm whitespace-nowrap text-muted-foreground',
              'transition-colors duration-(--duration-fast) outline-none hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
              'data-[state=active]:border-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              // El espacio hace que el nombre accesible sea «Abonos 3», no «Abonos3».
              <>
                {' '}
                <span className="tnum rounded-pill bg-muted px-1.75 text-xs font-normal text-body">{tab.count}</span>
              </>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  )
}

export function PageTabsContent({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Content value={value} className={cn('outline-none', className)}>
      {children}
    </TabsPrimitive.Content>
  )
}
