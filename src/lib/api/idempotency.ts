import { useCallback, useState } from 'react'

/**
 * Un UUID por acción de usuario (CLAUDE.md regla 8): se genera al abrir el
 * formulario/confirmación, NO por request — los reintentos de red reusan el
 * mismo. Llamar `reset()` tras un éxito o al reabrir el formulario para una
 * acción nueva.
 *
 * Primitiva sobre la que se construye `useMoneyMutation` (mutaciones de
 * dinero: abonos, ventas, contratos) cuando se implemente esa feature.
 */
export function useIdempotencyKey(): { key: string; reset: () => void } {
  const [key, setKey] = useState<string>(() => crypto.randomUUID())
  const reset = useCallback(() => setKey(crypto.randomUUID()), [])
  return { key, reset }
}
