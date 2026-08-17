import { type ComponentType } from 'react'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import {
  BarChart3,
  FileText,
  History,
  Home,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  Tags,
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

interface NavItem {
  label: string
  icon: ComponentType<{ className?: string }>
  /** Sin `to`: el módulo todavía no tiene pantalla — se muestra deshabilitado, no como link roto. */
  to?: string
}

// Orden aprobado por el cliente el 15/08/2026 (docs/DESIGN_SYSTEM.md §3).
// El filtrado por código de permiso llega cuando exista el catálogo real
// (GET /identity/permissions, paso 8) — hoy solo se filtra por si la
// pantalla ya existe.
const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', icon: Home, to: '/' },
  { label: 'Contratos', icon: FileText, to: '/contratos' },
  { label: 'Ventas', icon: ShoppingCart, to: '/ventas' },
  { label: 'Inventario', icon: Package, to: '/inventario' },
  { label: 'Clientes', icon: Users, to: '/clientes' },
  { label: 'Caja', icon: Wallet, to: '/caja' },
  { label: 'Catálogos', icon: Tags, to: '/catalogos' },
  { label: 'Reportes', icon: BarChart3 },
  { label: 'Auditoría', icon: History },
  { label: 'Configuración', icon: Settings },
]

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        if (!item.to) {
          return (
            <span
              key={item.label}
              aria-disabled="true"
              className={cn(
                'flex items-center gap-3 rounded-input px-3 py-2 text-sm text-muted-foreground/50',
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
              'flex items-center gap-3 rounded-input px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent',
              collapsed && 'justify-center',
            )}
            activeProps={{ className: 'bg-accent text-accent-foreground font-medium' }}
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
          {!sidebarCollapsed && <span className="truncate text-sm font-semibold text-sidebar-foreground">{me?.company.name ?? 'Compraventa'}</span>}
          <Button variant="ghost" size="icon-sm" onClick={toggleSidebarCollapsed} aria-label={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}>
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
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar shadow-modal">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">{me?.company.name ?? 'Compraventa'}</span>
              <Button variant="ghost" size="icon-sm" onClick={() => setMobileDrawerOpen(false)} aria-label="Cerrar menú">
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

          <div className="hidden flex-1 justify-center lg:flex">
            <input
              type="search"
              placeholder="Buscar…"
              disabled
              className="w-full max-w-md rounded-input border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground outline-none"
            />
          </div>

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
      </div>
    </div>
  )
}
