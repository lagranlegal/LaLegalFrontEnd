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
 * El correo de invitación de Supabase trae la sesión en la URL —
 * `detectSessionInUrl: true` (lib/auth/supabase.ts) ya la procesó al cargar
 * el cliente. Acá solo falta confirmar que quedó activa y pedir contraseña
 * (docs/ARCHITECTURE.md §4.3). El primer request al backend activa al
 * usuario (`invited → active`) automáticamente.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid'>('loading')
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
    await navigate({ to: '/' })
  }

  if (status === 'loading') {
    return <p className="text-sm text-muted-foreground">Verificando invitación…</p>
  }

  if (status === 'invalid') {
    return (
      <div className="w-full max-w-sm rounded-card border border-border bg-card p-card text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Link inválido o expirado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Pide a tu administrador que reenvíe la invitación.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-card border border-border bg-card p-card shadow-card">
      <h1 className="text-2xl font-semibold text-foreground">Crea tu contraseña</h1>
      <p className="mt-1 text-sm text-muted-foreground">Último paso para activar tu cuenta.</p>

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

        <Button type="submit" disabled={setPassword.isPending} className="mt-2 w-full rounded-pill">
          {setPassword.isPending ? 'Guardando…' : 'Activar cuenta'}
        </Button>
      </form>
    </div>
  )
}
