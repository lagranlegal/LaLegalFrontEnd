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

/**
 * Invitación y recuperación: la sesión ya está activa (viene del enlace) — lo
 * que falta es que la persona elija su contraseña.
 *
 * Y DESPUÉS SE ENTRA CON ELLA, a propósito. La sesión que trae el enlace lleva
 * `amr: [{method: "otp"}]`; una de verdad lleva `method: "password"`. El
 * backend usa justo eso para pasar al usuario de `invited` a `active`, porque
 * abrir un enlace no prueba que exista ninguna contraseña (ver
 * `app/core/security.py::_sesion_con_contrasena`). Sin este login la persona
 * se quedaría marcada como "Invitado" hasta la próxima vez que entrara, y el
 * admin vería pendiente a alguien que ya está trabajando.
 *
 * De paso comprueba que la contraseña recién guardada de verdad sirve para
 * entrar, que es lo único que a esa persona le importa mañana.
 *
 * Si este segundo paso falla no se rompe nada: la sesión del enlace sigue
 * siendo válida y la persona entra igual — solo tardará un login más en
 * aparecer como activa. Por eso el error se traga.
 */
export function useSetPassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      const email = data.user?.email
      if (email) {
        await supabase.auth.signInWithPassword({ email, password }).catch(() => undefined)
      }
    },
  })
}

/**
 * Cambiar la propia contraseña estando dentro de la app.
 *
 * NO EXISTÍA. Quien quería cambiarla —porque alguien se la vio, porque la
 * comparte, porque el admin se la generó— tenía dos caminos y los dos malos:
 * "¿Olvidaste tu contraseña?", que manda un correo (el SMTP incluido de
 * Supabase limita a unos pocos por hora y puede caer en spam), o pedirle un
 * enlace al administrador, que es una credencial que el administrador
 * también ve.
 *
 * Se verifica la actual entrando con ella primero. Supabase NO la pide
 * (`updateUser` acepta cualquier sesión válida), así que sin esto bastaba con
 * una pantalla desatendida un minuto para dejar a alguien fuera de su propia
 * cuenta.
 */
export function useChangeOwnPassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const { data: sesion } = await supabase.auth.getUser()
      const email = sesion.user?.email
      if (!email) throw new Error('No hay una sesión activa.')

      const { error: errorActual } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
      if (errorActual) throw new WrongCurrentPasswordError()

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
  })
}

/** La contraseña actual no es la que la persona escribió. Caso aparte para no mostrarle el error crudo de Supabase, que habla de credenciales de login. */
export class WrongCurrentPasswordError extends Error {
  constructor() {
    super('La contraseña actual no es correcta.')
    this.name = 'WrongCurrentPasswordError'
  }
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
