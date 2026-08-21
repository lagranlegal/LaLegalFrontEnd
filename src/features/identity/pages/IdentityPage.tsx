import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Pencil } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePermission } from '@/lib/permissions/usePermission'
import { useMe } from '@/lib/auth/me'
import { formatDateTime } from '@/lib/dates'
import { useUsersList, useRoles, type User, type Role } from '@/features/identity/api'
import { UserStatusBadge } from '@/features/identity/components/UserStatusBadge'
import { InviteUserDialog } from '@/features/identity/components/InviteUserDialog'
import { UserDetailDialog } from '@/features/identity/components/UserDetailDialog'
import { RoleFormDialog } from '@/features/identity/components/RoleFormDialog'
import { PermissionsMatrixDialog } from '@/features/identity/components/PermissionsMatrixDialog'

type UserRow = User & { roleName: string }

const userColumns: ColumnDef<UserRow>[] = [
  { accessorKey: 'full_name', header: 'Nombre' },
  { accessorKey: 'email', header: 'Correo' },
  { accessorKey: 'roleName', header: 'Rol' },
  { accessorKey: 'status', header: 'Estado', cell: (info) => <UserStatusBadge status={info.getValue<string>()} /> },
  { accessorKey: 'created_at', header: 'Invitado el', cell: (info) => formatDateTime(info.getValue<string>()) },
]

function UsersTab() {
  const { data: me } = useMe()
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useUsersList()
  const { data: roles } = useRoles()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteNonce, setInviteNonce] = useState(0)
  const [detailUser, setDetailUser] = useState<User | undefined>(undefined)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailNonce, setDetailNonce] = useState(0)

  const users = data?.pages.flatMap((page) => page.items) ?? []
  const roleById = new Map((roles ?? []).map((role) => [role.id, role.name]))
  const rows: UserRow[] = users.map((user) => ({ ...user, roleName: roleById.get(user.role_id) ?? '—' }))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Can permission="identity.manage_users">
          <Button
            className="rounded-pill"
            onClick={() => {
              setInviteNonce((n) => n + 1)
              setInviteOpen(true)
            }}
          >
            + Invitar usuario
          </Button>
        </Can>
      </div>

      <DataTable
        columns={userColumns}
        data={rows}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="Aún no tienes usuarios"
        emptyDescription="Invita al primero para que pueda entrar a la plataforma."
        onRowClick={(row) => {
          setDetailUser(row)
          setDetailNonce((n) => n + 1)
          setDetailOpen(true)
        }}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      <InviteUserDialog key={`invite-${inviteNonce}`} open={inviteOpen} onOpenChange={setInviteOpen} />
      {detailUser && (
        <UserDetailDialog
          key={`detail-${detailNonce}`}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          user={detailUser}
          isSelf={detailUser.id === me?.user.id}
        />
      )}
    </div>
  )
}

const roleColumns: ColumnDef<Role>[] = [
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'description', header: 'Descripción', cell: (info) => info.getValue<string | null>() ?? '—' },
  {
    accessorKey: 'permission_count',
    header: 'Permisos',
    // Un rol en 0 no sirve para nada: quien lo tenga no puede ver la caja ni
    // el inventario, y la app le muestra pantallas que parecen rotas. Se
    // marca en ámbar para que salte a la vista en el listado — sin esto, un
    // rol vacío se ve idéntico a uno bien configurado.
    cell: (info) => {
      const count = info.getValue<number>()
      return count === 0 ? (
        <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-xs text-warning">Sin permisos</span>
      ) : (
        <span className="tnum">{count}</span>
      )
    },
  },
  { accessorKey: 'is_seed', header: 'Predeterminado', cell: (info) => (info.getValue<boolean>() ? 'Sí' : 'No') },
  { accessorKey: 'active', header: 'Activo', cell: (info) => (info.getValue<boolean>() ? 'Sí' : 'No') },
]

function RolesTab() {
  const { data: roles, isPending, isError, error, refetch } = useRoles()
  const canManageRoles = usePermission('identity.manage_roles')
  const [formOpen, setFormOpen] = useState(false)
  const [formNonce, setFormNonce] = useState(0)
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined)
  const [permissionsRole, setPermissionsRole] = useState<Role | undefined>(undefined)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [permissionsNonce, setPermissionsNonce] = useState(0)

  const columns: ColumnDef<Role>[] = canManageRoles
    ? [
        ...roleColumns,
        {
          id: 'actions',
          header: 'Acciones',
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Editar rol"
              onClick={(e) => {
                e.stopPropagation()
                setEditingRole(row.original)
                setFormNonce((n) => n + 1)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
          ),
        },
      ]
    : roleColumns

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Can permission="identity.manage_roles">
          <Button
            className="rounded-pill"
            onClick={() => {
              setEditingRole(undefined)
              setFormNonce((n) => n + 1)
              setFormOpen(true)
            }}
          >
            + Rol
          </Button>
        </Can>
      </div>

      <DataTable
        columns={columns}
        data={roles ?? []}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        emptyTitle="Aún no tienes roles"
        emptyDescription="Crea el primero para poder invitar usuarios."
        onRowClick={(row) => {
          setPermissionsRole(row)
          setPermissionsNonce((n) => n + 1)
          setPermissionsOpen(true)
        }}
      />

      <RoleFormDialog key={`form-${formNonce}`} open={formOpen} onOpenChange={setFormOpen} role={editingRole} />
      {permissionsRole && (
        <PermissionsMatrixDialog key={`permissions-${permissionsNonce}`} open={permissionsOpen} onOpenChange={setPermissionsOpen} role={permissionsRole} />
      )}
    </div>
  )
}

export function IdentityPage() {
  const canManageUsers = usePermission('identity.manage_users')
  const canManageRoles = usePermission('identity.manage_roles')
  const defaultTab = canManageUsers ? 'users' : 'roles'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Identidad" description="Usuarios, invitaciones, roles y matriz de permisos." />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {canManageUsers && <TabsTrigger value="users">Usuarios</TabsTrigger>}
          {canManageRoles && <TabsTrigger value="roles">Roles</TabsTrigger>}
        </TabsList>
        {canManageUsers && (
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        )}
        {canManageRoles && (
          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
