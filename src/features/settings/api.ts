import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { components } from '@/types/api'

export type CompanySettings = components['schemas']['CompanySettingsOut']
export type CompanySettingsUpdateIn = components['schemas']['CompanySettingsUpdateIn']

export function useCompanySettings() {
  return useQuery({
    queryKey: ['company', 'settings'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/company/settings')),
  })
}

export function useUpdateCompanySettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CompanySettingsUpdateIn) =>
      unwrap(api.PATCH('/api/v1/company/settings', { body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company', 'settings'] })
      // `GET /me` también trae la firma, el logo y los textos de documentos
      // (los necesita cualquier usuario que imprima, sin el permiso
      // `company.configure`) — sin esto el encabezado de la app y los
      // impresos siguen mostrando lo viejo hasta recargar la página.
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
