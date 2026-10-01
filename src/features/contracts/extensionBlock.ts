import { formatDate } from '@/lib/dates'

/**
 * Qué hace el panel «Ampliar el préstamo» con el motivo que devuelve
 * `GET /contracts/{id}/extension-options` (backend-starter/docs/DOMINIO.md §3).
 *
 * Es una función aparte, y no un `if` dentro del componente, porque acá vivió
 * F21-38 («solo se puede ampliar una vez»): el panel trataba los cinco
 * motivos como bloqueos iguales, y NO lo son.
 *
 * - **`EXTENSION_NO_HEADROOM` no es un bloqueo duro.** Por backend-starter/docs/DOMINIO.md §3,
 *   pasarse del cupo lo gobierna `contracts.override_ltv`: quien lo tiene
 *   presta por encima del avalúo con advertencia (el backend lo acepta y
 *   marca `ltv_warning`); quien no, queda bloqueado. Como la primera
 *   ampliación casi siempre se lleva el cupo entero, esconder el formulario
 *   acá hacía que el sucesor pareciera no poder ampliarse nunca más — aun
 *   para el dueño.
 * - **La ventana sí es un bloqueo duro, y es deliberado** (§3): se cuenta
 *   desde el contrato ORIGINAL de la cadena. Si ampliar la reiniciara, un
 *   recargo de $1 el último día abriría otra, y así sin fin. Pero desde el
 *   sucesor eso es invisible — por eso el mensaje nombra al original.
 */
export type ExtensionBlock =
  | { kind: 'hidden' }
  | { kind: 'open'; overLimitOnly: boolean }
  | { kind: 'blocked'; title: string; message: string }

export interface ExtensionBlockInput {
  blockedReason: string | null | undefined
  canOverrideLtv: boolean
  windowEndsOn: string | null
  /** El contrato original de la cadena, SOLO si el actual es un sucesor. */
  root?: { number: number; start_date: string } | null
}

// El título dice que no se puede; el mensaje, la salida (rediseño P2-a, F9-17:
// «Lo bloqueado explica, no promete»).
const FIJOS: Record<string, { title: string; message: string }> = {
  CONTRACT_INTEREST_OVERDUE: { title: 'No disponible mientras esté en mora.', message: 'Ponlo al día para ver cuánto puede retirar.' },
  CONTRACT_WITHOUT_APPRAISAL: { title: 'No disponible sin avalúo.', message: 'Sin avalúo no se puede calcular cuánto puede retirar. Regístralo en Editar.' },
}

function ventanaCerrada(windowEndsOn: string | null, root: ExtensionBlockInput['root']): string {
  // `window_ends_on = null` es la ventana en 0: la empresa (o este contrato)
  // apagó las ampliaciones. No hay un plazo que haya "pasado".
  if (!windowEndsOn) return 'Este contrato no admite ampliaciones: se creó con 0 días para ampliar.'
  if (root) {
    return (
      `El plazo para ampliar se cuenta desde el contrato original (#${root.number}, del ` +
      `${formatDate(root.start_date)}) y venció el ${formatDate(windowEndsOn)}. Ampliar no ` +
      'reinicia ese plazo: si lo hiciera, un recargo pequeño el último día abriría otro, y así sin fin.'
    )
  }
  return `El plazo para ampliar este préstamo venció el ${formatDate(windowEndsOn)}.`
}

export function extensionBlock({ blockedReason, canOverrideLtv, windowEndsOn, root }: ExtensionBlockInput): ExtensionBlock {
  if (!blockedReason) return { kind: 'open', overLimitOnly: false }
  // Un contrato cerrado (pagado, rematado o ya ampliado) no muestra el panel:
  // el documento terminó. En uno ampliado, el aviso de la cadena lleva al
  // sucesor, que es donde se amplía de nuevo.
  if (blockedReason === 'CONTRACT_CLOSED') return { kind: 'hidden' }
  if (blockedReason === 'EXTENSION_NO_HEADROOM') {
    if (canOverrideLtv) return { kind: 'open', overLimitOnly: true }
    return {
      kind: 'blocked',
      title: 'No queda cupo sobre el avalúo.',
      message:
        'La garantía ya no da para más: el préstamo llegó al tope del avalúo. Prestar por encima ' +
        'solo lo puede autorizar quien tenga el permiso para hacerlo.',
    }
  }
  if (blockedReason === 'EXTENSION_WINDOW_CLOSED') {
    return { kind: 'blocked', title: 'Ya no se puede ampliar.', message: ventanaCerrada(windowEndsOn, root) }
  }
  return { kind: 'blocked', ...(FIJOS[blockedReason] ?? { title: 'No disponible.', message: 'No se puede ampliar este préstamo ahora.' }) }
}
