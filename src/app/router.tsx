import { z } from 'zod'
import { createRootRouteWithContext, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/auth/supabase'
import { meQueryOptions } from '@/lib/auth/me'
import { setActiveTimezone } from '@/lib/dates'
import { ApiError } from '@/lib/api/client'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { PlatformLayout } from '@/app/layouts/PlatformLayout'
import { AppShell } from '@/components/shared/AppShell'
import { isSuperAdmin } from '@/lib/auth/platform'
import { SubscriptionBlockedPage } from '@/app/pages/SubscriptionBlockedPage'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { ErrorPage } from '@/app/pages/ErrorPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { CatalogsPage } from '@/features/catalogs/pages/CatalogsPage'
import { ContractsListPage } from '@/features/contracts/pages/ContractsListPage'
import { ContractFormPage } from '@/features/contracts/pages/ContractFormPage'
import { ContractImportPage } from '@/features/contracts/pages/ContractImportPage'
import { ContractDetailPage } from '@/features/contracts/pages/ContractDetailPage'
import { CashboxPage } from '@/features/cashbox/pages/CashboxPage'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage'
import { EntryFormPage } from '@/features/inventory/pages/EntryFormPage'
import { SalesListPage } from '@/features/sales/pages/SalesListPage'
import { SaleFormPage } from '@/features/sales/pages/SaleFormPage'
import { IdentityPage } from '@/features/identity/pages/IdentityPage'
import { AuditPage } from '@/features/audit/pages/AuditPage'
import { CompaniesPage } from '@/features/platform/pages/CompaniesPage'

interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
  notFoundComponent: NotFoundPage,
  // Red de seguridad para errores no manejados por una ruta específica —
  // ej. NetworkError si el backend no responde durante el bootstrap de /me.
  errorComponent: ErrorPage,
})

// ---- /auth/* — sin sesión requerida, sin sidebar (§9) ----

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: AuthLayout,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session) throw redirect({ to: '/' })
  },
})

const loginSearchSchema = z.object({
  redirect: z.string().optional(),
  reason: z.string().optional(),
})

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/login',
  validateSearch: loginSearchSchema,
  component: LoginPage,
})

const authCallbackRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/callback',
  component: AuthCallbackPage,
})

// ---- /cuenta-bloqueada — pantalla de bloqueo por suscripción (§4.7), sin AppShell ----

const subscriptionBlockedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cuenta-bloqueada',
  component: SubscriptionBlockedPage,
})

// ---- /* — protegidas, requieren sesión + bootstrap de /me (§4.5, §9) ----

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-layout',
  component: AppShell,
  beforeLoad: async ({ context, location }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: location.href } })
    }

    try {
      const me = await context.queryClient.ensureQueryData(meQueryOptions())
      setActiveTimezone(me.company.timezone)
    } catch (error) {
      if (error instanceof ApiError && error.code === 'SUBSCRIPTION_EXPIRED') {
        throw redirect({ to: '/cuenta-bloqueada' })
      }
      if (error instanceof ApiError && (error.code === 'UNAUTHORIZED' || error.code === 'PERMISSION_DENIED')) {
        // client.ts ya cerró la sesión de Supabase si el 401 persistió tras
        // el refresh — acá solo falta avisarle al usuario por qué.
        throw redirect({ to: '/auth/login', search: { redirect: location.href, reason: 'inactive' } })
      }
      throw error
    }
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: DashboardPage,
})

const customersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/clientes',
  component: CustomersPage,
})

const catalogsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/catalogos',
  component: CatalogsPage,
})

// Hermanas de appLayoutRoute (no anidadas entre sí): si `contractNewRoute`/
// `contractDetailRoute` fueran hijas de `contractsRoute`, TanStack Router
// exigiría un <Outlet/> dentro de `ContractsListPage` para renderizarlas —
// la lista y el detalle/formulario son pantallas independientes, no un
// layout compartido. Estático antes que dinámico en el array por claridad
// (el matcher de TanStack ya prioriza segmentos estáticos igual).
const contractsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/contratos',
  component: ContractsListPage,
})

const contractNewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/contratos/nuevo',
  component: ContractFormPage,
})

// Guard por permiso (no solo ocultar el botón) — primera ruta que lo necesita
// (docs/ARCHITECTURE.md §5, paso 5b): `contracts.import` es Admin-only de
// fábrica, a diferencia del resto de contratos que cualquier operador ve.
// `/me` ya está en cache acá (lo aseguró `appLayoutRoute.beforeLoad` arriba
// en la cadena) — lectura síncrona, sin otro fetch.
const contractImportRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/contratos/importar',
  component: ContractImportPage,
  beforeLoad: ({ context }) => {
    const me = context.queryClient.getQueryData(meQueryOptions().queryKey)
    if (me && !me.permissions.includes('contracts.import')) {
      throw redirect({ to: '/contratos' })
    }
  },
})

const contractDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/contratos/$contractId',
  component: ContractDetailPage,
})

const cashboxRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/caja',
  component: CashboxPage,
})

const inventoryRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/inventario',
  component: InventoryPage,
})

const entryNewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/inventario/ingresos/nuevo',
  component: EntryFormPage,
})

const salesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/ventas',
  component: SalesListPage,
})

const saleNewRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/ventas/nueva',
  component: SaleFormPage,
})

// Guard por permiso (mismo patrón de `contractImportRoute`, §1.6): sin
// `identity.manage_users` NI `identity.manage_roles` no hay nada que ver acá
// (ambos tabs de `IdentityPage` se ocultan por separado, pero la ruta
// completa tampoco debe quedar accesible).
const identityRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/identidad',
  component: IdentityPage,
  beforeLoad: ({ context }) => {
    const me = context.queryClient.getQueryData(meQueryOptions().queryKey)
    if (me && !me.permissions.includes('identity.manage_users') && !me.permissions.includes('identity.manage_roles')) {
      throw redirect({ to: '/' })
    }
  },
})

// Guard por permiso, mismo patrón que `identityRoute` — `audit.view` es el
// único código confirmado que gatea esta pantalla (docs/ARCHITECTURE.md §5).
const auditRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/auditoria',
  component: AuditPage,
  beforeLoad: ({ context }) => {
    const me = context.queryClient.getQueryData(meQueryOptions().queryKey)
    if (me && !me.permissions.includes('audit.view')) {
      throw redirect({ to: '/' })
    }
  },
})

// ---- /platform/* — layout PROPIO, NUNCA AppShell (CLAUDE.md paso 10) ----
// No pasa por `/me` en absoluto: un super-admin de plataforma no
// necesariamente pertenece a la empresa que está operando. Autorización por
// el claim `app_metadata.platform_role` del JWT, no por `/me.permissions`
// (docs/ARCHITECTURE.md §4: "el front los decodifica SOLO para routing
// básico... no infiere permisos ni datos de empresa de los claims").

const platformLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/platform',
  component: PlatformLayout,
  beforeLoad: async ({ location }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      throw redirect({ to: '/auth/login', search: { redirect: location.href } })
    }
    if (!(await isSuperAdmin())) {
      throw redirect({ to: '/' })
    }
  },
})

const platformCompaniesRoute = createRoute({
  getParentRoute: () => platformLayoutRoute,
  path: '/',
  component: CompaniesPage,
})

const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute, authCallbackRoute]),
  subscriptionBlockedRoute,
  platformLayoutRoute.addChildren([platformCompaniesRoute]),
  appLayoutRoute.addChildren([
    dashboardRoute,
    customersRoute,
    catalogsRoute,
    contractsRoute,
    contractNewRoute,
    contractImportRoute,
    contractDetailRoute,
    cashboxRoute,
    inventoryRoute,
    entryNewRoute,
    salesRoute,
    saleNewRoute,
    identityRoute,
    auditRoute,
  ]),
])

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
