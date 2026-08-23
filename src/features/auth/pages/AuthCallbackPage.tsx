import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/auth/supabase'
import { useSetPassword } from '@/features/auth/api'

const setPasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type SetPasswordValues = z.infer<typeof setPasswordSchema>

/**
 * Pantalla de "crea tu contraseña" — sirve para DOS flujos: la invitación
 * inicial y la recuperación de contraseña. En ambos, Supabase trae la sesión
 * en la URL y `detectSessionInUrl: true` (lib/auth/supabase.ts) ya la procesó
 * al cargar el cliente; acá solo falta confirmar que quedó activa y pedir la
 * contraseña. El primer request al backend activa al usuario
 * (`invited → active`) automáticamente.
 *
 * El texto es deliberadamente neutro entre los dos casos en vez de detectar
 * cuál es: `detectSessionInUrl` consume el fragmento de la URL al inicializar
 * el cliente, antes de que este componente monte, así que cualquier detección
 * basada en leer el hash sería frágil — y equivocarse mostraría un mensaje
 * que contradice el correo que la persona acaba de abrir.
 *
 * OJO: esta ruta NO puede estar detrás de un guard de "si hay sesión, redirige
 * a /". Tener sesión es su condición de funcionamiento, no un error. Ese guard
 * vivía en el layout padre y hacía que el invitado entrara a la app sin haber
 * puesto contraseña — y sin poder volver a entrar después de cerrar sesión.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading')
  //: La contraseña ya quedó guardada y estamos esperando a que la app cargue.
  //: Es una fase aparte de `setPassword.isPending` y dura MÁS que ella.
  const [entrando, setEntrando] = useState(false)
  const setPassword = useSetPassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordValues>({ resolver: zodResolver(setPasswordSchema) })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? 'ready' : 'invalid')
    })
  }, [])

  async function onSubmit(values: SetPasswordValues) {
    await setPassword.mutateAsync(values.password)
    // `setPassword.isPending` se apaga en cuanto Supabase responde, pero acá
    // todavía falta lo más lento: `navigate` dispara el `beforeLoad` del
    // layout de la app, que espera `GET /me`. Sin este estado propio el botón
    // volvía a decir "Guardar contraseña" y la pantalla se quedaba quieta unos
    // segundos antes de saltar al inicio — la interfaz afirmando que no estaba
    // pasando nada justo cuando más estaba pasando.
    setEntrando(true)
    await navigate({ to: '/' })
  }

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Verificando invitación…</p>
  }

  if (status === 'invalid') {
    return (
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-card text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Link inválido o expirado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Los enlaces caducan por seguridad. Vuelve a pedir uno desde “¿Olvidaste tu contraseña?” en la pantalla de
          ingreso, o pide a tu administrador que reenvíe la invitación.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-card border border-border bg-card p-card shadow-card">
      <h1 className="text-2xl font-semibold text-foreground">Crea tu contraseña</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Con ella entrarás a tu cuenta de ahora en adelante.
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-danger">{errors.confirmPassword.message}</p>}
        </div>

        {setPassword.isError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">No se pudo guardar la contraseña. Intenta de nuevo.</p>}

        <Button type="submit" disabled={setPassword.isPending || entrando} className="mt-2 w-full rounded-pill">
          {entrando ? 'Entrando…' : setPassword.isPending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>

        {entrando && (
          <p className="text-center text-xs text-muted-foreground">
            Tu contraseña quedó guardada. Preparando tu empresa…
          </p>
        )}
      </form>
    </div>
  )
}
