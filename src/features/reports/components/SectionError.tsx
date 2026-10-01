import { Button } from '@/components/ui/button'
import { isPermissionError } from '@/lib/api/isPermissionError'

/**
 * Una sección de Reportes cuyo endpoint falló (F9-47). Antes la sección
 * desaparecía sin aviso: con `income-statement` en 500 no había «Estado de
 * resultados» y el dueño veía un reporte "completo" al que le faltaba la
 * utilidad. Ahora queda su título, el error y «Reintentar».
 *
 * Un 403 no es una falla (CLAUDE.md regla 8): sin el permiso, la sección se
 * oculta como antes, sin «Reintentar».
 */
export function SectionError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  if (isPermissionError(error)) return null
  return (
    <div className="rounded-card border border-border bg-card p-card">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <p role="alert" className="mt-2 text-sm text-danger">
        No se pudo cargar esta sección. Las demás cifras del reporte sí están al día.
      </p>
      <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
