import { useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Money } from '@/components/shared/Money'
import { useAccounts } from '@/lib/accounts/list'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { accountTypeLabel, defaultAccountTypeFor } from '@/lib/accounts/types'

/**
 * "¿A dónde entró (o de dónde salió) la plata?" — aparece en todos los
 * puntos de cobro: ventas, abonos, desembolsos, gastos y compras.
 *
 * El medio de pago y la cuenta son cosas distintas (docs/ARCHITECTURE.md
 * §12): el medio es CÓMO se cobró, la cuenta es DÓNDE quedó la plata. Por eso
 * este selector acompaña al de medio de pago en vez de reemplazarlo, y se
 * filtra por el tipo que ese medio implica — elegir "Efectivo" y mandarlo a
 * una cuenta bancaria descuadraría el arqueo.
 *
 * Si el usuario no toca nada se preselecciona la cuenta por defecto de ese
 * tipo, que es exactamente lo que el backend haría si no mandáramos
 * `account_id`. La preselección es una comodidad visual, no la regla: la
 * autoridad sigue siendo el backend (CLAUDE.md regla 7).
 */
export function AccountPicker({
  paymentMethod,
  direction = 'in',
  value,
  onChange,
  id,
  disabled,
}: {
  /** `cash` | `transfer` | `other` — decide qué cuentas se ofrecen. */
  paymentMethod: string
  /**
   * Hacia dónde va la plata. `in` cobra (venta, abono, liquidación recibida),
   * `out` paga (compra a proveedor, gasto, desembolso de préstamo).
   *
   * Existe por una sola razón, y es un bug que se encontró en uso real: una
   * cuenta `settlement` es una cuenta POR COBRAR —plata que Sistecrédito o el
   * datáfono todavía te deben—, no un saldo disponible. Ofrecerla como origen
   * de un pago dejaba elegir "pagarle al proveedor con Sistecrédito", que no
   * existe como operación. El backend también lo rechaza ahora
   * (`ACCOUNT_CANNOT_FUND_PAYMENT`): acá se oculta, allá se protege.
   */
  direction?: 'in' | 'out'
  value: string | null
  onChange: (accountId: string | null) => void
  id?: string
  disabled?: boolean
}) {
  const { data: accounts, isPending, error } = useAccounts()
  const wantedType = defaultAccountTypeFor(paymentMethod)

  // Una cuenta `settlement` (Sistecrédito) se COBRA con medio "otro", igual
  // que Nequi o un bono — así que al cobrar se ofrecen ambas y el usuario
  // elige si esa plata ya entró al banco o si todavía se la deben. Al PAGAR
  // nunca aparece: no se puede gastar lo que no ha llegado.
  const options = (accounts ?? []).filter((account) => {
    if (paymentMethod === 'cash') return account.type === 'cash'
    if (account.type === 'settlement') return direction === 'in'
    return account.type === 'bank'
  })

  // Si el medio de pago cambia, la cuenta elegida puede dejar de ser válida
  // (pasar de efectivo a transferencia deja apuntando al cajón). Se
  // reposiciona en la predeterminada del tipo nuevo en vez de quedar en un
  // valor inconsistente que el backend rechazaría.
  const selected = options.find((account) => account.id === value) ?? null
  const fallback = options.find((account) => account.is_default && account.type === wantedType) ?? options[0] ?? null

  useEffect(() => {
    if (isPending) return
    if (selected) return
    onChange(fallback?.id ?? null)
  }, [isPending, selected, fallback?.id, onChange])

  if (isPending) {
    return <div className="mt-1 h-10 w-full animate-pulse rounded-input bg-border" aria-hidden />
  }

  // Sin `accounts.view` el selector desaparece y la operación sigue: el
  // backend resuelve la cuenta predeterminada cuando no recibe `account_id`.
  // Bloquear una venta porque el cajero no puede LEER el catálogo de cuentas
  // sería castigarlo por un permiso que no necesita para cobrar.
  if (isPermissionError(error)) {
    return null
  }

  if (options.length === 0) {
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        No hay cuentas de este tipo. Créala en Configuración → Cuentas.
      </p>
    )
  }

  return (
    <Select value={selected?.id ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} className="mt-1 w-full">
        <SelectValue placeholder="Elegir cuenta…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>
                {account.name}
                <span className="ml-2 text-xs text-muted-foreground">{accountTypeLabel(account.type)}</span>
              </span>
              <Money value={account.balance} maximumFractionDigits={0} className="text-xs text-muted-foreground" />
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
