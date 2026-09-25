import { useParams } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { userMessage } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/dates'
import { useConfirmUnsubscribe, useUnsubscribeInfo } from '@/features/unsubscribe/api'

/**
 * `/baja/$token` — la página a la que lleva el enlace «Darse de baja» de los
 * correos al cliente (`../backend-starter/docs/NOTIFICACIONES.md` §9.2-e, §17).
 *
 * Pública y SIN gate de permiso, a propósito: quien llega no es usuario de
 * Prendo, no tiene sesión y no la va a tener. Lo que la autoriza es el token
 * firmado de la URL, que el backend valida. Es la misma excepción que el
 * backend anota en `test_endpoint_guards.py`.
 *
 * **Abrirla no da de baja.** Muestra de qué empresa y a qué correo, y espera
 * un clic. Un escáner que abre el enlace —o que lo abre y ejecuta el JS— no
 * toca nada.
 *
 * Tuteo NO: el destinatario es el cliente de la compraventa, y los correos le
 * hablan de usted (plantillas del backend). La página sigue el mismo tono.
 */
export function UnsubscribePage() {
  const { token } = useParams({ from: '/baja/$token' })
  const info = useUnsubscribeInfo(token)
  const confirm = useConfirmUnsubscribe(token)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-page">
      <main className="w-full max-w-md rounded-card border border-border bg-card p-card shadow-card">
        {info.isPending ? (
          <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-3">
            <div className="h-6 w-2/3 animate-pulse rounded-input bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-input bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded-input bg-muted" />
            <div className="mt-2 h-10 w-full animate-pulse rounded-pill bg-muted" />
          </div>
        ) : info.isError ? (
          <InvalidOrUnreachable error={info.error} onRetry={() => void info.refetch()} />
        ) : info.data.unsubscribed_at ? (
          <div role="status">
            <h1 className="text-xl font-semibold text-foreground">Ya no recibirá avisos por correo</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {info.data.company_name} no le enviará más avisos
              {info.data.email_hint ? ` a ${info.data.email_hint}` : ''}. La baja quedó registrada el{' '}
              {formatDateTime(info.data.unsubscribed_at)}.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Si fue un error o cambia de opinión, pídalo directamente en {info.data.company_name}.
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dejar de recibir avisos por correo</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Va a dejar de recibir los avisos por correo de <span className="font-medium text-foreground">{info.data.company_name}</span>
              {info.data.email_hint ? (
                <>
                  {' '}
                  en <span className="font-medium text-foreground break-all">{info.data.email_hint}</span>
                </>
              ) : null}
              : recordatorios de cuota, abonos y demás.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Sus contratos no cambian: solo dejan de llegarle los correos.</p>
            {confirm.isError && (
              <p className="mt-3 rounded-input bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
                {confirm.error instanceof ApiError ? userMessage(confirm.error) : 'No se pudo conectar. Intente de nuevo.'}
              </p>
            )}
            <Button className="mt-4 w-full rounded-pill" onClick={() => confirm.mutate()} disabled={confirm.isPending}>
              {confirm.isPending ? 'Registrando…' : 'Dejar de recibir avisos'}
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function InvalidOrUnreachable({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  // Enlace inválido: no hay nada que reintentar, y el mensaje del backend ya
  // dice qué hacer. Cualquier otra cosa (red, 5xx) sí se reintenta.
  if (error instanceof ApiError && error.code === 'UNSUBSCRIBE_LINK_INVALID') {
    return (
      <div role="alert">
        <h1 className="text-xl font-semibold text-foreground">Enlace no válido</h1>
        <p className="mt-2 text-sm text-muted-foreground">{userMessage(error)}</p>
      </div>
    )
  }
  return (
    <div role="alert">
      <h1 className="text-xl font-semibold text-foreground">No se pudo cargar</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error instanceof ApiError ? userMessage(error) : 'No se pudo conectar con el servidor.'}
      </p>
      <Button variant="outline" className="mt-4 w-full rounded-pill" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
