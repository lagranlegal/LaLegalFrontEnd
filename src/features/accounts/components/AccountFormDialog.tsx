import { useState } from 'react'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ACCOUNT_TYPE_HINTS, ACCOUNT_TYPE_LABELS } from '@/lib/accounts/types'
import { useCreateAccount, useUpdateAccount, type Account, type AccountType } from '@/features/accounts/api'

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * Alta y edición de una cuenta. Un solo diálogo para ambas porque los campos
 * son los mismos salvo dos, y esas dos diferencias son justamente las reglas
 * que hay que explicarle al usuario:
 *
 *  · El **tipo** solo se elige al crear. Cambiarlo después reinterpretaría
 *    todos los movimientos históricos de la cuenta — una cuenta de efectivo
 *    que pasara a banco sacaría su saldo del arqueo sin que nadie contara
 *    nada.
 *  · El **saldo inicial** solo se pide al crear: es lo que ya había ahí antes
 *    de empezar a usar el sistema. Editarlo después movería un saldo
 *    histórico sin ningún movimiento que lo respalde.
 */
export function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `undefined` = alta. */
  account?: Account
}) {
  const isEdit = account !== undefined
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'bank')
  const [reference, setReference] = useState(account?.reference ?? '')
  const [isDefault, setIsDefault] = useState(account?.is_default ?? false)
  const [openingBalance, setOpeningBalance] = useState('')
  const [error, setError] = useState<string | null>(null)

  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const isPending = createAccount.isPending || updateAccount.isPending

  const submit = () => {
    setError(null)
    if (name.trim() === '') {
      setError('El nombre es obligatorio.')
      return
    }
    const common = { name: name.trim(), reference: reference.trim() || null, is_default: isDefault }

    if (isEdit) {
      updateAccount.mutate(
        { accountId: account.id, body: common },
        {
          onSuccess: () => {
            toast.success('Cuenta actualizada')
            onOpenChange(false)
          },
          onError: (err: Error) => setError(err.message),
        },
      )
      return
    }

    createAccount.mutate(
      { ...common, type, opening_balance: openingBalance || '0' },
      {
        onSuccess: () => {
          toast.success('Cuenta creada')
          onOpenChange(false)
        },
        onError: (err: Error) => setError(err.message),
      },
    )
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Editar cuenta' : 'Nueva cuenta'}
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={submit} disabled={isPending}>
            {isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="account-name" className="text-sm font-medium text-foreground">
            Nombre
          </label>
          <input
            id="account-name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Bancolombia ahorros"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="account-type" className="text-sm font-medium text-foreground">
            Tipo
          </label>
          {isEdit ? (
            <>
              <p className={`${inputClass} bg-muted text-muted-foreground`}>{ACCOUNT_TYPE_LABELS[account.type]}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                El tipo no se puede cambiar: define cómo se verifica el dinero, y cambiarlo reinterpretaría los
                movimientos ya registrados.
              </p>
            </>
          ) : (
            <>
              <Select value={type} onValueChange={(value) => setType(value as AccountType)}>
                <SelectTrigger id="account-type" className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {ACCOUNT_TYPE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{ACCOUNT_TYPE_HINTS[type]}</p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="account-reference" className="text-sm font-medium text-foreground">
            Referencia <span className="text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="account-reference"
            className={inputClass}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Últimos 4 dígitos, número de convenio…"
          />
        </div>

        {!isEdit && (
          <div>
            <label htmlFor="account-opening" className="text-sm font-medium text-foreground">
              Saldo inicial
            </label>
            <MoneyInput id="account-opening" value={openingBalance} onChange={setOpeningBalance} />
            <p className="mt-1 text-xs text-muted-foreground">
              Lo que ya había en esta cuenta antes de empezar a usar el sistema. Solo se pide al crearla.
            </p>
          </div>
        )}

        <label className="flex items-start gap-2 text-sm text-foreground">
          <Checkbox checked={isDefault} onCheckedChange={(checked) => setIsDefault(checked === true)} className="mt-0.5" />
          <span>
            Usar por defecto
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Se propone sola en los cobros de este tipo. Marcarla desmarca la anterior.
            </span>
          </span>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </AppDialog>
  )
}
