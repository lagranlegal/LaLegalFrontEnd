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

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => supabase.auth.signOut(),
    // No dejar datos de la empresa en memoria de otra sesión (ARCHITECTURE.md §8).
    onSuccess: () => queryClient.clear(),
  })
}
