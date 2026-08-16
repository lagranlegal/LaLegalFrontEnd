import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: keyof typeof SIZE_CLASSES
  footer?: ReactNode
  children?: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
