import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'

/**
 * `PERMISSION_DENIED` inesperado (el rol cambió por debajo, cache de 60s
 * del backend) → invalidar `['me']` además del toast de la feature que
 * disparó el error: la UI se corrige sola en el siguiente render
 * (docs/ARCHITECTURE.md §5, §6). Centralizado acá para no repetirlo en cada
 * `queryFn`/`mutationFn`.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'PERMISSION_DENIED') {
        queryClient.invalidateQueries({ queryKey: ['me'] })
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // app operativa multi-usuario (§3)
      // Sin esto el default es 0: CUALQUIER dato se considera obsoleto de
      // inmediato, así que `refetchOnWindowFocus` (arriba) reejecuta TODO lo
      // montado en cada alt-tab — incluidos los N artículos de un comprobante
      // abierto, aunque hayan pasado dos segundos desde que se cargó
      // (docs/PENDIENTES_FRONTEND.md #11). 15s sigue siendo "casi al
      // instante" para una app operativa — otro usuario cambiando algo hace
      // efecto igual, solo no en el mismo segundo — y absorbe el caso real:
      // revisar un mensaje y volver a la pestaña.
      staleTime: 15_000,
      // ApiError es determinístico (401/403/409…) — reintentar no cambia el
      // resultado y multiplica llamadas innecesarias (cada intento ya pasa
      // una vez por el refresh-retry de 401 en lib/api/client.ts). Solo
      // vale la pena reintentar fallas de red transitorias.
      retry: (failureCount, error) => !(error instanceof ApiError) && failureCount < 2,
    },
  },
})
