import { useBlocker } from '@tanstack/react-router'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * El pie de guardar de una página de ajustes (rediseño P3, F9-54/F9-55): con
 * cambios sin guardar se queda pegado abajo, flotando (`--shadow-modal`), con
 * «Tienes cambios sin guardar», «Descartar» y el primario; sin cambios queda
 * en su lugar al final y el botón dice por qué está apagado. Va DENTRO del
 * `<form>`: el primario es su `submit`.
 */
export function SaveBar({
  dirty,
  pending,
  onDiscard,
  label = 'Guardar cambios',
  dirtyText = 'Tienes cambios sin guardar.',
}: {
  dirty: boolean
  pending: boolean
  onDiscard: () => void
  label?: string
  dirtyText?: string
}) {
  return (
    <div
      role="region"
      aria-label="Guardar"
      className={cn(
        'z-10 flex flex-wrap items-center justify-end gap-3 rounded-card border border-border bg-card px-card py-3',
        dirty && 'sticky bottom-3 shadow-modal',
      )}
    >
      <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
        {dirty ? <span className="font-medium text-foreground">{dirtyText}</span> : 'Todo está guardado.'}
      </p>
      {dirty && (
        <Button type="button" variant="ghost" disabled={pending} onClick={onDiscard}>
          Descartar
        </Button>
      )}
      <Button type="submit" disabled={!dirty || pending} className="w-full sm:w-auto">
        {pending ? 'Guardando…' : label}
      </Button>
    </div>
  )
}

/**
 * Salir de la página con cambios sin guardar pregunta antes (H-39): por el
 * menú, por «Volver» o cerrando la pestaña. Mismo diálogo que el POS.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const blocker = useBlocker({ shouldBlockFn: () => when, enableBeforeUnload: () => when, withResolver: true })
  return (
    <AppDialog
      open={blocker.status === 'blocked'}
      onOpenChange={(open) => !open && blocker.reset?.()}
      title="¿Salir sin guardar?"
      description="Los cambios de esta página se pierden."
      size="sm"
      footer={
        <div className="flex w-full flex-col gap-2">
          <Button variant="danger-solid" className="w-full" onClick={() => blocker.proceed?.()}>
            Salir sin guardar
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => blocker.reset?.()}>
            Seguir editando
          </Button>
        </div>
      }
    />
  )
}
