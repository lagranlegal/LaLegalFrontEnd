import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/auth/supabase'
import { compressImage } from '@/lib/storage/compressImage'

/**
 * Bucket privado único para fotos (CLAUDE.md regla 12): cédulas, prendas,
 * artículos, contratos firmados, comprobantes de gasto — todo bajo el mismo
 * bucket, separado por carpeta. RLS reutiliza `current_company_id()` y solo
 * permite leer/escribir dentro de `{company_id}/…` (confirmado contra el
 * backend real el 18/08/2026: un intento de subir a la carpeta de otra
 * empresa devuelve 403 `AccessDenied` explícito, no un genérico). Nunca URL
 * pública — toda lectura pasa por `createSignedUrl`.
 */
const BUCKET = 'company-files'
const SIGNED_URL_TTL_SECONDS = 300

/**
 * `folder` ej. `inventory/{item_id}` — organiza por feature dentro de la
 * carpeta de la empresa; RLS solo exige que el primer segmento sea
 * `company_id`, el resto es libre.
 */
export async function uploadCompanyPhoto(companyId: string, folder: string, file: File): Promise<string> {
  const compressed = await compressImage(file)
  const path = `${companyId}/${folder}/${crypto.randomUUID()}.webp`
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, { contentType: 'image/webp' })
  if (error) throw error
  return path
}

export async function deleteCompanyPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

async function getSignedPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  return data.signedUrl
}

/** Cada thumbnail de `PhotoUploader` pide su propia URL firmada — `staleTime` corto porque el token vence a los 5 minutos en el backend. */
export function useSignedPhotoUrl(path: string | null) {
  return useQuery({
    queryKey: ['storage', 'signed-url', path] as const,
    queryFn: () => getSignedPhotoUrl(path as string),
    enabled: !!path,
    staleTime: 4 * 60 * 1000,
  })
}
