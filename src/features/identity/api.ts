import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import type { components } from '@/types/api'

export type User = components['schemas']['UserOut']
export type InviteUserIn = components['schemas']['InviteUserIn']
export type UpdateUserRoleIn = components['schemas']['UpdateUserRoleIn']
export type Role = components['schemas']['RoleOut']
export type RoleCreateIn = components['schemas']['RoleCreateIn']
export type RoleRenameIn = components['schemas']['RoleRenameIn']
export type Permission = components['schemas']['PermissionOut']

export function useUsersList() {
  return useCursorInfiniteQuery(['identity', 'users', 'list'] as const, (cursor) =>
    unwrap(api.GET('/api/v1/identity/users', { params: { query: { cursor } } })),
  )
}

export function useInviteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: InviteUserIn) => unwrap(api.POST('/api/v1/identity/invitations', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity', 'users'] }),
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: UpdateUserRoleIn }) =>
      unwrap(api.PATCH('/api/v1/identity/users/{user_id}/role', { params: { path: { user_id: userId } }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity', 'users'] })
      // Por si el usuario editado es el que tiene la sesión activa (cambiar su propio rol).
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      unwrap(api.POST('/api/v1/identity/users/{user_id}/deactivate', { params: { path: { user_id: userId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity', 'users'] }),
  })
}

export function useReactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      unwrap(api.POST('/api/v1/identity/users/{user_id}/reactivate', { params: { path: { user_id: userId } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity', 'users'] }),
  })
}

// ---- Roles: sin paginar (la API responde un arreglo plano) ----

export function useRoles() {
  return useQuery({
    queryKey: ['identity', 'roles', 'list'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/identity/roles')),
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RoleCreateIn) => unwrap(api.POST('/api/v1/identity/roles', { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity', 'roles'] }),
  })
}

export function useRenameRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, body }: { roleId: string; body: RoleRenameIn }) =>
      unwrap(api.PATCH('/api/v1/identity/roles/{role_id}', { params: { path: { role_id: roleId } }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identity', 'roles'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useRolePermissions(roleId: string | undefined) {
  return useQuery({
    queryKey: ['identity', 'roles', roleId, 'permissions'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/identity/roles/{role_id}/permissions', { params: { path: { role_id: roleId as string } } })),
    enabled: !!roleId,
  })
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissionCodes }: { roleId: string; permissionCodes: string[] }) =>
      unwrap(
        api.PUT('/api/v1/identity/roles/{role_id}/permissions', {
          params: { path: { role_id: roleId } },
          body: { permission_codes: permissionCodes },
        }),
      ),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['identity', 'roles', variables.roleId, 'permissions'] })
      // La matriz que cambió puede ser la del propio rol de quien la edita.
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function usePermissionsCatalog() {
  return useQuery({
    queryKey: ['identity', 'permissions'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/identity/permissions')),
  })
}

export type RecoveryLink = components['schemas']['RecoveryLinkOut']

/**
 * Enlace para que alguien vuelva a poner su contraseña, SIN mandar correo.
 *
 * Es el equivalente del "Generar enlace" de la invitación, para el otro caso:
 * a un empleado se le olvidó la contraseña. Antes eso solo se resolvía por
 * correo, y con el SMTP incluido de Supabase —limitado a unos pocos envíos
 * por hora— un olvido podía dejar a esa persona afuera sin que nadie pudiera
 * ayudarla.
 *
 * NO invalida queries: no cambia nada del usuario, solo emite una credencial.
 */
export function useRecoveryLink() {
  return useMutation({
    mutationFn: (userId: string) =>
      unwrap(api.POST('/api/v1/identity/users/{user_id}/recovery-link', { params: { path: { user_id: userId } } })),
  })
}
