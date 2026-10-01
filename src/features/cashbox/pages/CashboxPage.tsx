import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { Money } from '@/components/shared/Money'
import { PhotoThumbnail } from '@/components/shared/PhotoThumbnail'
import { Can } from '@/components/shared/Can'
import { usePermission } from '@/lib/permissions/usePermission'
import { useAccounts } from '@/lib/accounts/list'
import { TransferDialog } from '@/features/accounts/components/TransferDialog'
import { DateRangePicker, type DateRangeValue } from '@/components/shared/DateRangePicker'
import { confirm } from '@/components/shared/confirmStore'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime, formatTime, todayBogota } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { MODULE_LABELS } from '@/lib/modules'
import { useClosingsHistory, type ClosingHistory } from '@/lib/cashbox/closings'
import { SummaryCard, SummaryField } from '@/components/shared/SummaryCard'
import { CashDifference } from '@/components/shared/CashDifference'
import { NoClosingsInRange } from '@/features/cashbox/components/NoClosingsInRange'
import {
  useCashboxCurrent,
  useExpenseCategories,
  useExpensesList,
  useTodaySession,
  useReopenSession,
  reopenSessionErrorMessage,
  type Expense,
} from '@/features/cashbox/api'
import { OpenSessionDialog } from '@/features/cashbox/components/OpenSessionDialog'
import { ExpenseFormDialog } from '@/features/cashbox/components/ExpenseFormDialog'
import { CloseSessionDialog } from '@/features/cashbox/components/CloseSessionDialog'
import { ClosingActDialog } from '@/features/cashbox/components/ClosingActDialog'

function expenseCategoryName(categories: { id: string; name: string }[] | undefined, categoryId: string): string {
  return categories?.find((c) => c.id === categoryId)?.name ?? '—'
}

export function CashboxPage() {
  // 00031: ver el turno de HOY y ver el histórico de cierres son permisos
  // distintos. Un cajero opera y cierra su día sin poder revisar los cierres
  // de días anteriores ni los descuadres de turnos ajenos.
  const canViewHistory = usePermission('cashbox.view_history')
  const { data: session, isPending: sessionPending } = useCashboxCurrent()
  const { data: accounts } = useAccounts()
  const cashAccount = accounts?.find((a) => a.type === 'cash' && a.is_default) ?? accounts?.find((a) => a.type === 'cash')
  const { data: todaySession } = useTodaySession()
  const { data: expenseCategories } = useExpenseCategories()
  const reopenSession = useReopenSession()

  const [openSessionDialogOpen, setOpenSessionDialogOpen] = useState(false)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [expenseDialogNonce, setExpenseDialogNonce] = useState(0)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closeDialogNonce, setCloseDialogNonce] = useState(0)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferNonce, setTransferNonce] = useState(0)
  const [actaClosing, setActaClosing] = useState<ClosingHistory | null>(null)
  const [range, setRange] = useState<DateRangeValue | null>(null)

  const { data: expensesData, isPending: expensesPending, isError: expensesError, refetch: refetchExpenses, hasNextPage: expensesHasNext, isFetchingNextPage: expensesFetchingNext, fetchNextPage: fetchNextExpenses } =
    useExpensesList(session?.id)
  const expenses = expensesData?.pages.flatMap((page) => page.items) ?? []

  const {
    data: closingsData,
    isPending: closingsPending,
    isError: closingsError,
    refetch: refetchClosings,
    hasNextPage: closingsHasNext,
    isFetchingNextPage: closingsFetchingNext,
    fetchNextPage: fetchNextClosings,
  } = useClosingsHistory(range, { enabled: canViewHistory })
  const closings = closingsData?.pages.flatMap((page) => page.items) ?? []

  // Solo si la de HOY ya está cerrada: reabrir una que sigue abierta no
  // tiene sentido, y antes esto se deducía de que existiera un cierre.
  const canReopenToday = todaySession?.status === 'closed'

  // Un turno que quedó abierto de un día anterior. Se compara la FECHA de la
  // sesión contra el hoy de la empresa, no `opened_at`: una sesión abierta
  // sigue siendo la sesión en curso, pero su acta y sus reportes van a salir
  // con la fecha de aquel día.
  const sessionDeOtroDia = !!session && session.session_date !== todayBogota()

  async function handleReopen() {
    if (!todaySession) return
    const result = await confirm({
      title: 'Reabrir caja',
      description: 'Vuelve a dejar la caja de hoy en estado abierto — úsalo solo para corregir un cierre por error.',
      tone: 'danger',
      requireReason: true,
      reasonLabel: 'Motivo de la reapertura',
      confirmLabel: 'Reabrir caja',
    })
    if (!result.confirmed || !result.reason) return
    try {
      await reopenSession.mutateAsync({ sessionId: todaySession.id, reason: result.reason })
      toast.success('Caja reabierta')
    } catch (error) {
      toast.error(reopenSessionErrorMessage(error))
    }
  }

  // Rediseño P3: el monto a la derecha y en color de texto. Un gasto es una
  // salida de plata, no algo que pida acción: el rojo queda para el faltante.
  const expenseColumns: ColumnDef<Expense>[] = [
    { accessorKey: 'description', header: 'Descripción' },
    { accessorKey: 'category_id', header: 'Categoría', cell: (info) => expenseCategoryName(expenseCategories, info.getValue<string>()) },
    { accessorKey: 'module', header: 'Módulo', cell: (info) => MODULE_LABELS[info.getValue<'pawn' | 'store' | 'general'>()] ?? info.getValue<string>() },
    { accessorKey: 'payment_method', header: 'Medio', cell: (info) => PAYMENT_METHOD_LABELS[info.getValue<'cash' | 'transfer' | 'other'>()] ?? info.getValue<string>() },
    {
      accessorKey: 'amount',
      header: 'Monto',
      meta: { align: 'right' },
      cell: (info) => <Money value={info.getValue<string>()} className="font-semibold whitespace-nowrap" />,
    },
    {
      id: 'receipt',
      header: 'Comprobante',
      cell: ({ row }) => (row.original.receipt_url ? <PhotoThumbnail path={row.original.receipt_url} className="size-10" /> : <span className="text-muted-foreground">—</span>),
    },
  ]

  // F9-43: montos a la derecha y la diferencia con palabra («Faltante $ 7.000»).
  const closingColumns: ColumnDef<ClosingHistory>[] = [
    { accessorKey: 'session_date', header: 'Fecha', cell: (info) => <span className="tnum whitespace-nowrap">{formatDate(info.getValue<string>())}</span> },
    { accessorKey: 'expected_cash', header: 'Esperado', meta: { align: 'right' }, cell: (info) => <Money value={info.getValue<string>()} className="whitespace-nowrap" /> },
    { accessorKey: 'counted_cash', header: 'Contado', meta: { align: 'right' }, cell: (info) => <Money value={info.getValue<string>()} className="whitespace-nowrap" /> },
    { accessorKey: 'difference', header: 'Diferencia', meta: { align: 'right' }, cell: (info) => <CashDifference value={info.getValue<string>()} /> },
    { accessorKey: 'closed_at', header: 'Cerrado', cell: (info) => <span className="tnum whitespace-nowrap">{formatDateTime(info.getValue<string>())}</span> },
  ]

  return (
    <>
      <div className="flex flex-col gap-6 print:hidden">
        <PageHeader title="Caja" description="Sesión diaria, gastos y cierre con desglose." />

        {sessionPending ? (
          <div className="h-32 animate-pulse rounded-card bg-border" />
        ) : session ? (
          <section aria-labelledby="caja-turno" className="grid gap-4 rounded-card border border-border bg-card p-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="caja-turno" className="flex items-center gap-2 text-md font-semibold text-foreground">
                  <span aria-hidden className="size-2 rounded-full bg-success" />
                  Caja abierta
                </h2>
                {/* El banner global ya avisa cuando el turno quedó abierto de
                    otro día (F9-01), pero esta card no lo hacía — y es la
                    pantalla donde se opera y se cierra, o sea donde la
                    confusión cuesta. Mismo criterio y mismo dato
                    (`session_date` contra el hoy de la empresa). */}
                {sessionDeOtroDia && (
                  <p className="mt-1 text-caption font-medium text-warning">
                    Turno abierto desde el {formatDate(session.session_date)} a las {formatTime(session.opened_at)}: todo lo que registres hoy
                    entra en ese turno
                  </p>
                )}
              </div>
              {/* `flex-wrap`: son tres botones (gasto, consignar, cerrar) y en
                  360px no cabían en una línea (auditoría de QA, F6-03). */}
              <div className="flex flex-wrap items-center gap-2">
                <Can permission="cashbox.expense">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExpenseDialogNonce((n) => n + 1)
                      setExpenseDialogOpen(true)
                    }}
                  >
                    + Nuevo gasto
                  </Button>
                </Can>
                {/* Consignar vive acá y no solo en Cuentas porque este es el
                    momento en que se hace: con la caja abierta, antes de
                    cerrar. Después del cierre ya no se puede — una sesión
                    cerrada es inmutable. */}
                <Can permission="accounts.transfer">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTransferNonce((n) => n + 1)
                      setTransferOpen(true)
                    }}
                  >
                    Consignar efectivo
                  </Button>
                </Can>
                <Can permission="cashbox.open_close">
                  <Button
                    onClick={() => {
                      setCloseDialogNonce((n) => n + 1)
                      setCloseDialogOpen(true)
                    }}
                  >
                    Cerrar caja
                  </Button>
                </Can>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <SummaryField label="Turno del">{formatDate(session.session_date)}</SummaryField>
              <SummaryField label="Abierta a las">{formatTime(session.opened_at)}</SummaryField>
              {session.opened_by_name && <SummaryField label="Abrió">{session.opened_by_name}</SummaryField>}
              <SummaryField label="Base de apertura">
                <Money value={session.opening_balance} />
              </SummaryField>
              {/* Solo si la sesión lo trae: el front no suma movimientos. */}
              {session.expected_cash && (
                <SummaryField label="Efectivo esperado">
                  <Money value={session.expected_cash} />
                </SummaryField>
              )}
            </dl>
          </section>
        ) : (
          <div className="rounded-card border border-border bg-card">
            <EmptyState
              title={canReopenToday ? 'La caja de hoy ya se cerró' : 'No hay caja abierta hoy'}
              description={canReopenToday ? 'Si el cierre fue un error, puedes reabrirla.' : 'Ábrela para registrar gastos y poder cerrar el día.'}
              action={
                canReopenToday ? (
                  <Can permission="cashbox.reopen" fallback={<p className="text-sm text-muted-foreground">Pídele a un responsable que la reabra.</p>}>
                    <Button disabled={reopenSession.isPending} onClick={handleReopen}>
                      {reopenSession.isPending ? 'Reabriendo…' : 'Reabrir caja'}
                    </Button>
                  </Can>
                ) : (
                  <Can permission="cashbox.open_close" fallback={<p className="text-sm text-muted-foreground">Pídele a un responsable que la abra.</p>}>
                    <Button onClick={() => setOpenSessionDialogOpen(true)}>
                      Abrir caja
                    </Button>
                  </Can>
                )
              }
            />
          </div>
        )}

        {session && (
          <SummaryCard title="Gastos de hoy">
            <DataTable
              embedded
              columns={expenseColumns}
              data={expenses}
              getRowId={(row) => row.id}
              isLoading={expensesPending}
              isError={expensesError}
              onRetry={() => refetchExpenses()}
              emptyTitle="Aún no hay gastos registrados hoy"
              hasNextPage={expensesHasNext}
              isFetchingNextPage={expensesFetchingNext}
              onLoadMore={() => fetchNextExpenses()}
            />
          </SummaryCard>
        )}

        {canViewHistory && (
          <SummaryCard title="Histórico de cierres" action={<DateRangePicker value={range} onChange={setRange} />}>
            {range && !closingsPending && !closingsError && closings.length === 0 ? (
              <NoClosingsInRange range={range} />
            ) : (
              <DataTable
                embedded
                columns={closingColumns}
                data={closings}
                getRowId={(row) => row.session_id}
                isLoading={closingsPending}
                isError={closingsError}
                onRetry={() => refetchClosings()}
                emptyTitle="Aún no hay cierres registrados"
                emptyDescription="Cada cierre de caja queda acá con su acta."
                onRowClick={(row) => setActaClosing(row)}
                hasNextPage={closingsHasNext}
                isFetchingNextPage={closingsFetchingNext}
                onLoadMore={() => fetchNextClosings()}
              />
            )}
          </SummaryCard>
        )}
      </div>

      <OpenSessionDialog open={openSessionDialogOpen} onOpenChange={setOpenSessionDialogOpen} />
      <ExpenseFormDialog key={`expense-${expenseDialogNonce}`} open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} />
      {session && <CloseSessionDialog key={`close-${closeDialogNonce}`} open={closeDialogOpen} onOpenChange={setCloseDialogOpen} session={session} />}
      {actaClosing && <ClosingActDialog open={!!actaClosing} onOpenChange={(open) => !open && setActaClosing(null)} closing={actaClosing} />}
      {transferOpen && (
        <TransferDialog
          key={`transfer-${transferNonce}`}
          open
          onOpenChange={setTransferOpen}
          // Entrando desde Caja el origen es siempre el cajón: es "consignar",
          // no "trasladar" en abstracto.
          defaultFromAccountId={cashAccount?.id}
        />
      )}
    </>
  )
}
