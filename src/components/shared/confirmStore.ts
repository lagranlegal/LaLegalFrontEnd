import { create } from 'zustand'

/**
 * Un renglón del resumen. `emphasis: 'total'` es el monto que se mueve (va
 * último, en fondo de marca y en negrita); `'after'` dice cómo queda la cosa
 * después («Al día, pagado hasta…»), en verde.
 */
export interface ConfirmSummaryRow {
  label: string
  value: string | null | undefined
  emphasis?: 'total' | 'after'
}

export interface ConfirmOptions {
  title: string
  description?: string
  /** Resumen de lo que se va a registrar, renglón por renglón (F9-18): es el
   *  último control antes de mover plata, así que repite a quién, cuánto, cómo
   *  y a dónde. Los renglones sin valor no se pintan. */
  summary?: ConfirmSummaryRow[]
  tone?: 'default' | 'danger'
  confirmLabel?: string
  cancelLabel?: string
  /** Textarea obligatoria (anular, reabrir, descuadre, descuento — docs/DESIGN_SYSTEM.md §3). */
  requireReason?: boolean
  reasonLabel?: string
}

export interface ConfirmResult {
  confirmed: boolean
  reason?: string
}

interface ConfirmStoreState {
  /** Cambia en cada `confirm()` — fuerza remount de `ConfirmDialogInner` para limpiar el motivo de la vez anterior. */
  id: number
  options: ConfirmOptions | null
  resolver: ((result: ConfirmResult) => void) | null
}

export const useConfirmStore = create<ConfirmStoreState>(() => ({ id: 0, options: null, resolver: null }))

/**
 * `await confirm({title, tone:'danger'})` — confirmación imperativa para
 * acciones destructivas o de dinero (docs/DESIGN_SYSTEM.md §3: anular,
 * rematar, reabrir caja). El host único vive en `ConfirmDialog.tsx`, montado
 * una vez en `main.tsx` — cualquier feature puede llamar esto sin renderizar
 * su propio modal.
 */
export function confirm(options: ConfirmOptions): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    const { id } = useConfirmStore.getState()
    useConfirmStore.setState({ id: id + 1, options, resolver: resolve })
  })
}

export function resolveConfirm(result: ConfirmResult): void {
  const { resolver } = useConfirmStore.getState()
  resolver?.(result)
  useConfirmStore.setState({ options: null, resolver: null })
}
