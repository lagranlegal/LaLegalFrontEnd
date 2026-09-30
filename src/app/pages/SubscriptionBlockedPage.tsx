import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useLogout } from '@/features/auth/api'

/**
 * Pantalla completa de bloqueo por `SUBSCRIPTION_EXPIRED` (402) — no un
 * toast. La app no es usable con suscripción vencida
 * (docs/ARQUITECTURA.md §4.7).
 *
 * Con salida (F9-61): antes no tenía ningún botón, ni para cerrar sesión (y
 * entrar con otra cuenta) ni para volver a intentar cuando ya se reactivó.
 */
export function SubscriptionBlockedPage() {
  const navigate = useNavigate()
  const logout = useLogout()

  async function handleLogout() {
    await logout.mutateAsync()
    await navigate({ to: '/auth/login' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-page">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-card text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Suscripción vencida</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La suscripción de tu empresa venció. Contacta al administrador de la plataforma para reactivarla.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button className="w-full rounded-pill" onClick={() => void navigate({ to: '/inicio' })}>
            Ya la reactivaron: volver a intentar
          </Button>
          <Button variant="ghost" className="w-full" disabled={logout.isPending} onClick={() => void handleLogout()}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  )
}
