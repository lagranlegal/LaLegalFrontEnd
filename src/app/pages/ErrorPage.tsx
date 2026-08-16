import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/**
 * Red de seguridad para errores no capturados por una ruta específica
 * (docs/CLAUDE.md regla 10: toda vista con datos tiene error con retry) —
 * típicamente `NetworkError` durante el bootstrap de `/me`.
 */
export function ErrorPage({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-page">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-card text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">No se pudo cargar la app</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || 'Ocurrió un error inesperado.'}</p>
        <Button className="mt-4 rounded-pill" onClick={() => reset()}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}
