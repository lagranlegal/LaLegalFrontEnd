import { ChevronDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePermission } from '@/lib/permissions/usePermission'

/**
 * Las acciones del encabezado del detalle (rediseño P2-a): «Imprimir» a la
 * vista y el resto detrás de «Más». Antes eran hasta cinco botones en fila
 * (imprimir, paz y salvo, editar, rematar) junto a la pastilla, y a 360 px
 * bajaban en dos renglones. Ninguna acción se perdió: cada una conserva su
 * condición y su permiso; si no queda ninguna, «Más» no aparece.
 *
 * Imprimir desde el menú espera a que el menú se cierre (`setTimeout`):
 * `window.print()` es sincrónico, y con el menú abierto el diálogo de
 * impresión arrancaba con el portal del menú todavía montado.
 */
export function ContractHeaderActions({
  printLoading,
  onPrint,
  settlementAvailable,
  settlementLoading,
  onPrintSettlement,
  onEdit,
  canAuction,
  auctionPending,
  onAuction,
}: {
  printLoading: boolean
  onPrint: () => void
  /** Pagado y con la información del paz y salvo cargada. */
  settlementAvailable: boolean
  settlementLoading: boolean
  onPrintSettlement: () => void
  onEdit: () => void
  /** Listo para remate (la prórroga venció). El permiso se mira acá. */
  canAuction: boolean
  auctionPending: boolean
  onAuction: () => void
}) {
  const canEdit = usePermission('contracts.edit')
  const hasAuctionPermission = usePermission('contracts.auction')
  const showAuction = canAuction && hasAuctionPermission
  const hasMenu = settlementAvailable || canEdit || showAuction

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" disabled={printLoading} onClick={onPrint}>
        <Printer aria-hidden />
        {printLoading ? 'Cargando…' : 'Imprimir'}
      </Button>
      {hasMenu && (
        // `modal={false}`: Editar y Rematar abren un diálogo; con el menú modal,
        // Radix dejaba el `pointer-events: none` del menú pegado al body.
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Más
              <ChevronDown aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-48">
            {settlementAvailable && (
              <DropdownMenuItem
                className="min-h-10 px-3"
                disabled={settlementLoading}
                onSelect={() => window.setTimeout(onPrintSettlement, 0)}
              >
                {settlementLoading ? 'Cargando paz y salvo…' : 'Imprimir paz y salvo'}
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem className="min-h-10 px-3" onSelect={onEdit}>
                Editar
              </DropdownMenuItem>
            )}
            {showAuction && (
              <>
                {(settlementAvailable || canEdit) && <DropdownMenuSeparator />}
                <DropdownMenuItem className="min-h-10 px-3" variant="destructive" disabled={auctionPending} onSelect={onAuction}>
                  {auctionPending ? 'Rematando…' : 'Rematar contrato'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
