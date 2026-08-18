import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { Money } from '@/components/shared/Money'
import { PhotoThumbnail } from '@/components/shared/PhotoThumbnail'
import { Can } from '@/components/shared/Can'
import { DateRangePicker, type DateRangeValue } from '@/components/shared/DateRangePicker'
import { confirm } from '@/components/shared/confirmStore'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime, formatTime } from '@/lib/dates'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { MODULE_LABELS } from '@/lib/modules'
import { cn } from '@/lib/utils'
import {
  useCashboxCurrent,
  useClosingsHistory,
  useExpenseCategories,
  useExpensesList,
  useTodayClosing,
  useReopenSession,
  type ClosingHistory,
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
  const { data: session, isPending: sessionPending } = useCashboxCurrent()
  const { data: todayClosing } = useTodayClosing()
  const { data: expenseCategories } = useExpenseCategories()
  const reopenSession = useReopenSession()

  const [openSessionDialogOpen, setOpenSessionDialogOpen] = useState(false)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [expenseDialogNonce, setExpenseDialogNonce] = useState(0)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closeDialogNonce, setCloseDialogNonce] = useState(0)
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
  } = useClosingsHistory(range)
  const closings = closingsData?.pages.flatMap((page) => page.items) ?? []

  const canReopenToday = !!todayClosing

  async function handleReopen() {
    if (!todayClosing) return
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
      await reopenSession.mutateAsync({ sessionId: todayClosing.session_id, reason: result.reason })
      toast.success('Caja reabierta')
    } catch {
      toast.error('No se pudo reabrir la caja. Intenta de nuevo.')
    }
  }

  const expenseColumns: ColumnDef<Expense>[] = [
    { accessorKey: 'description', header: 'Descripción' },
    { accessorKey: 'category_id', header: 'Categoría', cell: (info) => expenseCategoryName(expenseCategories, info.getValue<string>()) },
    { accessorKey: 'module', header: 'Módulo', cell: (info) => MODULE_LABELS[info.getValue<'pawn' | 'store' | 'general'>()] ?? info.getValue<string>() },
    { accessorKey: 'payment_method', header: 'Medio', cell: (info) => PAYMENT_METHOD_LABELS[info.getValue<'cash' | 'transfer' | 'other'>()] ?? info.getValue<string>() },
    { accessorKey: 'amount', header: 'Monto', cell: (info) => <Money value={info.getValue<string>()} tone="out" /> },
    {
      id: 'receipt',
      header: 'Comprobante',
      cell: ({ row }) => (row.original.receipt_url ? <PhotoThumbnail path={row.original.receipt_url} className="size-10" /> : <span className="text-muted-foreground">—</span>),
    },
  ]

  const closingColumns: ColumnDef<ClosingHistory>[] = [
    { accessorKey: 'session_date', header: 'Fecha', cell: (info) => formatDate(info.getValue<string>()) },
    { accessorKey: 'expected_cash', header: 'Esperado', cell: (info) => <Money value={info.getValue<string>()} /> },
    { accessorKey: 'counted_cash', header: 'Contado', cell: (info) => <Money value={info.getValue<string>()} /> },
    {
      accessorKey: 'difference',
      header: 'Diferencia',
      cell: (info) => {
        const value = info.getValue<string>()
        const hasDifference = Number(value) !== 0
        return <Money value={value} className={cn(hasDifference && 'font-medium text-danger')} />
      },
    },
    { accessorKey: 'closed_at', header: 'Cerrado', cell: (info) => formatDateTime(info.getValue<string>()) },
  ]

  return (
    <>
      <div className="flex flex-col gap-6 print:hidden">
        <PageHeader title="Caja" description="Sesión diaria, gastos y cierre con desglose." />

        {sessionPending ? (
          <div className="h-32 animate-pulse rounded-card bg-border" />
        ) : session ? (
          <div className="rounded-card border border-border bg-card p-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Caja abierta desde las {formatTime(session.opened_at)}</p>
                <p className="tnum text-lg font-semibold text-foreground">
                  Saldo inicial <Money value={session.opening_balance} />
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                <Can permission="cashbox.open_close">
                  <Button
                    className="rounded-pill"
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
          </div>
        ) : (
          <div className="rounded-card border border-border bg-card shadow-card">
            <EmptyState
              title={canReopenToday ? 'La caja de hoy ya se cerró' : 'No hay caja abierta hoy'}
              description={canReopenToday ? 'Si el cierre fue un error, puedes reabrirla.' : 'Ábrela para registrar gastos y poder cerrar el día.'}
              action={
                canReopenToday ? (
                  <Can permission="cashbox.reopen" fallback={<p className="text-sm text-muted-foreground">Pídele a un responsable que la reabra.</p>}>
                    <Button className="rounded-pill" disabled={reopenSession.isPending} onClick={handleReopen}>
                      {reopenSession.isPending ? 'Reabriendo…' : 'Reabrir caja'}
                    </Button>
                  </Can>
                ) : (
                  <Can permission="cashbox.open_close" fallback={<p className="text-sm text-muted-foreground">Pídele a un responsable que la abra.</p>}>
                    <Button className="rounded-pill" onClick={() => setOpenSessionDialogOpen(true)}>
                      Abrir caja
                    </Button>
                  </Can>
                )
              }
            />
          </div>
        )}

        {session && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-foreground">Gastos de hoy</h2>
            <DataTable
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
          </div>
        )}

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">Histórico de cierres</h2>
            <DateRangePicker value={range} onChange={setRange} />
          </div>
          <DataTable
            columns={closingColumns}
            data={closings}
            getRowId={(row) => row.session_id}
            isLoading={closingsPending}
            isError={closingsError}
            onRetry={() => refetchClosings()}
            emptyTitle="Aún no hay cierres registrados"
            onRowClick={(row) => setActaClosing(row)}
            hasNextPage={closingsHasNext}
            isFetchingNextPage={closingsFetchingNext}
            onLoadMore={() => fetchNextClosings()}
          />
        </div>
      </div>

      <OpenSessionDialog open={openSessionDialogOpen} onOpenChange={setOpenSessionDialogOpen} />
      <ExpenseFormDialog key={`expense-${expenseDialogNonce}`} open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} />
      {session && <CloseSessionDialog key={`close-${closeDialogNonce}`} open={closeDialogOpen} onOpenChange={setCloseDialogOpen} session={session} />}
      {actaClosing && <ClosingActDialog open={!!actaClosing} onOpenChange={(open) => !open && setActaClosing(null)} closing={actaClosing} />}
    </>
  )
}
