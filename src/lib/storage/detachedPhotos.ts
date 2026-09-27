import { deleteCompanyPhoto } from '@/lib/storage/photos'

/**
 * Fotos que un guardado SOLTÓ y que se pueden borrar de Storage.
 *
 * POR QUÉ SOLO AL GUARDAR (QA 03 H-04): `PhotoUploader` borraba el archivo
 * al tocar la X. En una edición (cédula del cliente, logo, firma, contrato
 * firmado, fotos de un lote), quitar + Cancelar dejaba la ficha apuntando a
 * un archivo que ya no existía: foto rota en la ficha y en los documentos
 * impresos, y la evidencia (una cédula, Habeas Data) perdida. El registro
 * guardado es el único que sabe si una foto dejó de usarse.
 *
 * POR QUÉ SOLO LAS DE `folder`: un mismo path puede estar en más de una
 * entidad. El remate copia a inventario las fotos de las prendas del
 * contrato, la ampliación del préstamo copia las prendas al contrato
 * sucesor, y un lote muestra las fotos heredadas de su producto. Quitar de
 * un lote una foto que vive en la carpeta del contrato solo la desvincula
 * del lote; borrarla le quitaría la foto al contrato. Se borra solo lo que
 * vive en la carpeta de ESTA entidad (`{company_id}/{folder}/…`).
 */
export function detachedPhotos(
  before: readonly (string | null | undefined)[],
  after: readonly (string | null | undefined)[],
  folder: string,
): string[] {
  const quedan = new Set(after.filter(Boolean))
  const prefijo = `${folder.replace(/\/+$/, '')}/`
  return before.filter((path): path is string => {
    if (!path || quedan.has(path)) return false
    // El primer segmento es el `company_id` (RLS del bucket); la carpeta de
    // la entidad es lo que viene después.
    return path.split('/').slice(1).join('/').startsWith(prefijo)
  })
}

/**
 * Llamar DESPUÉS de que el guardado respondió bien. Best-effort: si el
 * borrado falla, el registro ya no referencia la foto y lo único que queda
 * es un archivo huérfano, que no rompe nada.
 */
export function deleteDetachedPhotos(
  before: readonly (string | null | undefined)[],
  after: readonly (string | null | undefined)[],
  folder: string,
): void {
  for (const path of detachedPhotos(before, after, folder)) {
    deleteCompanyPhoto(path).catch(() => {})
  }
}
