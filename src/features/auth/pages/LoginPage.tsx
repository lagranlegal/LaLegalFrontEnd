import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useLogin } from '@/features/auth/api'

const loginSchema = z.object({
  email: z.string().min(1, 'El correo es obligatorio').email('Correo inválido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const LOGOUT_REASON_MESSAGES: Record<string, string> = {
  session_expired: 'Tu sesión expiró. Ingresa de nuevo.',
  inactive: 'Tu usuario o tu empresa están inactivos. Contacta a tu administrador.',
}

export function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/auth/login' })
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginFormValues) {
    try {
      await login.mutateAsync(values)
      await navigate({ to: search.redirect || '/' })
    } catch {
      // login.error ya queda disponible para mostrarlo abajo — no hace falta relanzar.
    }
  }

  const reasonMessage = search.reason ? LOGOUT_REASON_MESSAGES[search.reason] : undefined

  return (
    <div className="w-full max-w-sm rounded-card border border-border bg-card p-card shadow-card">
      <h1 className="text-2xl font-semibold text-foreground">Ingresar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Entra con tu correo y contraseña.</p>

      {reasonMessage && (
        <p className="mt-4 rounded-input bg-warning-soft px-3 py-2 text-sm text-warning">{reasonMessage}</p>
      )}

      <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-sm text-danger">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-sm text-danger">{errors.password.message}</p>}
        </div>

        {login.isError && (
          <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">Correo o contraseña incorrectos.</p>
        )}

        <Button type="submit" disabled={login.isPending} className="mt-2 w-full rounded-pill">
          {login.isPending ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        El alta es solo por invitación — contacta a tu administrador si aún no tienes cuenta.
      </p>
    </div>
  )
}
