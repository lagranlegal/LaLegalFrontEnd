import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type NotificationSettings = components['schemas']['NotificationSettingsOut']
export type NotificationSettingsUpdateIn = components['schemas']['NotificationSettingsUpdateIn']
export type NotificationEventSetting = components['schemas']['EventTypeSettingOut']
export type NotificationDelivery = components['schemas']['DeliveryOut']
export type DeliveryStatus = NotificationDelivery['status']

const SETTINGS_KEY = ['notifications', 'settings'] as const

export function useNotificationSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => unwrap(api.GET('/api/v1/notifications/settings')),
  })
}

/**
 * El PATCH responde lo mismo que el GET, así que se escribe directo en la
 * caché en vez de invalidar: la pantalla queda con lo que el backend guardó
 * de verdad (incluido `effective`, que depende del interruptor general) sin
 * un segundo request.
 */
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: NotificationSettingsUpdateIn) => unwrap(api.PATCH('/api/v1/notifications/settings', { body })),
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_KEY, data)
    },
  })
}

export function useNotificationDeliveries(filters: { status?: DeliveryStatus }) {
  return useCursorInfiniteQuery(['notifications', 'deliveries', filters], (cursor) =>
    unwrap(
      api.GET('/api/v1/notifications/deliveries', {
        params: { query: { cursor, limit: 25, status: filters.status ?? null } },
      }),
    ),
  )
}
