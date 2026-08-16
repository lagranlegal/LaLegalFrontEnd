import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useIdempotencyKey } from '@/lib/api/idempotency'

/**
 * Toda mutación de dinero pasa por acá (CLAUDE.md regla 8): la
 * `Idempotency-Key` se genera una vez por acción de usuario (al montar —
 * combinar con el patrón de remount-por-`key` de los diálogos para que una
 * apertura nueva del formulario cuente como acción nueva) y los reintentos
 * de red reusan la MISMA key hasta que la mutación tenga éxito. `isPending`
 * es lo que deshabilita el botón de dinero — nunca doble submit posible.
 */
export function useMoneyMutation<TData, TVariables>({
  mutationFn,
  onSuccess,
  invalidateKeys = [],
}: {
  mutationFn: (variables: TVariables, idempotencyKey: string) => Promise<TData>
  onSuccess?: (data: TData, variables: TVariables) => void
  invalidateKeys?: QueryKey[]
}) {
  const queryClient = useQueryClient()
  const { key, reset } = useIdempotencyKey()

  return useMutation({
    mutationFn: (variables: TVariables) => mutationFn(variables, key),
    onSuccess: (data, variables) => {
      reset()
      for (const queryKey of invalidateKeys) {
        void queryClient.invalidateQueries({ queryKey })
      }
      onSuccess?.(data, variables)
    },
  })
}
