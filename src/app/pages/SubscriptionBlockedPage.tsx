import { useNavigate } from '@tanstack/react-router'
import { CalendarX2 } from 'lucide-react'
import { ExitPage } from '@/components/shared/ExitPage'
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
    <ExitPage
      icon={CalendarX2}
      tone="warning"
      title="La suscripción de tu empresa venció"
      actions={
        <>
          <Button size="lg" className="w-full" onClick={() => void navigate({ to: '/inicio' })}>
            Ya la reactivaron: volver a intentar
          </Button>
          <Button variant="ghost" className="w-full" disabled={logout.isPending} onClick={() => void handleLogout()}>
            Cerrar sesión
          </Button>
        </>
      }
    >
      Mientras esté vencida, la app no deja registrar ni consultar. Pídele al administrador de tu empresa que la renueve con Prendo; tus datos
      siguen guardados.
    </ExitPage>
  )
}
