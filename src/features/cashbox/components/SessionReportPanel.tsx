import { Money } from '@/components/shared/Money'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { MODULE_LABELS, conceptLabel } from '@/lib/modules'
import type { SessionReport } from '@/features/cashbox/api'

/** Desglose módulo×concepto×medio de una sesión (CLAUDE.md paso 6) — usado en la vista previa antes de cerrar y en el acta de un cierre ya hecho. */
export function SessionReportPanel({ report }: { report: SessionReport }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-input bg-background px-3 py-2 text-sm">
        <span className="text-muted-foreground">Efectivo esperado en caja</span>
        <Money value={report.expected_cash} className="font-semibold" />
      </div>
      <div className="overflow-x-auto rounded-input border border-border">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Módulo</th>
              <th className="px-3 py-2 font-medium">Concepto</th>
              <th className="px-3 py-2 font-medium">Medio</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {report.lines.map((line, index) => (
              <tr key={index}>
                <td className="px-3 py-2 text-foreground">{MODULE_LABELS[line.module as keyof typeof MODULE_LABELS] ?? line.module}</td>
                <td className="px-3 py-2 text-foreground">{conceptLabel(line.concept)}</td>
                <td className="px-3 py-2 text-foreground">{PAYMENT_METHOD_LABELS[line.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? line.payment_method}</td>
                <td className="px-3 py-2 text-right">
                  <Money value={line.total} tone={line.direction === 'out' ? 'out' : 'in'} />
                </td>
              </tr>
            ))}
            {report.lines.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  Sin movimientos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
