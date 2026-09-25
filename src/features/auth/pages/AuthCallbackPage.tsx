import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { initialUrl, supabase } from '@/lib/auth/supabase'
import { canjeFallidoEsDefinitivo, setPasswordErrorMessage, useSetPassword } from '@/features/auth/api'

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

/** Los dos tipos de enlace que arma el backend (`identity/auth_admin.py::_app_link`). */
type TipoEnlace = 'invite' | 'recovery'

/**
 * Cómo llega alguien acá, y por qué el orden importa.
 *
 * 1. `?token_hash=...&type=invite|recovery` — el camino BUENO, el que arma el
 *    backend: el de «Generar enlace» y, desde el 24/09/2026, también el del
 *    correo de invitación, que sale por el correo propio de la plataforma y
 *    no por el de Supabase. El token se canjea acá con `verifyOtp`, que es un
 *    POST: un crawler de vista previa (WhatsApp, Telegram, Gmail) que pida
 *    esta URL por GET se baja el HTML de la SPA y no quema nada.
 *
 *    Y el canje NO corre al cargar: espera a que la persona toque
 *    «Continuar». Algunos escáneres de correo (Safe Links de Microsoft, los
 *    antivirus que "detonan" enlaces en un navegador) no solo piden la URL:
 *    la EJECUTAN. Con el canje en un `useEffect` bastaba con eso para
 *    quemarlo — la misma falla del 03/09, un piso más arriba. Un clic de más
 *    es el precio; es también lo que recomienda Supabase para el "email
 *    prefetching". De paso deja de quemarse en desarrollo, donde
 *    `StrictMode` monta dos veces y el segundo `verifyOtp` fallaba siempre.
 * 2. `#access_token=...` — enlaces viejos (el `action_link` de GoTrue) y los
 *    del correo de Supabase («¿Olvidaste tu contraseña?», o una invitación
 *    cuando la plataforma no tiene correo propio). `detectSessionInUrl: true`
 *    ya los procesó antes de que este componente montara — ese camino sigue
 *    expuesto a los escáneres, y no hay cómo arreglarlo desde acá.
 * 3. `#error_code=otp_expired` — el enlace llegó muerto: alguien ya lo abrió
 *    (casi siempre un crawler de vista previa) o venció. Reintentar NO puede
 *    funcionar; hay que pedir uno nuevo, y eso es lo que hay que decir.
 *
 * En los tres casos el objetivo es el mismo: que quede una sesión activa antes
 * de pedir la contraseña.
 *
 * OJO: esta ruta NO puede estar detrás de un guard de "si hay sesión, redirige
 * a /". Tener sesión es su condición de funcionamiento, no un error. Ese guard
 * vivía en el layout padre y hacía que el invitado entrara a la app sin haber
 * puesto contraseña — y sin poder volver a entrar después de cerrar sesión.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<
    'loading' | 'confirmar' | 'verificando' | 'fallo' | 'ready' | 'invalid' | 'quemado'
  >('loading')
  /** El token por canjear, mientras la persona no toque «Continuar». */
  const [enlace, setEnlace] = useState<{ tokenHash: string; tipo: TipoEnlace } | null>(null)
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
    let cancelado = false

    async function leerEnlace() {
      // `initialUrl`, no `window.location`: para cuando este efecto corre, el
      // cliente de Supabase ya limpió el fragmento de la barra de direcciones.
      const url = new URL(initialUrl || window.location.href)
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      const tokenHash = url.searchParams.get('token_hash')
      const tipo = url.searchParams.get('type')

      if (hash.get('error_code') || hash.get('error')) {
        if (!cancelado) setStatus('quemado')
        return
      }

      if (tokenHash && (tipo === 'invite' || tipo === 'recovery')) {
        // Solo se anota. Canjearlo acá es justo lo que un escáner que
        // ejecute la página haría por la persona — ver el comentario de arriba.
        if (!cancelado) {
          setEnlace({ tokenHash, tipo })
          setStatus('confirmar')
        }
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!cancelado) setStatus(data.session ? 'ready' : 'invalid')
    }

    void leerEnlace()
    return () => {
      cancelado = true
    }
  }, [])

  async function canjear() {
    if (!enlace) return
    setStatus('verificando')
    const { error } = await supabase.auth.verifyOtp({ token_hash: enlace.tokenHash, type: enlace.tipo })
    if (error && !canjeFallidoEsDefinitivo(error)) {
      // Sin red, 5xx o 429: el token casi seguro sigue sirviendo. Se queda en
      // la URL y en memoria para reintentar, en vez de mandar a pedir otro.
      setStatus('fallo')
      return
    }
    // Se limpia el token de la barra de direcciones apenas se canjea (o se
    // sabe muerto): es una credencial, y quedaría en el historial y en
    // cualquier captura de pantalla que la persona mande pidiendo ayuda.
    window.history.replaceState(null, '', window.location.pathname)
    setEnlace(null)
    setStatus(error ? 'quemado' : 'ready')
  }

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
    return <p className="text-sm text-muted-foreground">Verificando enlace…</p>
  }

  // El paso que un escáner que ejecute la página no da: nada se canjea hasta
  // que alguien toque el botón.
  if ((status === 'confirmar' || status === 'verificando' || status === 'fallo') && enlace) {
    const esInvitacion = enlace.tipo === 'invite'
    return (
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-card text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">{esInvitacion ? 'Activa tu cuenta' : 'Cambia tu contraseña'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {esInvitacion
            ? 'Toca «Continuar» para verificar tu invitación y crear tu contraseña.'
            : 'Toca «Continuar» para verificar el enlace y elegir una contraseña nueva.'}
        </p>
        {status === 'fallo' && (
          <p className="mt-4 rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">
            No se pudo verificar el enlace. Revisa tu conexión a internet y vuelve a intentarlo.
          </p>
        )}
        <Button
          type="button"
          onClick={() => void canjear()}
          disabled={status === 'verificando'}
          className="mt-6 w-full rounded-pill"
        >
          {status === 'verificando' ? 'Verificando…' : status === 'fallo' ? 'Intentar de nuevo' : 'Continuar'}
        </Button>
      </div>
    )
  }

  // Caso aparte de `invalid` porque la causa más común NO es que la persona se
  // haya demorado: es que el enlace se abrió solo. Y "o venció" porque Supabase
  // responde lo mismo (`otp_expired`) en los dos casos: con la invitación
  // llegando por correo, abrirla días después ya no es raro, y un "ya se usó"
  // a secas la manda a creer que alguien más entró.
  //
  // No se ofrece reintentar: con este token no puede funcionar. Y se pide un
  // enlace, no "otra invitación": reinvitar al mismo correo responde
  // `USER_ALREADY_INVITED`; lo que sirve es «Generar enlace de activación»
  // en la ficha de la persona (RUNBOOK_USUARIOS.md §4).
  if (status === 'quemado') {
    return (
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-card text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Este enlace ya se usó o venció</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada enlace sirve una sola vez y por tiempo limitado. Pídele a tu administrador que genere uno nuevo y ábrelo
          apenas te llegue.
        </p>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-card text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Link inválido o expirado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Los enlaces caducan por seguridad. Vuelve a pedir uno desde “¿Olvidaste tu contraseña?” en la pantalla de
          ingreso, o pide a tu administrador que te genere un enlace nuevo.
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

        {/* El mensaje sale del error REAL de Supabase, no de un texto fijo:
            "intenta de nuevo" es el peor consejo posible cuando el enlace ya
            venció — reintentar no puede funcionar. Ver `setPasswordErrorMessage`. */}
        {setPassword.isError && (
          <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{setPasswordErrorMessage(setPassword.error)}</p>
        )}

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
