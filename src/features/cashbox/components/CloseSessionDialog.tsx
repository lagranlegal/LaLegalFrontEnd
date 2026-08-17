import { useState } from 'react'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { subtractMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useCloseSession, useSessionReport, type Session } from '@/features/cashbox/api'
import { SessionReportPanel } from '@/features/cashbox/components/SessionReportPanel'

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * Cierre de caja con vista previa desde `/report` (CLAUDE.md paso 6):
 * `expected_cash` visible, `counted_cash` se digita, la diferencia se
 * calcula al instante (docs/DESIGN_SYSTEM.md §4.2). Si ≠ 0, la
 * justificación es obligatoria y bloquea el submit — SIN tolerancia, ni un
 * peso de diferencia pasa sin motivo.
 */
export function CloseSessionDialog({ open, onOpenChange, session }: { open: boolean; onOpenChange: (open: boolean) => void; session: Session }) {
  const { data: report, isPending, isError, refetch } = useSessionReport(open ? session.id : undefined)
  const [countedCash, setCountedCash] = useState('0.00')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const closeSession = useCloseSession()

  const difference = report ? subtractMoney(countedCash, report.expected_cash) : '0.00'
  const hasDifference = Number(difference) !== 0
  const reasonMissing = hasDifference && !reason.trim()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (reasonMissing) return
    try {
      await closeSession.mutateAsync({ sessionId: session.id, body: { counted_cash: countedCash, difference_reason: hasDifference ? reason : null } })
      toast.success('Caja cerrada — el acta queda disponible en el histórico')
      onOpenChange(false)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'No se pudo cerrar la caja. Intenta de nuevo.')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cerrar caja"
      description="Cuenta el efectivo físico y regístralo — el desglose de abajo es lo que el sistema espera encontrar."
      size="lg"
      footer={
        <Button form="close-session-form" type="submit" disabled={isPending || !report || closeSession.isPending || reasonMissing} className="w-full rounded-pill">
          {closeSession.isPending ? 'Cerrando…' : 'Cerrar caja'}
        </Button>
      }
    >
      <form id="close-session-form" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {isPending && <div className="h-40 animate-pulse rounded-card bg-border" />}
        {isError && (
          <div className="flex flex-col items-center gap-2 rounded-card border border-border p-card text-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar el desglose.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        {report && <SessionReportPanel report={report} />}

        <div>
          <label htmlFor="counted-cash" className="text-sm font-medium text-foreground">
            Efectivo contado
          </label>
          <MoneyInput id="counted-cash" className="mt-1" value={countedCash} onChange={setCountedCash} autoFocus />
        </div>

        {report && (
          <div className={cn('flex items-center justify-between rounded-input px-3 py-2 text-sm', hasDifference ? 'bg-danger-soft' : 'bg-success-soft')}>
            <span className={hasDifference ? 'text-danger' : 'text-success'}>Diferencia</span>
            <Money value={difference} className={cn('font-semibold', hasDifference ? 'text-danger' : 'text-success')} />
          </div>
        )}

        {hasDifference && (
          <div>
            <label htmlFor="difference-reason" className="text-sm font-medium text-foreground">
              Justificación del descuadre
            </label>
            <textarea id="difference-reason" rows={3} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
            {reasonMissing && <p className="mt-1 text-sm text-danger">Obligatoria mientras haya diferencia, sin excepción.</p>}
          </div>
        )}

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
