import type { ReactNode } from 'react'
import { Money } from '@/components/shared/Money'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { formatPercent } from '@/lib/percent'
import { compareMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { LtvEstado } from '@/features/contracts/ltv'

function Row({ label, children, muted = false }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn('tnum text-right text-sm', muted ? 'text-muted-foreground' : 'font-semibold text-foreground')}>{children}</dd>
    </div>
  )
}

/**
 * «Resumen del préstamo» de Nuevo contrato (rediseño P3, F9-30): lo que va a
 * firmar el cliente, en vivo mientras se llena el formulario. Fija a la
 * derecha desde 1024 px; en el celular va al final, antes del botón.
 *
 * Solo muestra lo que se sabe: el plazo sale de la categoría de la primera
 * prenda (como en el backend), el interés de `monthlyInterestPreview` y el
 * LTV de `evaluarLtv`. Las fechas (primer pago, fin del plazo) las pone el
 * backend con el «hoy» de la empresa: no se adivinan acá. Lo que falta se
 * dice con un guion, no con un cero.
 */
export function LoanSummaryCard({
  principal,
  rate,
  termMonths,
  monthlyInterest,
  appraisalValue,
  ltv,
  paymentMethodLabel,
  accountName,
  children,
}: {
  principal: string
  /** La tasa ya normalizada (`previewRate`), o `null` si todavía no hay una válida. */
  rate: string | null
  termMonths: number | null
  monthlyInterest: string | null
  appraisalValue: string | undefined
  ltv: LtvEstado
  paymentMethodLabel: string
  accountName: string | undefined
  /** El botón de registrar y lo que va con él. */
  children: ReactNode
}) {
  const hasAppraisal = !!appraisalValue && compareMoney(appraisalValue, '0.00') > 0
  return (
    <SummaryCard title="Resumen del préstamo" headingId="loan-summary-title" className="lg:sticky lg:top-4">
      <dl className="grid gap-2" aria-live="polite">
        <Row label="Capital">
          <Money value={principal || '0.00'} />
        </Row>
        <Row label="Tasa" muted={rate === null}>
          {rate === null ? '—' : `${formatPercent(rate)} mensual`}
        </Row>
        <Row label="Plazo" muted={termMonths === null}>
          {termMonths === null ? 'Según la categoría' : termMonths === 1 ? '1 mes' : `${termMonths} meses`}
        </Row>
        <Row label="Interés mensual" muted={monthlyInterest === null}>
          {monthlyInterest === null ? '—' : <Money value={monthlyInterest} />}
        </Row>
        {hasAppraisal && (
          <Row label="Avalúo">
            <Money value={appraisalValue} />
          </Row>
        )}
        {ltv.kind !== 'sin-datos' && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Préstamo sobre avalúo</dt>
            {/* Pasarse del cupo pide acción (o el permiso): es el único rojo. */}
            <dd className={cn('tnum text-right text-sm font-semibold', ltv.kind === 'excede' ? 'text-danger' : 'text-foreground')}>
              {formatPercent(ltv.ltvPct, 0)} <span className="font-normal text-muted-foreground">de {formatPercent(ltv.maxLtvPct, 0)}</span>
            </dd>
          </div>
        )}
        <Row label="Sale de">
          {paymentMethodLabel}
          {accountName ? ` · ${accountName}` : ''}
        </Row>
      </dl>
      <div className="flex items-baseline justify-between gap-3 rounded-input bg-brand-50 px-3 py-2.5">
        <span className="text-sm font-semibold text-foreground">Total a entregar</span>
        <Money value={principal || '0.00'} className="text-lg font-bold text-foreground" />
      </div>
      {children}
    </SummaryCard>
  )
}
