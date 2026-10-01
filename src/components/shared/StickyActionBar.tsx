import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * La barra de acción de un formulario de página larga (rediseño P3, F9-31,
 * F9-41): se queda pegada al fondo de la ventana mientras se llena el
 * formulario y aterriza en su lugar al final. Flota: superficie con borde,
 * radio de tarjeta y `--shadow-modal`, la sombra de lo que flota.
 *
 * `summary` va a la izquierda (el total, lo que va a pasar al guardar); las
 * acciones a la derecha, con el primario de último. En el celular, todo
 * apilado y los botones a ancho completo. Va DENTRO del `<form>` (o de la
 * columna del formulario) para que el submit siga siendo del formulario y la
 * barra no pase más abajo que él.
 */
export function StickyActionBar({ summary, children, className }: { summary?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      data-slot="sticky-action-bar"
      className={cn(
        'sticky bottom-3 z-20 flex flex-col gap-3 rounded-card border border-border bg-card p-3 shadow-modal sm:flex-row sm:items-center sm:justify-between sm:px-card',
        className,
      )}
    >
      {summary && <div className="min-w-0 text-sm">{summary}</div>}
      <div className="flex flex-col gap-2 *:w-full sm:ml-auto sm:flex-row sm:items-center sm:*:w-auto">{children}</div>
    </div>
  )
}
