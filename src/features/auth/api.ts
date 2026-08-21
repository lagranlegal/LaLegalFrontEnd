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
