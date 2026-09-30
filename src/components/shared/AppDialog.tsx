import type { ReactNode } from 'react'
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
 * EL modal de la app (docs/DESIGN_SYSTEM.md §3): centrado, `--radius-modal`,
 * X arriba derecha, título grande centrado, subtítulo, footer con acciones
 * centradas. **Prohibido crear otro modal** — todo diálogo pasa por acá.
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

  return (
    <Dialog open={open} onOpenChange={(next) => void handleOpenChange(next)}>
      <DialogContent className={cn('rounded-modal p-6', SIZE_CLASSES[size])}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
          {description && <DialogDescription className="text-center">{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter className="mx-0 mb-0 flex-col rounded-b-none border-0 bg-transparent p-0 sm:flex-col sm:justify-center">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
