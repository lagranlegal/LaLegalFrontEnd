import { createClient } from '@supabase/supabase-js'

/**
 * Único cliente de Supabase del repo — SOLO Auth (sesión/refresh) y Storage
 * (fotos). Ninguna regla de negocio ni escritura a Postgres/PostgREST pasa
 * por aquí (docs/ARCHITECTURE.md §2). `lib/api/client.ts` lee la sesión de
 * este cliente para el header `Authorization` de cada request al backend.
 */
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
