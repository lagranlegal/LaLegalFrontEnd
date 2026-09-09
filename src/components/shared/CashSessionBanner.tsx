import { useState } from 'react'
import { useCashboxCurrent } from '@/features/cashbox/api'
import { OpenSessionDialog } from '@/features/cashbox/components/OpenSessionDialog'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime, todayBogota } from '@/lib/dates'
import { isPermissionError } from '@/lib/api/isPermissionError'

/**
 * Franja global bajo la topbar: estado de caja visible en toda la app
 * (docs/DESIGN_SYSTEM.md §3). El estado de caja es contexto operativo
 * permanente — contratos y ventas dependen de que haya una sesión abierta.
 */
export function CashSessionBanner() {
  const { data: session, isPending, error } = useCashboxCurrent()
  const [openDialog, setOpenDialog] = useState(false)

  if (isPending) {
    return <div className="h-9 animate-pulse bg-background" />
  }

  // Sin `cashbox.view` no se puede saber si la caja está abierta, así que no
  // se afirma nada: la franja desaparece. Antes este caso caía en el mensaje
  // de "Caja cerrada" de abajo y le decía al usuario justo lo contrario de la
  // realidad — la caja estaba abierta, lo que faltaba era el permiso.
  if (isPermissionError(error)) {
    return null
  }

  // Cualquier otro fallo (red, backend caído) tampoco es "caja cerrada".
  if (error) {
    return (
      <div className="flex h-9 items-center justify-center bg-muted px-4 text-sm text-muted-foreground">
        No se pudo consultar el estado de la caja.
      </div>
    )
  }

  if (session) {
    // Una sesión que quedó abierta de un día anterior sigue siendo LA sesión:
    // todo lo que se registre hoy entra en ese turno, así que el acta de aquel
    // día terminará con movimientos de éste y el arqueo mezclará dos jornadas.
    // Sin la fecha, «abierta desde las 4:38 PM» leído a las 8 de la mañana es
    // incomprensible — o peor, se asume que es de hoy. El dato ya viaja en la
    // respuesta (`session_date`) y no se estaba usando (auditoría de QA, F9-01).
    const deOtroDia = session.session_date !== todayBogota()
    return (
      <div
        className={
          deOtroDia
            ? 'flex min-h-9 flex-wrap items-center justify-center gap-x-1.5 bg-warning-soft px-4 py-1 text-sm text-warning'
            : 'flex h-9 items-center justify-center gap-1.5 bg-success-soft px-4 text-sm text-success'
        }
      >
        <span>Caja abierta</span>
        {deOtroDia ? (
          <span>
            desde el {formatDate(session.session_date)} a las {formatTime(session.opened_at)} — ciérrala
            para empezar el turno de hoy
          </span>
        ) : (
          <span className="text-success/70">· desde las {formatTime(session.opened_at)}</span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex h-9 items-center justify-center gap-3 bg-warning-soft px-4 text-sm text-warning">
        <span>Caja cerrada — no se pueden registrar operaciones de dinero</span>
        <Can permission="cashbox.open_close" fallback={<span className="text-warning/70">Pídele a un responsable que la abra</span>}>
          <Button variant="ghost" size="xs" className="h-6 text-warning hover:bg-warning/10" onClick={() => setOpenDialog(true)}>
            Abrir caja
          </Button>
        </Can>
      </div>
      <OpenSessionDialog open={openDialog} onOpenChange={setOpenDialog} />
    </>
  )
}
