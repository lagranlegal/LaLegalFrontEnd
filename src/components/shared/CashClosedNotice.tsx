import { useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { useCashboxCurrent } from '@/features/cashbox/api'
import { OpenSessionDialog } from '@/features/cashbox/components/OpenSessionDialog'
import { Callout } from '@/components/shared/Callout'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'

/**
 * Aviso ANTES de llenar una operación de dinero en efectivo con la caja
 * cerrada (F9-19). Antes el usuario elegía la opción, llenaba el formulario y
 * confirmaba, y el bloqueo llegaba recién con la respuesta del backend
 * (`CASH_SESSION_NOT_OPEN` → diálogo).
 *
 * No bloquea nada: quien exige el turno es la cuenta de EFECTIVO, no la
 * operación (backend-starter/docs/DOMINIO.md §4.3). Una venta o un abono por
 * transferencia siguen sin caja abierta, así que el aviso solo sale con el
 * medio `cash` (que siempre va a una cuenta de efectivo, `AccountPicker`) y el
 * diálogo de `CASH_SESSION_NOT_OPEN` sigue siendo la red.
 *
 * Solo afirma "cerrada" cuando lo sabe: cargando, sin `cashbox.view` o con la
 * consulta en error, no muestra nada (DESIGN_SYSTEM §4, regla 8).
 */
export function CashClosedNotice({ paymentMethod, className }: { paymentMethod: string | null | undefined; className?: string }) {
  const { data: session, isPending, error } = useCashboxCurrent()
  const [openDialog, setOpenDialog] = useState(false)

  if (paymentMethod !== 'cash' || isPending || error || session !== null) return null

  return (
    <>
      <Callout
        tone="warning"
        icon={LockKeyhole}
        className={className}
        title="La caja está cerrada"
        action={
          <Can permission="cashbox.open_close" fallback={<span className="text-muted-foreground">Pídele a un responsable que la abra.</span>}>
            <Button type="button" size="sm" className="rounded-pill" onClick={() => setOpenDialog(true)}>
              Abrir caja
            </Button>
          </Can>
        }
      >
        <p>Para registrar esta operación en efectivo hay que abrir la caja primero. Por transferencia u otro medio sí se puede sin abrirla.</p>
      </Callout>
      <OpenSessionDialog open={openDialog} onOpenChange={setOpenDialog} />
    </>
  )
}
