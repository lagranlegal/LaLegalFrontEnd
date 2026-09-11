import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Can } from '@/components/shared/Can'
import { DataTable } from '@/components/shared/DataTable'
import { Money } from '@/components/shared/Money'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { formatDate, todayBogota } from '@/lib/dates'
import { CapitalMovementDialog } from '@/features/capital/components/CapitalMovementDialog'
import {
  useCapitalMovements,
  useCapitalPosition,
  type CapitalMovement,
  type CapitalPosition,
} from '@/features/capital/api'

/** Desde el 1 de enero del año en curso hasta hoy. */
function periodoDelAno(): { from: string; to: string } {
  const hoy = todayBogota()
  return { from: `${hoy.slice(0, 4)}-01-01`, to: hoy }
}

function Dato({
  label,
  value,
  hint,
  tone = 'normal',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'normal' | 'warning'
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Money
        value={value}
        className={
          tone === 'warning'
            ? 'tnum text-lg font-semibold text-warning'
            : 'tnum text-lg font-semibold text-foreground'
        }
      />
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/**
 * Dónde está la plata del negocio.
 *
 * **Es el número que un dueño de compraventa no puede calcular de memoria**,
 * y por eso la pantalla lo muestra antes que el historial: la mayor parte del
 * capital no está en el cajón — está prestada y en vitrina. Retirar "lo que
 * hay en caja" no es retirar utilidad, es descapitalizar.
 *
 * El inventario va AL COSTO, nunca al precio de venta: contar la utilidad
 * antes de venderla es el error clásico, y acá alimentaría directamente una
 * decisión de sacar dinero.
 */
function PositionCard({ position }: { position: CapitalPosition }) {
  const sinRepartir = Number(position.distributable) < 0
  return (
    <div className="rounded-card border border-border bg-card p-card shadow-card">
      <h2 className="text-sm font-medium text-foreground">Dónde está el capital, hoy</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Dato label="Disponible" value={position.cash_and_bank} hint="Cajón, bóveda y bancos" />
        <Dato label="Prestado" value={position.loan_portfolio} hint="Capital en contratos vivos" />
        <Dato label="Inventario" value={position.inventory_at_cost} hint="Al costo, no al precio" />
        <Dato label="Capital total" value={position.total_capital} hint="La suma de los tres" />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-medium text-foreground">
          En el período ({formatDate(position.from_date)} — {formatDate(position.to_date)})
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato label="Utilidad" value={position.operating_profit} hint="Ingresos − costo − gastos" />
          <Dato label="Aportes del dueño" value={position.contributions} />
          <Dato label="Retiros del dueño" value={position.withdrawals} />
          <Dato
            label="Utilidad sin repartir"
            value={position.distributable}
            tone={sinRepartir ? 'warning' : 'normal'}
            hint={sinRepartir ? 'Lo retirado ya superó la utilidad' : 'Lo que se puede retirar'}
          />
        </div>
        {sinRepartir && (
          <p className="mt-3 rounded-input bg-warning-soft px-3 py-2 text-xs text-warning">
            Los retiros del período superan la utilidad: lo que se está sacando ya no es ganancia,
            es capital del negocio. No está prohibido —el dueño puede retirar lo suyo— pero es plata
            que deja de prestarse y de comprar mercancía.
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Capital del dueño — aportes al negocio y retiros.
 *
 * **Ni un aporte es un ingreso, ni un retiro es un gasto.** Los dos mueven el
 * patrimonio, no el resultado del período, y por eso este módulo vive aparte
 * de Caja: un retiro registrado como gasto falsearía la utilidad por todo el
 * monto retirado — el mismo error que este proyecto ya pagó tres veces.
 */
export function CapitalPage() {
  const periodo = useMemo(() => periodoDelAno(), [])
  const { data: position } = useCapitalPosition(periodo.from, periodo.to)
  const movimientos = useCapitalMovements()
  const [dialog, setDialog] = useState<'contribution' | 'withdrawal' | null>(null)

  const filas = movimientos.data?.pages.flatMap((p) => p.items) ?? []

  const columns: ColumnDef<CapitalMovement>[] = [
    {
      id: 'number',
      header: '#',
      cell: ({ row }) => <span className="tnum text-muted-foreground">{row.original.number}</span>,
    },
    {
      id: 'movement_date',
      header: 'Fecha',
      cell: ({ row }) => formatDate(row.original.movement_date),
    },
    {
      id: 'direction',
      header: 'Movimiento',
      cell: ({ row }) =>
        row.original.direction === 'contribution' ? (
          <span className="flex items-center gap-1.5 text-sm">
            <ArrowDownLeft className="size-4 text-success" />
            Aporte
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-sm">
            <ArrowUpRight className="size-4 text-warning" />
            Retiro
          </span>
        ),
    },
    { id: 'account', header: 'Cuenta', cell: ({ row }) => row.original.account_name },
    {
      id: 'notes',
      header: 'Motivo',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.notes ?? '—'}</span>
      ),
    },
    {
      id: 'amount',
      header: 'Monto',
      cell: ({ row }) => (
        <Money value={row.original.amount} className="tnum block text-right font-medium" />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Capital del dueño"
        description="Aportes al negocio y retiros. No son ingresos ni gastos: mueven el patrimonio, no la utilidad del período."
        actions={
          <>
            <Can permission="capital.contribute">
              <Button variant="outline" className="rounded-pill" onClick={() => setDialog('contribution')}>
                Registrar aporte
              </Button>
            </Can>
            <Can permission="capital.withdraw">
              <Button className="rounded-pill" onClick={() => setDialog('withdrawal')}>
                Registrar retiro
              </Button>
            </Can>
          </>
        }
      />

      {position && <PositionCard position={position} />}

      <DataTable
        columns={columns}
        data={filas}
        getRowId={(row) => row.id}
        isLoading={movimientos.isLoading}
        isRefreshing={movimientos.isFetching && !movimientos.isFetchingNextPage}
        isError={movimientos.isError}
        error={movimientos.error}
        onRetry={() => movimientos.refetch()}
        emptyTitle="Todavía no hay aportes ni retiros"
        emptyDescription="Cuando el dueño meta o saque plata del negocio, cada movimiento queda acá con su fecha, su cuenta y su motivo."
        hasNextPage={movimientos.hasNextPage}
        isFetchingNextPage={movimientos.isFetchingNextPage}
        onLoadMore={() => movimientos.fetchNextPage()}
      />

      <CapitalMovementDialog
        // La `key` remonta el diálogo por sentido: sin ella, abrir "aporte"
        // después de "retiro" reusaría el formulario a medio llenar y la
        // MISMA `Idempotency-Key` (que `useMoneyMutation` genera al montar).
        key={dialog ?? 'cerrado'}
        open={dialog !== null}
        onOpenChange={(v) => !v && setDialog(null)}
        direction={dialog ?? 'contribution'}
        position={position}
      />
    </div>
  )
}
