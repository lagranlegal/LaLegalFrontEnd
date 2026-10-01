import { useState } from 'react'
import { useCashboxCurrent } from '@/features/cashbox/api'
import { OpenSessionDialog } from '@/features/cashbox/components/OpenSessionDialog'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/shared/Money'
import { formatClock, formatDate, todayBogota } from '@/lib/dates'
import { useMe } from '@/lib/auth/me'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { usePermission } from '@/lib/permissions/usePermission'

/** «Laura M.» de «Laura Martínez»: el nombre con la inicial del apellido. */
function shortName(fullName: string): string {
  const [first = '', second] = fullName.trim().split(/\s+/)
  return second ? `${first} ${second.charAt(0)}.` : first
}

/**
 * Franja global bajo la topbar: estado de caja visible en toda la app
 * (docs/DESIGN_SYSTEM.md §3). El estado de caja es contexto operativo
 * permanente — contratos y ventas dependen de que haya una sesión abierta.
 */
export function CashSessionBanner() {
  const canView = usePermission('cashbox.view')
  const { data: session, isPending, error } = useCashboxCurrent()
  const [openDialog, setOpenDialog] = useState(false)
  const { data: me } = useMe()

  // Sin `cashbox.view` la consulta ni sale (`useCashboxCurrent`): la franja no
  // afirma nada, y tampoco se queda cargando para siempre.
  if (!canView) return null

  if (isPending) {
    return <div className="h-11 animate-pulse bg-background" />
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
      <div className="flex min-h-11 items-center justify-center bg-muted px-4 text-sm text-muted-foreground">
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
    // El backend manda el nombre de quien abrió (`opened_by_name`, P2-e). Si no
    // viene (usuario de otra empresa o respuesta vieja) y la abrió quien está
    // usando la app, se usa su propio nombre; de otro, no se inventa.
    const openedBy = session.opened_by_name
      ? shortName(session.opened_by_name)
      : me && session.opened_by === me.user.id
        ? shortName(me.user.full_name)
        : null
    return (
      <div
        className={
          deOtroDia
            ? 'flex min-h-11 flex-wrap items-center justify-center gap-x-1.5 border-b border-border bg-warning-soft px-4 py-2 text-sm text-body'
            : 'flex min-h-11 flex-wrap items-center justify-between gap-x-3.5 gap-y-1 border-b border-border bg-success-soft px-4 py-2 text-caption text-body'
        }
      >
        {/* Un solo texto cuando es de otro día: con «Caja abierta» y «desde…»
            en dos elementos, el hueco entre ellos se leía como doble espacio. */}
        {deOtroDia ? (
          <span>
            <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full bg-warning" />
            <b className="font-semibold text-foreground">Caja abierta desde el {formatDate(session.session_date)}</b> a las{' '}
            {formatClock(session.opened_at)} — ciérrala para empezar el turno de hoy
          </span>
        ) : (
          <>
            {/* Rediseño P1: texto en tinta (el verde a 70 % no llegaba a AA) y
                el punto verde como única señal de color. P2-c: quién la abrió
                y desde qué hora, a la izquierda. */}
            <span>
              <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full bg-success" />
              <b className="font-semibold text-foreground">Caja abierta</b>
              {openedBy && <> por {openedBy}</>} desde {formatClock(session.opened_at)}
            </span>
            {/* «Efectivo esperado» a la derecha: `sessions/current` lo calcula
                en vivo con la caja abierta (P2-e); si no viene, no se muestra. */}
            {session.expected_cash && (
              <span>
                Efectivo esperado <Money value={session.expected_cash} className="font-semibold text-foreground" />
              </span>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {/* F9-02: «Abrir caja» era un objetivo de 73×24 px en el celular, y es la
          acción más importante del día. Ahora es un botón secundario de 36 px
          con área táctil de 44 (el pseudo-elemento la amplía sin agrandar la
          franja). */}
      <div className="flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-warning-soft px-4 py-1 text-sm text-body">
        <span>
          <span aria-hidden className="mr-1.5 inline-block size-2 rounded-full bg-warning" />
          <b className="font-semibold text-foreground">Caja cerrada</b> — no se pueden registrar operaciones de dinero
        </span>
        <Can permission="cashbox.open_close" fallback={<span>Pídele a un responsable que la abra</span>}>
          <Button
            variant="outline"
            size="sm"
            data-touch-target
            className="relative after:absolute after:inset-x-0 after:-inset-y-1"
            onClick={() => setOpenDialog(true)}
          >
            Abrir caja
          </Button>
        </Can>
      </div>
      <OpenSessionDialog open={openDialog} onOpenChange={setOpenDialog} />
    </>
  )
}
