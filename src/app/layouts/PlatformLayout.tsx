import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/auth/supabase'
import { useLogout } from '@/features/auth/api'
import { Button } from '@/components/ui/button'

function useCurrentSessionEmail() {
  return useQuery({
    queryKey: ['auth', 'session-email'] as const,
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      return session?.user.email ?? null
    },
  })
}

/**
 * `/platform/*` — layout PROPIO, nunca `AppShell` (CLAUDE.md paso 10): un
 * super-admin no pertenece necesariamente a la empresa que está operando, y
 * esta pantalla no pasa por `/me` en absoluto (docs/ARCHITECTURE.md §4). La
 * banda superior usa los tokens `--platform`/`--platform-foreground`
 * (`styles/tokens.css`), deliberadamente distintos de la marca — para que
 * nunca se confunda con el contexto de un tenant normal.
 */
export function PlatformLayout() {
  const { data: email } = useCurrentSessionEmail()
  const logout = useLogout()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout.mutateAsync()
    await navigate({ to: '/auth/login' })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between gap-3 bg-platform px-4 text-platform-foreground">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-5" />
          <span className="text-sm font-semibold">Panel de plataforma</span>
        </div>
        <div className="flex items-center gap-3">
          {email && <span className="hidden text-xs text-platform-foreground/70 sm:inline">{email}</span>}
          <Button variant="ghost" size="sm" className="text-platform-foreground hover:bg-platform-foreground/10 hover:text-platform-foreground" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="flex-1 p-page">
        <Outlet />
      </main>
    </div>
  )
}
