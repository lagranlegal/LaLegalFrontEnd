import { useEffect, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { confirm } from '@/components/shared/confirmStore'

const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  // `lg` (512px) alcanza para formularios pero se queda corto para una
  // tabla ancha (Kardex: 7 columnas con fechas, montos y códigos de lote) —
  // el scroll horizontal quedaba "raro" (visible siempre, con la mayoría de
  // la tabla oculta) en vez de ser el respiradero para pantallas angostas
  // que debería ser. `xl` es para ESO, no un tamaño "grande" genérico.
  xl: 'sm:max-w-3xl',
} as const

/**
 * ¿El cuerpo tiene más de lo que se ve? Con eso el pie fijo muestra su
 * divisor: en un diálogo corto no hay nada debajo y una raya ahí solo sería
 * ruido. Sin `ResizeObserver` (jsdom), se queda sin raya.
 */
function useOverflows() {
  // Ref de callback y no `useRef`: Radix monta el contenido en un portal un
  // render después, sin volver a renderizar este componente; con `useRef` el
  // efecto nunca veía el cuerpo.
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  const [overflows, setOverflows] = useState(false)
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    for (const child of Array.from(el.children)) observer.observe(child)
    measure()
    return () => observer.disconnect()
  }, [el])
  return [setEl, overflows] as const
}

/**
 * EL modal de la app (docs/DESIGN_SYSTEM.md §3): centrado, `--radius-modal`,
 * X arriba derecha, título grande centrado, subtítulo, footer con acciones
 * centradas. **Prohibido crear otro modal** — todo diálogo pasa por acá.
 *
 * Rediseño P3 (F9-41): el título y el pie quedan fijos y solo el cuerpo hace
 * scroll. Antes todo el diálogo se desplazaba y en «Nuevo cliente» a 1280 el
 * botón de guardar quedaba bajo el pliegue. Cuando el cuerpo no cabe, el pie
 * lleva su divisor. Un formulario cuyo submit va en el pie lo enlaza con el
 * atributo `form` (como «Nuevo cliente»).
 */
export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  children,
  confirmDiscard = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: keyof typeof SIZE_CLASSES
  footer?: ReactNode
  children?: ReactNode
  /**
   * El diálogo tiene datos escritos sin guardar (`formState.isDirty`): cerrar
   * con Escape, clic afuera o la X pregunta antes de descartar (F9-40: Escape
   * cerraba «Nuevo cliente» con nueve campos llenos y sin aviso). Los botones
   * propios del formulario (Cancelar, Guardar) llaman `onOpenChange` directo
   * y no pasan por aquí: cancelar ya es una decisión explícita.
   */
  confirmDiscard?: boolean
}) {
  async function handleOpenChange(next: boolean) {
    if (!next && confirmDiscard) {
      const { confirmed } = await confirm({
        title: '¿Descartar lo escrito?',
        description: 'Lo que escribiste en este formulario se pierde.',
        confirmLabel: 'Descartar',
        cancelLabel: 'Seguir editando',
        tone: 'danger',
      })
      if (!confirmed) return
    }
    onOpenChange(next)
  }

  const [bodyRef, overflows] = useOverflows()

  return (
    <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
      {/* `max-h` y `flex` en el contenedor; el scroll, solo en el cuerpo
          (`min-h-0` para que el hijo flexible pueda encogerse). */}
      <DialogContent className={cn('flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-modal p-0', SIZE_CLASSES[size])}>
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          {description && <DialogDescription className="text-center">{description}</DialogDescription>}
        </DialogHeader>
        {children !== undefined && children !== null && children !== false && (
          <div ref={bodyRef} data-slot="dialog-body" className={cn('min-h-0 flex-1 overflow-y-auto px-6', footer ? 'pb-4' : 'pb-6')}>
            {children}
          </div>
        )}
        {footer && (
          <DialogFooter
            data-overflows={overflows || undefined}
            className={cn(
              'mx-0 mb-0 shrink-0 flex-col rounded-b-none border-0 bg-transparent px-6 pt-0 pb-6 sm:flex-col sm:justify-center',
              overflows && 'border-t border-border pt-4',
            )}
          >
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
