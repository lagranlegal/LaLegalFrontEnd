import { useState } from 'react'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { useOpenSession } from '@/features/cashbox/api'
import { useAccounts } from '@/lib/accounts/list'
import { cashOnHand } from '@/lib/accounts/types'
import { subtractMoney } from '@/lib/money'

/**
 * Abrir el turno.
 *
 * **Ya no se digita el saldo de apertura** (backend 00048). Antes este
 * diálogo era un campo vacío donde alguien escribía un número cada mañana,
 * sin ninguna referencia y sin comparación contra el cierre de la noche
 * anterior — el único dato de toda la aplicación que aparecía sin
 * documento. Un cero de más pasaba sin que nada lo notara.
 *
 * Ahora el efectivo del cajón se sabe (es la suma de sus movimientos), así
 * que abrir solo dice "desde ahora respondo yo". Lo que se ofrece es
 * CONTAR: si el conteo no cuadra, la diferencia se registra como un ajuste
 * con motivo, y queda atribuida al turno donde apareció en vez de
 * disolverse en el siguiente.
 *
 * El conteo es opcional a propósito. Obligarlo daría mejor atribución pero
 * frena la operación del mostrador, y el modelo funciona igual: si nadie
 * cuenta, el saldo simplemente sigue.
 */
export function OpenSessionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: accounts, isPending: accountsPending } = useAccounts()
  const [contar, setContar] = useState(false)
  const [counted, setCounted] = useState('')
  const [reason, setReason] = useState('')
  const openSession = useOpenSession()

  const registrado = cashOnHand(accounts ?? [])

  const diferencia = contar && counted ? subtractMoney(counted, registrado) : '0.00'
  const hayDiferencia = diferencia !== '0.00' && diferencia !== '-0.00'
  const faltaMotivo = hayDiferencia && !reason.trim()

  function cerrar() {
    onOpenChange(false)
    setContar(false)
    setCounted('')
    setReason('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (faltaMotivo) return
    await openSession.mutateAsync({
      countedCash: contar && counted ? counted : undefined,
      differenceReason: hayDiferencia ? reason.trim() : undefined,
    })
    cerrar()
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : cerrar())}
      title="Abrir caja"
      description="Empieza el turno. El efectivo del cajón ya se sabe: lo que puedes hacer es confirmarlo contándolo."
      footer={
        <div className="flex w-full gap-2">
          <Button type="button" variant="outline" className="flex-1 rounded-pill" onClick={cerrar} disabled={openSession.isPending}>
            Cancelar
          </Button>
          <Button
            form="open-session-form"
            type="submit"
            disabled={openSession.isPending || accountsPending || faltaMotivo}
            className="flex-1 rounded-pill"
          >
            {openSession.isPending ? 'Abriendo…' : 'Abrir caja'}
          </Button>
        </div>
      }
    >
      <form id="open-session-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-card bg-muted px-3 py-2">
          <span className="text-sm text-muted-foreground">Efectivo registrado en el cajón</span>
          {accountsPending ? (
            <span className="text-sm text-muted-foreground">Cargando…</span>
          ) : (
            <Money value={registrado} className="tnum font-semibold text-foreground" />
          )}
        </div>

        {!contar ? (
          <button
            type="button"
            onClick={() => setContar(true)}
            className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Contar el efectivo ahora
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="counted-cash" className="text-sm font-medium text-foreground">
                Efectivo contado
              </label>
              <MoneyInput id="counted-cash" className="mt-1" value={counted} onChange={setCounted} autoFocus />
            </div>

            {hayDiferencia && (
              <>
                <div className="flex items-center justify-between rounded-input bg-warning-soft px-3 py-2 text-sm text-warning">
                  <span>Diferencia</span>
                  <Money value={diferencia} className="tnum font-semibold" />
                </div>
                <div>
                  <label htmlFor="opening-reason" className="text-sm font-medium text-foreground">
                    Motivo de la diferencia
                  </label>
                  {/* Sin tolerancia, igual que el cierre: el backend lo
                      rechaza con CASH_OPENING_DIFFERENCE_UNJUSTIFIED, y acá
                      se pide antes para no hacer viajar un error evitable. */}
                  <input
                    id="opening-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Qué explica el faltante o el sobrante"
                    className="mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {openSession.isError && (
          <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">
            No se pudo abrir la caja. Intenta de nuevo.
          </p>
        )}
      </form>
    </AppDialog>
  )
}
