import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from 'lucide-react'
import { useMe } from '@/lib/auth/me'
import { deleteCompanyPhoto, uploadCompanyPhoto, useSignedPhotoUrl } from '@/lib/storage/photos'
import { cn } from '@/lib/utils'

function PhotoThumbnail({
  path,
  disabled,
  showReorder,
  onRemove,
  onMoveLeft,
  onMoveRight,
}: {
  path: string
  disabled?: boolean
  showReorder: { left: boolean; right: boolean }
  onRemove: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
}) {
  const { data: url, isPending, isError } = useSignedPhotoUrl(path)

  return (
    <div className="group relative aspect-square overflow-hidden rounded-input border border-border bg-muted">
      {isPending && <div className="size-full animate-pulse bg-border" />}
      {isError && <div className="flex size-full items-center justify-center text-xs text-muted-foreground">Error</div>}
      {url && <img src={url} alt="" className="size-full object-cover" />}

      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label="Quitar foto"
        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-foreground/60 text-background hover:bg-foreground/80 disabled:opacity-50"
      >
        <X className="size-3.5" />
      </button>

      {(showReorder.left || showReorder.right) && (
        <div className="absolute inset-x-1 bottom-1 flex justify-between">
          <button
            type="button"
            onClick={onMoveLeft}
            disabled={disabled || !showReorder.left}
            aria-label="Mover a la izquierda"
            className="flex size-6 items-center justify-center rounded-full bg-foreground/60 text-background hover:bg-foreground/80 disabled:opacity-0"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveRight}
            disabled={disabled || !showReorder.right}
            aria-label="Mover a la derecha"
            className="flex size-6 items-center justify-center rounded-full bg-foreground/60 text-background hover:bg-foreground/80 disabled:opacity-0"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * `value`/`onChange` sobre un arreglo de PATHS de Storage (no URLs) — el
 * caller los guarda tal cual en `ItemUpdateIn.photos` u otro campo
 * equivalente; cada thumbnail resuelve su propia URL firmada bajo demanda
 * (`useSignedPhotoUrl`, docs/DESIGN_SYSTEM.md §3). Comprime cada foto
 * client-side (`compressImage`) antes de subirla — el bucket `company-files`
 * es privado, 8 MB máx, solo `image/jpeg|png|webp` (verificado contra el
 * backend real, `docs/STORAGE_PENDIENTE.md`).
 *
 * La subida ocurre al instante (no se puede diferir el byte-upload al
 * "Guardar" del formulario que lo contiene); si el usuario cierra el
 * diálogo sin guardar, el archivo queda huérfano en Storage sin que ningún
 * artículo lo referencie — aceptable (mismo trade-off que la mayoría de
 * uploaders), sin job de limpieza en el front.
 */
export function PhotoUploader({
  value,
  onChange,
  folder,
  maxPhotos = 6,
  disabled,
}: {
  value: string[]
  onChange: (next: string[]) => void
  folder: string
  maxPhotos?: number
  disabled?: boolean
}) {
  const { data: me } = useMe()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !me) return
    setError(null)
    setUploading(true)
    try {
      const remaining = maxPhotos - value.length
      const toUpload = Array.from(files).slice(0, Math.max(remaining, 0))
      const paths = await Promise.all(toUpload.map((file) => uploadCompanyPhoto(me.company.id, folder, file)))
      onChange([...value, ...paths])
    } catch {
      setError('No se pudo subir la foto. Intenta de nuevo.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleRemove(path: string) {
    onChange(value.filter((p) => p !== path))
    // Best-effort: si falla el borrado del blob, el artículo ya no lo referencia igual.
    deleteCompanyPhoto(path).catch(() => {})
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved as string)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((path, index) => (
          <PhotoThumbnail
            key={path}
            path={path}
            disabled={disabled}
            showReorder={{ left: index > 0, right: index < value.length - 1 }}
            onRemove={() => handleRemove(path)}
            onMoveLeft={() => move(index, -1)}
            onMoveRight={() => move(index, 1)}
          />
        ))}

        {value.length < maxPhotos && (
          <button
            type="button"
            disabled={disabled || uploading || !me}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-input border border-dashed border-border bg-background text-muted-foreground transition-colors',
              'hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <span className="text-xs">{uploading ? 'Subiendo…' : 'Agregar'}</span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
