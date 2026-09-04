import { createClient } from '@supabase/supabase-js'

/**
 * La URL con la que se abrió la pestaña, capturada ANTES de crear el cliente.
 *
 * `detectSessionInUrl: true` procesa el fragmento (`#access_token=...` o
 * `#error_code=...`) y lo BORRA de la barra de direcciones apenas se crea el
 * cliente — o sea, antes de que monte cualquier componente. Sin esta copia,
 * `/auth/callback` no tiene forma de saber si llegó con un error de Supabase
 * (enlace ya usado o vencido) o simplemente sin nada: los dos casos se ven
 * igual, y el mensaje termina siendo el genérico que no dice nada.
 *
 * Este módulo es el que crea el cliente, así que su cuerpo corre primero.
 */
export const initialUrl = typeof window === 'undefined' ? '' : window.location.href

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
