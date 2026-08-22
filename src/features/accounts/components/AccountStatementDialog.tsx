import { useState } from 'react'
import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { EmptyState } from '@/components/shared/EmptyState'
import { DateRangePicker, type DateRangeValue } from '@/components/shared/DateRangePicker'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDateTime, todayBogota } from '@/lib/dates'
import { conceptLabel } from '@/lib/modules'
import { paymentMethodLabel } from '@/lib/paymentMethods'
import { useAccountStatement, type Account } from '@/features/accounts/api'

/** Últimos 30 días — el rango con el que uno abre un extracto bancario. */
function rangoPorDefecto(): DateRangeValue {
  const hoy = todayBogota()
  const desde = new Date(`${hoy}T00:00:00`)
  desde.setDate(desde.getDate() - 29)
  return { from: desde.toISOString().slice(0, 10), to: hoy }
}

/**
 * Extracto de una cuenta — para conciliarla contra el extracto real del banco.
 *
 * Completa la idea que el proyecto ya tenía escrita desde 00024: el efectivo
 * se cuadra CONTANDO todas las noches; el banco se cuadra CONTRA EL EXTRACTO,
 * en el ritmo del banco. Hasta ahora la pantalla de Cuentas decía cuánto hay,
 * pero no cómo se llegó ahí — y sin eso, una diferencia contra el banco no
 * tiene dónde buscarse.
 *
 * En efectivo el backend no manda saldos, y acá se dice por qué en vez de
 * mostrar una columna vacía: en el cajón la base se vuelve a declarar cada
 * mañana, así que un acumulado histórico no es un saldo. Mostrar un número
 * ahí sería peor que no mostrarlo — alguien lo conciliaría contra el cajón y
 * nunca cuadraría.
 */
export function AccountStatementDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account
}) {
  const [range, setRange] = useState<DateRangeValue | null>(rangoPorDefecto)
  const { data, isPending, isError, refetch } = useAccountStatement(account.id, range)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Extracto — ${account.name}`}
      description={account.reference ?? undefined}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <DateRangePicker value={range} onChange={setRange} />
        </div>

        {isPending && <div className="h-40 animate-pulse rounded-card bg-muted/40" />}

        {isError && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-danger">No se pudo cargar el extracto.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {data && (
          <>
            {data.has_running_balance ? (
              <div className="grid grid-cols-3 gap-3 rounded-card bg-muted/40 px-3 py-2.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo inicial</p>
                  <Money value={data.opening_balance ?? '0.00'} className="font-medium text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Movimiento</p>
                  <p className="text-xs">
                    <Money value={data.total_in} tone="in" /> · <Money value={data.total_out} tone="out" />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo final</p>
                  <Money value={data.closing_balance ?? '0.00'} className="font-semibold text-foreground" />
                </div>
              </div>
            ) : (
              // Se explica en vez de mostrar una columna vacía: la ausencia
              // del saldo es una decisión, no un dato que falte.
              <p className="rounded-card bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
                Esta es la cuenta de <strong className="text-foreground">efectivo</strong>, y no lleva saldo corriente: la base del
                cajón se vuelve a declarar cada mañana al abrir caja, así que acumular el histórico no daría un saldo real. El
                efectivo se verifica <strong className="text-foreground">contando</strong>, en el cierre. Acá quedan los movimientos,
                que sirven para ver qué pasó por el cajón.
              </p>
            )}

            {data.lines.length === 0 ? (
              <EmptyState title="Sin movimientos en este rango" description="Prueba con otras fechas." />
            ) : (
              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium">Concepto</th>
                      <th className="px-3 py-2 text-right font-medium">Monto</th>
                      {data.has_running_balance && <th className="px-3 py-2 text-right font-medium">Saldo</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((linea) => (
                      <tr key={linea.movement_id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{formatDateTime(linea.created_at)}</td>
                        <td className="px-3 py-2">
                          <span className="text-foreground">{conceptLabel(linea.concept)}</span>
                          {linea.notes && <span className="ml-2 text-xs text-muted-foreground">{linea.notes}</span>}
                          {!linea.notes && linea.payment_method && (
                            <span className="ml-2 text-xs text-muted-foreground">{paymentMethodLabel(linea.payment_method)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {/* El signo va acá y no en el concepto: es lo que se
                              lee al recorrer la columna buscando una
                              diferencia contra el banco. */}
                          <Money
                            value={linea.amount}
                            tone={linea.direction === 'in' ? 'in' : 'out'}
                            className={cn('tnum', linea.direction === 'in' ? 'text-success' : 'text-danger')}
                          />
                        </td>
                        {data.has_running_balance && (
                          <td className="px-3 py-2 text-right">
                            <Money value={linea.running_balance ?? '0.00'} className="tnum font-medium text-foreground" />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AppDialog>
  )
}
