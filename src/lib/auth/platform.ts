import { supabase } from '@/lib/auth/supabase'

/**
 * Claim `app_metadata.platform_role` del JWT — el front lo lee SOLO para
 * routing básico de `/platform` (docs/ARCHITECTURE.md §4: "no infiere
 * permisos ni datos de empresa de los claims — para eso está /me"). Ningún
 * dato de empresa ni permiso fino sale de acá. `supabase-js` ya expone
 * `app_metadata` decodificado en `session.user` — no hace falta una
 * librería de JWT-decode aparte.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return (session?.user.app_metadata as { platform_role?: string } | undefined)?.platform_role === 'super_admin'
}
