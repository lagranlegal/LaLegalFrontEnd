/**
 * Compresión client-side antes de subir a Storage (CLAUDE.md regla 12,
 * docs/DESIGN_SYSTEM.md §3 `PhotoUploader`): redimensiona al lado más largo
 * y reencoda a WebP — el bucket `company-files` solo acepta
 * `image/jpeg|png|webp` (verificado contra el backend real, ver
 * docs/STORAGE_PENDIENTE.md), WebP da el tamaño más chico de los tres a
 * calidad equivalente. Sin librería externa: `createImageBitmap` + canvas
 * ya cubren esto sin sumarle peso al bundle.
 */
export async function compressImage(file: File, options?: { maxDimension?: number; quality?: number }): Promise<Blob> {
  const maxDimension = options?.maxDimension ?? 1600
  const quality = options?.quality ?? 0.8

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) throw new Error('No se pudo comprimir la imagen.')
  return blob
}
