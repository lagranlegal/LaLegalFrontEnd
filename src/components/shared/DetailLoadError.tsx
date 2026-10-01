import { Link } from '@tanstack/react-router'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isNotFoundError } from '@/lib/api/isNotFoundError'
import { isPermissionError } from '@/lib/api/isPermissionError'

/**
 * El error de una página de detalle, dicho según lo que pasó (F9-58):
 * - no existe (`NOT_FOUND`): «Este contrato no existe o no es de tu empresa»
 *   y la salida a la lista; reintentar no sirve;
 * - sin permiso: qué falta, sin «Reintentar» (DESIGN_SYSTEM §4.8);
 * - lo demás (red, servidor): «No se pudo cargar…» con «Reintentar».
 */
export function DetailLoadError({
  error,
  notFoundTitle,
  loadFailedText,
  backTo,
  backLabel,
  onRetry,
}: {
  error: unknown
  notFoundTitle: string
  loadFailedText: string
  backTo: string
  backLabel: string
  onRetry: () => void
}) {
  const notFound = isNotFoundError(error)
  const forbidden = isPermissionError(error)
  return (
    <div role="alert" className="enter-up flex flex-col items-center gap-3 rounded-card border border-border bg-card px-card py-10 text-center">
      {notFound && (
        <div aria-hidden className="flex size-12 items-center justify-center rounded-input bg-muted text-muted-foreground">
          <SearchX className="size-6" />
        </div>
      )}
      {notFound ? (
        <div className="grid gap-1">
          <p className="font-medium text-foreground">{notFoundTitle}</p>
          <p className="text-sm text-muted-foreground">Revisa el enlace o búscalo en la lista.</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {forbidden ? 'Tu rol no tiene permiso para ver esto. Pídele a un administrador que te lo habilite.' : loadFailedText}
        </p>
      )}
      {notFound || forbidden ? (
        <Button asChild variant="outline">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      ) : (
        <Button variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
