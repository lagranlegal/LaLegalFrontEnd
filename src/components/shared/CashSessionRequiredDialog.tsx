import { useState } from 'react'
import { AppDialog } from '@/components/shared/AppDialog'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { OpenSessionDialog } from '@/features/cashbox/components/OpenSessionDialog'

/**
 * `CASH_SESSION_NOT_OPEN` (docs/ARCHITECTURE.md §6): "Modal central 'Abrir
 * caja' con CTA directo a abrir sesión (si tiene `cashbox.open_close`) o
 * aviso de pedirle al responsable. Nunca un toast seco." `CashSessionBanner`
 * ya avisa permanentemente si la caja está cerrada — este modal es la
 * defensa en profundidad para cuando la mutación de dinero igual lo golpea
 * (ej. caja se cerró en otra pestaña entre que se cargó la pantalla y se
 * envió el abono/contrato).
 */
export function CashSessionRequiredDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [openSessionDialogOpen, setOpenSessionDialogOpen] = useState(false)

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Caja cerrada"
        description="Esta operación necesita una sesión de caja abierta hoy."
        size="sm"
        footer={
          <Can
            permission="cashbox.open_close"
            fallback={
              <Button variant="outline" className="w-full rounded-pill" onClick={() => onOpenChange(false)}>
                Entendido
              </Button>
            }
          >
            <Button
              className="w-full rounded-pill"
              onClick={() => {
                onOpenChange(false)
                setOpenSessionDialogOpen(true)
              }}
            >
              Abrir caja
            </Button>
          </Can>
        }
      />
      <OpenSessionDialog open={openSessionDialogOpen} onOpenChange={setOpenSessionDialogOpen} />
    </>
  )
}
