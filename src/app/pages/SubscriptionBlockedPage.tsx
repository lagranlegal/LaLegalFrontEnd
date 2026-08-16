/**
 * Pantalla completa de bloqueo por `SUBSCRIPTION_EXPIRED` (402) — no un
 * toast. La app no es usable con suscripción vencida
 * (docs/ARCHITECTURE.md §4.7).
 */
export function SubscriptionBlockedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-page">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-card text-center shadow-card">
        <h1 className="text-xl font-semibold text-foreground">Suscripción vencida</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La suscripción de tu empresa venció. Contacta al administrador de la plataforma para reactivarla.
        </p>
      </div>
    </div>
  )
}
