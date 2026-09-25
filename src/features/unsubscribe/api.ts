import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

/**
 * La baja de los avisos por correo desde el enlace del correo
 * (`../backend-starter/docs/NOTIFICACIONES.md` §17). Endpoints PÚBLICOS: quien
 * abre el enlace es un cliente de la compraventa, no un usuario de Prendo.
 *
 * **El GET solo lee; la baja es el POST, y la dispara un clic.** Los escáneres
 * de correo y las vistas previas abren cada enlace solos (03/09/2026): si la
 * página llamara al POST al montar —como hacía `/auth/callback` con el
 * `verifyOtp` antes de `cf1285a`—, un escáner que ejecuta JavaScript daría de
 * baja al cliente sin que nadie haya leído el correo.
 */
export type UnsubscribeInfo = components['schemas']['UnsubscribeOut']

const key = (token: string) => ['unsubscribe', token] as const

export function useUnsubscribeInfo(token: string) {
  return useQuery({
    queryKey: key(token),
    queryFn: () => unwrap(api.GET('/api/v1/public/unsubscribe/{token}', { params: { path: { token } } })),
    // Un enlace inválido no se arregla reintentando.
    retry: false,
  })
}

export function useConfirmUnsubscribe(token: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unwrap(api.POST('/api/v1/public/unsubscribe/{token}', { params: { path: { token } } })),
    onSuccess: (data) => queryClient.setQueryData(key(token), data),
  })
}
