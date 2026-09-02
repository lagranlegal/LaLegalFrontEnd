import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

/**
 * Bootstrap de sesión (docs/ARCHITECTURE.md §4.5): fuente de permisos,
 * timezone de la empresa, rol y estado de suscripción. Vive en `lib/auth`
 * (no en `features/auth`) porque lo consumen capas transversales que no son
 * la feature de login: permisos (`lib/permissions`), `AppShell`, el guard de
 * suscripción del router y `lib/dates` (vía `setActiveTimezone`).
 */
export type Me = components['schemas']['MeOut']

const ME_STALE_TIME_MS = 60_000 // mismo TTL del cache de permisos del backend

export function meQueryOptions() {
  return queryOptions({
    queryKey: ['me'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/me')),
    staleTime: ME_STALE_TIME_MS,
  })
}

export function useMe() {
  return useQuery(meQueryOptions())
}

export type MeUpdate = components['schemas']['MeUpdateIn']

/**
 * El usuario edita su propio perfil (nombre y foto). `PATCH /me` devuelve el
 * `MeOut` completo ya actualizado, así que se escribe directo en el cache en
 * vez de invalidar y volver a pedir: la pantalla no parpadea y el shell
 * (nombre en el topbar) se actualiza en el mismo render.
 */
export function useUpdateMe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: MeUpdate) => unwrap(api.PATCH('/api/v1/me', { body })),
    onSuccess: (me) => queryClient.setQueryData(['me'], me),
  })
}
