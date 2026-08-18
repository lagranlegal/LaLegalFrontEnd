import { useSignedPhotoUrl } from '@/lib/storage/photos'
import { cn } from '@/lib/utils'

/**
 * Miniatura de SOLO LECTURA para un path de Storage ya guardado — distinta
 * del thumbnail interno (editable, con quitar/reordenar) de `PhotoUploader`.
 * Consumida donde se necesita MOSTRAR una foto ya asociada a algo (prenda,
 * cliente, contrato firmado, comprobante de gasto), no subir una nueva.
 * Click abre la URL firmada en una pestaña nueva (para ver a tamaño real).
 */
export function PhotoThumbnail({ path, className }: { path: string; className?: string }) {
  const { data: url, isPending, isError } = useSignedPhotoUrl(path)

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={cn('block aspect-square overflow-hidden rounded-input border border-border bg-muted', !url && 'pointer-events-none', className)}
    >
      {isPending && <div className="size-full animate-pulse bg-border" />}
      {isError && <div className="flex size-full items-center justify-center text-xs text-muted-foreground">Error</div>}
      {url && <img src={url} alt="" className="size-full object-cover" />}
    </a>
  )
}
