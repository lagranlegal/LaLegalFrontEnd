import { type ComponentType } from 'react'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  FileText,
  History,
  Home,
  Landmark,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  Tags,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAppStore } from '@/app/store'
import { useMe } from '@/lib/auth/me'
import { useLogout } from '@/features/auth/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CashSessionBanner } from '@/components/shared/CashSessionBanner'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { AppFooter } from '@/components/shared/AppFooter'

interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  /** Sin `to`: el módulo todavía no tiene pantalla — se muestra deshabilitado, no como link roto. */
  to?: string
  /** Si se define, el ítem solo aparece con al menos uno de estos permisos (deny-by-default, regla 7). */
  anyPermission?: string[]
}

// Orden aprobado por el cliente el 15/08/2026 (docs/DESIGN_SYSTEM.md §3).
// TODO ítem con pantalla lleva `anyPermission`. Sin eso el menú promete
// módulos que el backend va a rechazar: quitarle contratos a un rol dejaba el
// ítem visible igual, y el usuario entraba a una pantalla que solo sabía
// fallar. El permiso que gatea es siempre el de LECTURA del módulo — las
// acciones (crear, editar, anular) se gatean por botón dentro de la pantalla.
//
// `Inicio` es la única excepción y es deliberada: es el destino al que
// redirigen todos los guards, así que gatearlo podría dejar a un usuario sin
// ningún lugar a donde ir.
const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', icon: Home, to: '/' },
  { label: 'Contratos', icon: FileText, to: '/contratos', anyPermission: ['contracts.view'] },
  { label: 'Ventas', icon: ShoppingCart, to: '/ventas', anyPermission: ['sales.view'] },
  { label: 'Inventario', icon: Package, to: '/inventario', anyPermission: ['inventory.view'] },
  { label: 'Clientes', icon: Users, to: '/clientes', anyPermission: ['customers.view'] },
  { label: 'Caja', icon: Wallet, to: '/caja', anyPermission: ['cashbox.view'] },
  { label: 'Cuentas', icon: Landmark, to: '/cuentas', anyPermission: ['accounts.view'] },
  { label: 'Catálogos', icon: Tags, to: '/catalogos', anyPermission: ['catalogs.view'] },
  { label: 'Identidad', icon: UserCog, to: '/identidad', anyPermission: ['identity.manage_users', 'identity.manage_roles'] },
  { label: 'Reportes', icon: BarChart3, to: '/reportes', anyPermission: ['reports.view'] },
  { label: 'Auditoría', icon: History, to: '/auditoria', anyPermission: ['audit.view'] },
  { label: 'Configuración', icon: Settings, to: '/configuracion', anyPermission: ['company.configure'] },
]

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { data: me } = useMe()
  const items = NAV_ITEMS.filter((item) => !item.anyPermission || item.anyPermission.some((code) => me?.permissions.includes(code)))

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = item.icon
        if (!item.to) {
          return (
            <span
              key={item.label}
              aria-disabled="true"
              className={cn(
                'flex items-center gap-3 rounded-input border-l-2 border-transparent px-3 py-2 text-sm text-sidebar-foreground/35',
                collapsed && 'justify-center',
              )}
              title={`${item.label} — próximamente`}
            >
              <Icon className="size-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </span>
          )
        }
        return (
          <Link
            key={item.label}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-input border-l-2 border-transparent px-3 py-2 text-sm text-sidebar-foreground/80 transition-all hover:border-sidebar-primary/40 hover:bg-sidebar-hover hover:text-sidebar-foreground',
              collapsed && 'justify-center',
            )}
            activeProps={{ className: 'border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium hover:border-sidebar-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground' }}
          >
            <Icon className="size-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Sidebar (blanca, colapsable a íconos en desktop, drawer con overlay en
 * mobile) + topbar (avatar con menú: salir) + `CashSessionBanner` +
 * contenido con `--space-page` (docs/DESIGN_SYSTEM.md §3).
 */
export function AppShell() {
  const { data: me } = useMe()
  const { sidebarCollapsed, toggleSidebarCollapsed, mobileDrawerOpen, setMobileDrawerOpen } = useAppStore()
  const logout = useLogout()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout.mutateAsync()
    await navigate({ to: '/auth/login' })
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] print:hidden lg:flex',
          sidebarCollapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
          {!sidebarCollapsed && (
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-input bg-sidebar-primary text-sm font-bold text-primary-foreground">
                {(me?.company.name ?? 'C').charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-sm font-semibold text-sidebar-foreground">{me?.company.name ?? 'Compraventa'}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground"
            onClick={toggleSidebarCollapsed}
            aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 animate-in bg-foreground/40 fade-in duration-200"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 animate-in flex-col bg-sidebar shadow-modal slide-in-from-left duration-200">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-input bg-sidebar-primary text-sm font-bold text-primary-foreground">
                  {(me?.company.name ?? 'C').charAt(0).toUpperCase()}
                </span>
                <span className="truncate text-sm font-semibold text-sidebar-foreground">{me?.company.name ?? 'Compraventa'}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="size-4" />
              </Button>
            </div>
            <SidebarContent collapsed={false} onNavigate={() => setMobileDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 print:hidden">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileDrawerOpen(true)} aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>

          {/* Acá vivía un <input type="search" disabled> que nunca estuvo
              conectado a nada. Un buscador que no busca comunica "esto está a
              medio hacer" peor que no tener buscador: se quitó. La búsqueda
              global real necesita `?q=` en contratos e inventario, que el
              backend todavía no expone (docs/PENDIENTES_BACKEND_INFRA.md). */}
          <div className="flex-1" />

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-2 rounded-input px-2 py-1.5 text-sm hover:bg-accent">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {me?.user.full_name?.charAt(0).toUpperCase() ?? '?'}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block leading-tight text-foreground">{me?.user.full_name}</span>
                  <span className="block text-xs leading-tight text-muted-foreground">{me?.role.name}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <span className="block truncate font-medium text-foreground">{me?.user.full_name}</span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{me?.user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout}>Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <div className="print:hidden">
          <CashSessionBanner />
        </div>

        <main className="flex-1 p-page print:p-0">
          <Outlet />
        </main>

        <AppFooter />
      </div>
    </div>
  )
}
