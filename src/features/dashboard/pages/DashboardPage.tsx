import { useMe } from '@/lib/auth/me'

/**
 * Placeholder del paso 2 (Auth + shell): confirma que la ruta protegida y
 * `/me` funcionan de punta a punta. Se reemplaza en el paso 3 por los KPIs
 * reales de `GET /reports/dashboard` + `CashSessionBanner`.
 */
export function DashboardPage() {
  const { data: me } = useMe()

  return (
    <div className="rounded-card border border-border bg-card p-card shadow-card">
      <p className="text-sm text-muted-foreground">Inicio</p>
      <h1 className="text-2xl font-semibold text-foreground">Hola, {me?.user.full_name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {me?.company.name} · {me?.role.name} · plan {me?.plan.name}
      </p>
    </div>
  )
}
