import { z } from 'zod'
import { createRootRouteWithContext, createRoute, createRouter, Outlet, redirect } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/auth/supabase'
import { meQueryOptions } from '@/lib/auth/me'
import { setActiveTimezone } from '@/lib/dates'
import { ApiError } from '@/lib/api/client'
import { AuthLayout } from '@/app/layouts/AuthLayout'
import { AppShell } from '@/components/shared/AppShell'
import { SubscriptionBlockedPage } from '@/app/pages/SubscriptionBlockedPage'
import { NotFoundPage } from '@/app/pages/NotFoundPage'
import { ErrorPage } from '@/app/pages/ErrorPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { AuthCallbackPage } from '@/features/auth/pages/AuthCallbackPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'

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

const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute, authCallbackRoute]),
  subscriptionBlockedRoute,
  appLayoutRoute.addChildren([dashboardRoute]),
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
