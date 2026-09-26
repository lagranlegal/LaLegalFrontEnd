import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CalloutTone = 'info' | 'success' | 'warning'

const TONE_CLASSES: Record<CalloutTone, { box: string; icon: string }> = {
  info: { box: 'bg-info-soft', icon: 'text-info' },
  success: { box: 'bg-success-soft', icon: 'text-success' },
  warning: { box: 'bg-warning-soft', icon: 'text-warning' },
}

/**
 * Recuadro de ayuda: explica algo que el usuario no sabe y, si aplica, le da
 * la acción para resolverlo ahí mismo (docs/DESIGN_SYSTEM.md §3). El fondo
 * lleva el tono; el texto va en `text-foreground` y solo el ícono en el color
 * semántico, porque un párrafo entero en `text-warning` se lee peor que uno
 * normal sobre fondo suave.
 *
 * No reemplaza las notas de una línea que ya existen (`bg-warning-soft
 * text-warning`): esto es para cuando hay título, explicación y acción.
 */
export function Callout({
  tone = 'info',
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  tone?: CalloutTone
  icon?: LucideIcon
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const classes = TONE_CLASSES[tone]
  return (
    <div className={cn('flex gap-3 rounded-input px-4 py-3 text-sm text-foreground', classes.box, className)}>
      {Icon && <Icon className={cn('mt-0.5 size-4 shrink-0', classes.icon)} aria-hidden />}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {title && <p className="font-medium">{title}</p>}
        {children}
        {action && <div className="mt-1 flex flex-wrap items-center gap-2">{action}</div>}
      </div>
    </div>
  )
}
