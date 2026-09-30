import { Link } from '@tanstack/react-router'
import { FilePlus2, FileText, PackagePlus, ShoppingCart, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePermission } from '@/lib/permissions/usePermission'

type Action = { label: string; hint: string; to: string; icon: LucideIcon; permission: string }

/**
 * Accesos directos del Inicio para quien no tiene `reports.view` (F9-60). El
 * Asesor, que atiende el mostrador todo el día, entraba siempre a una
 * pantalla vacía que lo mandaba al menú. Cada acceso es una ruta con el mismo
 * permiso que su guard: si no lo tiene, no aparece (ni deshabilitado).
 */
const ACTIONS: Action[] = [
  { label: 'Nuevo contrato', hint: 'Prestar sobre una prenda', to: '/contratos/nuevo', icon: FilePlus2, permission: 'contracts.create' },
  { label: 'Nueva venta', hint: 'Cobrar en el mostrador', to: '/ventas/nueva', icon: ShoppingCart, permission: 'sales.create' },
  { label: 'Contratos', hint: 'Buscar uno para abonar o ampliar', to: '/contratos', icon: FileText, permission: 'contracts.view' },
  { label: 'Clientes', hint: 'Buscar o registrar un cliente', to: '/clientes', icon: Users, permission: 'customers.view' },
  { label: 'Nuevo ingreso', hint: 'Mercancía que entra al inventario', to: '/inventario/ingresos/nuevo', icon: PackagePlus, permission: 'inventory.create' },
  { label: 'Caja', hint: 'Abrir, ver o cerrar el turno', to: '/caja', icon: Wallet, permission: 'cashbox.view' },
]

function QuickAction({ action }: { action: Action }) {
  const allowed = usePermission(action.permission)
  if (!allowed) return null
  const Icon = action.icon
  return (
    <Link
      to={action.to}
      className="flex items-center gap-3 rounded-card border border-border bg-card p-card shadow-card transition-colors hover:bg-accent/50"
    >
      <Icon className="size-5 shrink-0 text-brand" aria-hidden />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{action.label}</span>
        <span className="text-xs text-muted-foreground">{action.hint}</span>
      </span>
    </Link>
  )
}

export function QuickActions() {
  return (
    <nav aria-label="Accesos directos" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ACTIONS.map((action) => (
        <QuickAction key={action.to} action={action} />
      ))}
    </nav>
  )
}
