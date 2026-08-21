import { useState } from 'react'
import { Landmark, Pencil, Plus, Wallet } from 'lucide-react'
import { Can } from '@/components/shared/Can'
import { EmptyState } from '@/components/shared/EmptyState'
import { Money } from '@/components/shared/Money'
import { PageHeader } from '@/components/shared/PageHeader'
import { RefreshingBar } from '@/components/shared/RefreshingBar'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ACCOUNT_TYPE_HINTS, ACCOUNT_TYPE_LABELS } from '@/lib/accounts/types'
import { sumMoney } from '@/lib/money'
import { AccountFormDialog } from '@/features/accounts/components/AccountFormDialog'
import { SettleAccountDialog } from '@/features/accounts/components/SettleAccountDialog'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { useAccounts, type Account, type AccountType } from '@/features/accounts/api'

const TYPE_ORDER: AccountType[] = ['cash', 'bank', 'settlement']

function AccountCard({
  account,
  onEdit,
  onSettle,
}: {
  account: Account
  onEdit: () => void
  onSettle: () => void
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-card border border-border bg-card p-card shadow-card">
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
          {account.name}
          {account.is_default && (
            <span className="rounded-pill bg-brand-50 px-2 py-0.5 text-xs font-normal text-brand-500">Por defecto</span>
          )}
          {!account.active && (
            <span className="rounded-pill bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">Inactiva</span>
          )}
        </p>
        {account.reference && <p className="mt-0.5 truncate text-xs text-muted-foreground">{account.reference}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Money value={account.balance} className="text-base font-semibold text-foreground" />
        <Can permission="accounts.settle">
          {account.type === 'settlement' && (
            <Button size="sm" variant="outline" onClick={onSettle}>
              Liquidar
            </Button>
          )}
        </Can>
        <Can permission="accounts.manage">
          <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Editar ${account.name}`}>
            <Pencil className="size-4" />
          </Button>
        </Can>
      </div>
    </li>
  )
}

/**
 * Cuentas — dónde está la plata.
 *
 * Agrupada por tipo y no como una tabla plana a propósito: el saldo de cada
 * tipo significa algo distinto (docs/ARCHITECTURE.md §12) y sumarlos todos en
 * un total único mentiría — lo que Sistecrédito te debe no es plata que
 * tengas. Por eso cada grupo lleva su propio subtotal y su propia explicación,
 * y no hay un "total general" en ninguna parte.
 */
export function AccountsPage() {
  const [includeInactive, setIncludeInactive] = useState(false)
  const { data: accounts, isPending, isFetching, isError, error, refetch } = useAccounts({ includeInactive })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>(undefined)
  const [settling, setSettling] = useState<Account | null>(null)

  const openNew = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (account: Account) => {
    setEditing(account)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cuentas"
        description="Dónde está la plata: el cajón, los bancos y lo que te deben."
        actions={
          <Can permission="accounts.manage">
            <Button onClick={openNew}>
              <Plus className="size-4" />
              Nueva cuenta
            </Button>
          </Can>
        }
      />

      <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
        <Checkbox checked={includeInactive} onCheckedChange={(checked) => setIncludeInactive(checked === true)} />
        Mostrar cuentas inactivas
      </label>

      <RefreshingBar active={isFetching && !isPending} />

      {isPending && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-20 animate-pulse rounded-card bg-muted" />
          ))}
        </div>
      )}

      {isError &&
        (isPermissionError(error) ? (
          // Reintentar no cambia un permiso que no existe.
          <EmptyState
            title="No tienes permiso para ver las cuentas"
            description="Pídele a un administrador que te habilite el permiso 'Ver cuentas y sus saldos'."
          />
        ) : (
          <EmptyState
            title="No se pudieron cargar las cuentas"
            description="Revisa tu conexión e inténtalo otra vez."
            action={
              <Button variant="outline" onClick={() => void refetch()}>
                Reintentar
              </Button>
            }
          />
        ))}

      {accounts && accounts.length === 0 && (
        <EmptyState
          icon={Wallet}
          title="No hay cuentas"
          description="Cada empresa nace con sus cuentas básicas. Si no ves ninguna, crea la primera."
          action={
            <Can permission="accounts.manage">
              <Button onClick={openNew}>Nueva cuenta</Button>
            </Can>
          }
        />
      )}

      {accounts && accounts.length > 0 && (
        <div className="flex flex-col gap-6">
          {TYPE_ORDER.map((type) => {
            const group = accounts.filter((account) => account.type === type)
            if (group.length === 0) return null
            // Subtotal POR TIPO, nunca un total general: "tengo" y "me deben"
            // no se suman.
            const subtotal = sumMoney(...group.map((account) => account.balance))
            return (
              <section key={type} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {type === 'cash' ? <Wallet className="size-4" /> : <Landmark className="size-4" />}
                      {ACCOUNT_TYPE_LABELS[type]}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{ACCOUNT_TYPE_HINTS[type]}</p>
                  </div>
                  <Money value={subtotal} className="text-sm font-medium text-muted-foreground" />
                </div>
                <ul className="flex flex-col gap-3">
                  {group.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onEdit={() => openEdit(account)}
                      onSettle={() => setSettling(account)}
                    />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      {/* `key` fuerza remount: cada apertura arranca con el formulario limpio
          y, en el caso de liquidar, con una `Idempotency-Key` nueva. */}
      {formOpen && (
        <AccountFormDialog key={editing?.id ?? 'new'} open={formOpen} onOpenChange={setFormOpen} account={editing} />
      )}
      {settling && (
        <SettleAccountDialog
          key={settling.id}
          open
          onOpenChange={(open) => !open && setSettling(null)}
          account={settling}
        />
      )}
    </div>
  )
}
