import { Link } from '@tanstack/react-router'
import { FileText, PackagePlus, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { usePermission } from '@/lib/permissions/usePermission'

type Action = {
  label: string
  hint: string
  to: string
  icon: LucideIcon
  permission: string
  /** Otro texto si además tiene este permiso: el acceso dice lo que el rol puede hacer ahí, no más. */
  hintIf?: { permission: string; hint: string }
}

/**
 * Accesos directos del Inicio para quien no tiene `reports.view` (F9-60). El
 * Asesor, que atiende el mostrador todo el día, entraba siempre a una
 * pantalla vacía que lo mandaba al menú. Cada acceso es una ruta con el mismo
 * permiso que su guard: si no lo tiene, no aparece (ni deshabilitado).
 * «Nuevo contrato» y «Nueva venta» no van aquí: son las acciones del
 * encabezado (`InicioHeader`, rediseño P2-c), y repetirlas era ruido.
 */
const ACTIONS: Action[] = [
  { label: 'Contratos', hint: 'Buscar uno para abonar o ampliar', to: '/contratos', icon: FileText, permission: 'contracts.view' },
  { label: 'Clientes', hint: 'Buscar o registrar un cliente', to: '/clientes', icon: Users, permission: 'customers.view' },
  { label: 'Nuevo ingreso', hint: 'Mercancía que entra al inventario', to: '/inventario/ingresos/nuevo', icon: PackagePlus, permission: 'inventory.create' },
  {
    label: 'Caja',
    hint: 'Ver el estado del turno',
    to: '/caja',
    icon: Wallet,
    permission: 'cashbox.view',
    // El Asesor ve la caja pero no la abre: «Abrir…» le prometía algo que no puede.
    hintIf: { permission: 'cashbox.open_close', hint: 'Abrir, ver o cerrar el turno' },
  },
]

function QuickAction({ action }: { action: Action }) {
  const allowed = usePermission(action.permission)
  const extended = usePermission(action.hintIf?.permission ?? action.permission)
  if (!allowed) return null
  const hint = action.hintIf && extended ? action.hintIf.hint : action.hint
  const Icon = action.icon
  return (
    <Link
      to={action.to}
      className="flex items-center gap-3 rounded-card border border-border bg-card p-card transition-colors hover:bg-accent/50"
    >
      <Icon className="size-5 shrink-0 text-brand" aria-hidden />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{action.label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
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
