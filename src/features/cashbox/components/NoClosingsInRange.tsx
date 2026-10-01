import { Link } from '@tanstack/react-router'
import { CalendarX2 } from 'lucide-react'
import { Money } from '@/components/shared/Money'
import { useOtherAccountsMovement } from '@/lib/accounts/movements'
import { usePermission } from '@/lib/permissions/usePermission'
import type { DateRangeValue } from '@/components/shared/DateRangePicker'

/**
 * El vacío del histórico con un rango elegido (issue #12). «No hay cierres» no
 * es «no pasó nada»: los cierres solo cuentan el efectivo del cajón. Si en el
 * rango entró o salió plata por otras cuentas, se dice cuánto y por cuál, con
 * el enlace a Cuentas para ver el extracto. Sin `accounts.view` no se afirma
 * nada sobre las cuentas: solo se aclara qué cuentan los cierres.
 */
export function NoClosingsInRange({ range }: { range: DateRangeValue }) {
  const canViewAccounts = usePermission('accounts.view')
  const { isPending, moved } = useOtherAccountsMovement(range, { enabled: canViewAccounts })

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center" role="status">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CalendarX2 className="size-6" aria-hidden />
      </div>
      <div className="grid gap-1">
        <p className="font-medium text-foreground">No hay cierres de caja en este rango</p>
        <p className="text-sm text-muted-foreground">Los cierres cuentan solo el efectivo del cajón; lo que entra por banco no pasa por ellos.</p>
      </div>
      {canViewAccounts && !isPending && moved.length > 0 && (
        <div className="grid w-full max-w-md gap-2 rounded-input border border-border p-3 text-left text-sm">
          <p className="font-medium text-foreground">Pero sí hubo movimientos en otras cuentas:</p>
          <ul className="grid gap-1.5">
            {moved.map(({ account, totalIn, totalOut }) => (
              <li key={account.id} className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-foreground">{account.name}</span>
                <span className="tnum text-muted-foreground">
                  entró <Money value={totalIn} className="font-semibold text-foreground" /> · salió{' '}
                  <Money value={totalOut} className="font-semibold text-foreground" />
                </span>
              </li>
            ))}
          </ul>
          <Link to="/cuentas" className="w-fit text-sm font-medium text-brand hover:underline">
            Ver el extracto en Cuentas
          </Link>
        </div>
      )}
    </div>
  )
}
