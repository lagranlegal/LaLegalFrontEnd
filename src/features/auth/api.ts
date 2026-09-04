import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/auth/supabase'

export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return data
    },
  })
}

/**
 * Traduce el fallo de `updateUser` a algo que diga QUÉ hacer.
 *
 * Antes la pantalla mostraba siempre "No se pudo guardar la contraseña.
 * Intenta de nuevo" — y "intenta de nuevo" es justo lo que NO sirve cuando la
 * sesión del enlace ya murió: por más veces que lo intente, va a fallar igual.
 * Reportado en vivo (04/09/2026) en una empresa nueva: nadie —ni el
 * administrador ni nosotros— podía saber por qué fallaba, porque el mensaje
 * era el mismo para todas las causas.
 *
 * Los códigos salen de la API de Supabase Auth (`error_code`), no del texto
 * del mensaje, que está en inglés y cambia entre versiones.
 */
export function setPasswordErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code
  const status = (error as { status?: number } | null)?.status

  if (code === 'session_not_found' || code === 'bad_jwt' || status === 401 || status === 403) {
    return 'El enlace ya no es válido (se usó, venció o se abrió en otro dispositivo). Pídele a tu administrador que genere uno nuevo y ábrelo en el mismo navegador donde vas a crear la contraseña.'
  }
  if (code === 'same_password') {
    return 'La contraseña nueva tiene que ser distinta de la anterior.'
  }
  if (code === 'weak_password') {
    return 'Esa contraseña es demasiado débil. Usa una más larga o combina letras, números y símbolos.'
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.'
  }
  // Sin conexión / la petición nunca llegó.
  if (error instanceof TypeError) {
    return 'No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo.'
  }

  const detalle = (error as { message?: string } | null)?.message
  return detalle
    ? `No se pudo guardar la contraseña: ${detalle}`
    : 'No se pudo guardar la contraseña. Intenta de nuevo.'
}

/** Invitación: el link de Supabase ya deja la sesión activa (`detectSessionInUrl`) — solo falta que el usuario elija su contraseña. */
export function useSetPassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
    },
  })
}

/**
 * Recuperación de contraseña — la única salida para quien la olvidó.
 *
 * Sin esto un usuario queda bloqueado para siempre: el admin no puede
 * cambiarle la contraseña (no existe endpoint) y no hay otro camino de vuelta.
 *
 * El correo lleva al MISMO `/auth/callback` que la invitación: Supabase crea
 * la sesión desde el link en los dos casos y la pantalla solo cambia el texto.
 * Una ruta menos que mantener, y una menos que registrar en la lista de
 * Redirect URLs permitidas del proyecto (ver docs/DEPLOY.md).
 *
 * Nunca revela si el correo existe — responde igual en ambos casos, para no
 * convertir la pantalla en un detector de cuentas.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      })
      if (error) throw error
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => supabase.auth.signOut(),
    // No dejar datos de la empresa en memoria de otra sesión (ARCHITECTURE.md §8).
    onSuccess: () => queryClient.clear(),
  })
}
