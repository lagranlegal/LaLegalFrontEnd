import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  description?: string
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
