import { Money } from '@/components/shared/Money'
import { usePermission } from '@/lib/permissions/usePermission'
import type { LtvEstado } from '@/features/contracts/ltv'

/**
 * El cupo del LTV, ANTES de prestar.
 *
 * Hasta ahora la alerta vivía en el detalle del contrato ya creado: llegaba
 * después de que la plata salió. Y desde `00051` pasarse **bloquea** a quien
 * no tenga `contracts.override_ltv`, así que un asesor podía llenar el
 * formulario entero para recibir un 403 al final.
 *
 * Muestra la cuenta —`avalúo × LTV`— y no solo el veredicto, por lo mismo que
 * la hace el panel del recargo: desarma el *"¿por qué solo 1.400.000?"* antes
 * de que lo pregunten, y hace obvio el problema si alguien dejó el LTV en un
 * valor absurdo — que es exactamente lo que había pasado con el 10 %.
 *
 * **No deshabilita el botón.** Quien decide es el backend; si esta cuenta y la
 * suya divergieran por un redondeo, bloquear acá impediría un contrato que el
 * servidor sí acepta. Avisar resuelve lo reportado, bloquear crearía otro
 * problema.
 */
export function LtvHint({ estado }: { estado: LtvEstado }) {
  const puedeAutorizar = usePermission('contracts.override_ltv')

  if (estado.kind === 'sin-datos') return null

  if (estado.kind === 'dentro') {
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        Puede prestar hasta <Money value={estado.cupo} className="font-medium text-foreground" /> por esta garantía —{' '}
        {estado.maxLtvPct}% del avalúo. Va en el {estado.ltvPct.toFixed(0)}%.
      </p>
    )
  }

  return (
    <div className="mt-2 rounded-card bg-warning-soft px-3 py-2.5 text-sm text-warning">
      <p className="font-medium">
        Supera el cupo de la garantía en <Money value={estado.exceso} />
      </p>
      <p className="mt-1">
        El máximo para esta categoría es el {estado.maxLtvPct}% del avalúo (<Money value={estado.cupo} />) y este
        préstamo va en el {estado.ltvPct.toFixed(0)}%.
      </p>
      <p className="mt-1">
        {puedeAutorizar
          ? 'Puedes registrarlo igual: queda marcado como excedido y con tu nombre como quien lo autorizó.'
          : 'Tu rol no puede registrar un préstamo por encima del cupo. Baja el monto, sube el avalúo, o pídele a un responsable que lo autorice.'}
      </p>
    </div>
  )
}
