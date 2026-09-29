import { Money } from '@/components/shared/Money'
import { isInPortfolio } from '@/features/contracts/export'
import type { Contract } from '@/features/contracts/api'

/**
 * Columna «Saldo en cartera» de la lista de contratos: lo mismo que la hoja
 * Contratos del Excel (F7-10). Un contrato rematado o sucedido por un recargo
 * conserva su `capital_balance` en la base, pero esa plata ya no está
 * prestada —se volvió inventario o vive en el contrato nuevo—; mostrarla
 * como saldo hacía que la pantalla y el Excel dijeran cosas distintas
 * (verificación F/G). Va en $ 0 con la etiqueta que lo explica; el saldo al
 * cierre sigue en el detalle del contrato.
 */
export function PortfolioBalanceCell({ contract }: { contract: Contract }) {
  if (isInPortfolio(contract)) return <Money value={contract.capital_balance} />
  return (
    <span className="flex flex-col">
      <Money value="0" />
      <span className="text-xs text-muted-foreground">fuera de cartera</span>
    </span>
  )
}
