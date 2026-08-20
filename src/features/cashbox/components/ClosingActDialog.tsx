import { AppDialog } from '@/components/shared/AppDialog'
import { PrintLayout } from '@/components/shared/PrintLayout'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime } from '@/lib/dates'
import { conceptLabel, MODULE_LABELS } from '@/lib/modules'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useSessionReport } from '@/features/cashbox/api'
import type { ClosingHistory } from '@/lib/cashbox/closings'
import { SessionReportPanel } from '@/features/cashbox/components/SessionReportPanel'

/**
 * "Acta de cierre" (CLAUDE.md paso 6: imprimible mientras el backend no
 * genera PDFs). El contenido imprimible (`<PrintLayout>`) vive FUERA del
 * `<AppDialog>`, como hermano — si quedara anidado dentro del modal,
 * `print:hidden` en `DialogContent` (components/ui/dialog.tsx) lo ocultaría
 * también a él, porque un `display:none` en un ancestro esconde a sus hijos
 * sin importar el `display` propio del hijo. `window.print()` no necesita
 * cerrar el diálogo primero: el modal se oculta solo vía `print:hidden`.
 */
/** Mismo alto y forma que `SessionReportPanel` para que el contenido no salte al llegar. */
function SessionReportSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando desglose del cierre">
      <div className="h-10 animate-pulse rounded-input bg-muted/50" />
      <div className="overflow-hidden rounded-input border border-border">
        <div className="h-9 animate-pulse bg-muted/50" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 animate-pulse border-t border-border bg-muted/30" />
        ))}
      </div>
    </div>
  )
}

export function ClosingActDialog({ open, onOpenChange, closing }: { open: boolean; onOpenChange: (open: boolean) => void; closing: ClosingHistory }) {
  const { data: report, isPending, isError, refetch } = useSessionReport(open ? closing.session_id : undefined)
  const hasDifference = Number(closing.difference) !== 0

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Acta de cierre"
        description={formatDate(closing.session_date)}
        size="lg"
        // Sin el desglose cargado el acta saldría incompleta: el botón se
        // deshabilita en vez de imprimir media hoja.
        footer={
          <Button type="button" className="w-full rounded-pill" disabled={!report} onClick={() => window.print()}>
            {report ? 'Imprimir' : 'Cargando desglose…'}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 rounded-input bg-background p-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Saldo inicial</p>
              <Money value={closing.opening_balance} className="font-semibold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Esperado</p>
              <Money value={closing.expected_cash} className="font-semibold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contado</p>
              <Money value={closing.counted_cash} className="font-semibold" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Diferencia</p>
              <Money value={closing.difference} className={hasDifference ? 'font-semibold text-danger' : 'font-semibold text-success'} />
            </div>
          </div>
          {closing.difference_reason && (
            <div>
              <p className="text-xs text-muted-foreground">Justificación</p>
              <p className="text-sm text-foreground">{closing.difference_reason}</p>
            </div>
          )}
          {/* El desglose se pide aparte (`GET /cashbox/sessions/:id/report`),
              así que llega después de que el diálogo ya abrió. Antes acá había
              solo `{report && ...}`: el modal se abría con media pantalla
              vacía y el contenido aparecía de golpe, sin nada que dijera que
              estaba cargando. */}
          {isPending && <SessionReportSkeleton />}
          {isError && (
            <div className="flex flex-col items-start gap-2 rounded-input bg-danger-soft px-3 py-2">
              <p className="text-sm text-danger">No se pudo cargar el desglose del cierre.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          )}
          {report && <SessionReportPanel report={report} />}
        </div>
      </AppDialog>

      {report && (
        <PrintLayout title={`Acta de cierre — ${formatDate(closing.session_date)}`}>
          <div className="mb-4 grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-black/60">Saldo inicial</p>
              <p className="font-medium">
                <Money value={closing.opening_balance} />
              </p>
            </div>
            <div>
              <p className="text-black/60">Esperado</p>
              <p className="font-medium">
                <Money value={closing.expected_cash} />
              </p>
            </div>
            <div>
              <p className="text-black/60">Contado</p>
              <p className="font-medium">
                <Money value={closing.counted_cash} />
              </p>
            </div>
            <div>
              <p className="text-black/60">Diferencia</p>
              <p className="font-medium">
                <Money value={closing.difference} />
              </p>
            </div>
          </div>
          {closing.difference_reason && <p className="mb-4 text-sm">Justificación: {closing.difference_reason}</p>}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/20 text-left">
                <th className="py-1.5">Módulo</th>
                <th className="py-1.5">Concepto</th>
                <th className="py-1.5">Medio</th>
                <th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((line, index) => (
                <tr key={index} className="border-b border-black/10">
                  <td className="py-1.5">{MODULE_LABELS[line.module as keyof typeof MODULE_LABELS] ?? line.module}</td>
                  <td className="py-1.5">{conceptLabel(line.concept)}</td>
                  <td className="py-1.5">{PAYMENT_METHOD_LABELS[line.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? line.payment_method}</td>
                  <td className="py-1.5 text-right">
                    <Money value={line.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-6 text-xs text-black/60">Cerrado el {formatDateTime(closing.closed_at)}.</p>
        </PrintLayout>
      )}
    </>
  )
}
