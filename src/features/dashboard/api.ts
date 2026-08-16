import { queryOptions, useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'

export function dashboardQueryOptions() {
  return queryOptions({
    queryKey: ['dashboard'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/reports/dashboard')),
  })
}

export function useDashboard() {
  return useQuery(dashboardQueryOptions())
}
