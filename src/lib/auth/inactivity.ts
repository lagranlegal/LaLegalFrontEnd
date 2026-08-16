import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/auth/supabase'
import { queryClient } from '@/app/query-client'

/** Decidido con el cliente el 15/08/2026 (docs/ARCHITECTURE.md §8). */
export const INACTIVITY_LOGOUT_MS = 6 * 60 * 60 * 1000

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const

/**
 * Cierra sesión tras `INACTIVITY_LOGOUT_MS` sin interacción del usuario.
 * `queryClient.clear()` al salir — no dejar datos de la empresa en memoria
 * de otra sesión (§8). Se monta una sola vez en la raíz de la app.
 */
export function useInactivityLogout(): void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    function reset() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(async () => {
        await supabase.auth.signOut()
        queryClient.clear()
      }, INACTIVITY_LOGOUT_MS)
    }

    reset()
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }))

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset))
    }
  }, [])
}
