import type { ReactNode } from 'react'
import { Money } from '@/components/shared/Money'
import { RefreshingBar } from '@/components/shared/RefreshingBar'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { formatDate } from '@/lib/dates'
import { formatPercent } from '@/lib/percent'
import { compareMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { ContractQuote } from '@/features/contracts/api'

function Row({ label, children, muted = false }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn('tnum text-right text-sm', muted ? 'text-muted-foreground' : 'font-semibold text-foreground')}>
        {children}
      </dd>
    </div>
  )
}

/**
 * «Resumen del préstamo» de Nuevo contrato (rediseño P3, F9-30): lo que va a
 * firmar el cliente, en vivo mientras se llena el formulario. Fija a la
 * derecha desde 1024 px; en el celular va al final, antes del botón.
 *
 * Las cifras son la COTIZACIÓN del backend (`POST /contracts/quote`,
 * `useLoanQuote`): la tasa como queda guardada, el interés mensual, el plazo,
 * las dos fechas, el LTV y el total a entregar salen de las mismas funciones
 * que crear el contrato. Acá no se calcula nada (CLAUDE.md regla 6). Lo que la
 * cotización no trae —todavía falta el dato, o no se pudo cotizar— se dice con
 * un guion o con su origen, nunca con un cero. Mientras llega una cotización
 * nueva se sigue viendo la anterior y una barra delgada avisa que va a cambiar.
 */
export function LoanSummaryCard({
  principal,
  quote,
  isUpdating,
  paymentMethodLabel,
  accountName,
  children,
}: {
  /** El monto escrito en el formulario (decimal canónico). */
  principal: string
  /** La cotización vigente; `undefined` si aún no llegó o falló. */
  quote: ContractQuote | undefined
  isUpdating: boolean
  paymentMethodLabel: string
  accountName: string | undefined
  /** El botón de registrar y lo que va con él. */
  children: ReactNode
}) {
  const hasPrincipal = !!principal && compareMoney(principal, '0.00') > 0
  const rate = quote?.interest_rate_pct ?? null
  const term = quote?.term_months ?? null
  const monthlyInterest = quote?.monthly_interest ?? null
  const appraisal = quote?.appraisal_total ?? null
  const appraisalMissing = quote?.override_reason === 'appraisal_missing'
  const ltvPct = quote?.ltv_pct ?? null
  const ltvCeiling = quote?.ltv_ceiling ?? null
  const total = quote?.amount_to_disburse ?? null
  return (
    <SummaryCard title="Resumen del préstamo" headingId="loan-summary-title" className="lg:sticky lg:top-4">
      <RefreshingBar active={isUpdating} className="-mt-1" />
      <dl className="grid gap-2" aria-live="polite" aria-busy={isUpdating}>
        <Row label="Capital" muted={!hasPrincipal}>
          {hasPrincipal ? <Money value={principal} /> : '—'}
        </Row>
        <Row label="Tasa" muted={rate === null}>
          {rate === null ? '—' : `${formatPercent(rate)} mensual`}
        </Row>
        <Row label="Plazo" muted={term === null}>
          {term === null ? 'Según la categoría' : term === 1 ? '1 mes' : `${term} meses`}
        </Row>
        <Row label="Interés mensual" muted={monthlyInterest === null}>
          {monthlyInterest === null ? '—' : <Money value={monthlyInterest} />}
        </Row>
        <Row label="Primer pago" muted={!quote}>
          {quote ? formatDate(quote.first_due_date) : '—'}
        </Row>
        <Row label="Fin del plazo" muted={!quote?.due_date}>
          {quote?.due_date ? formatDate(quote.due_date) : '—'}
        </Row>
        {(appraisal !== null || appraisalMissing) && (
          <Row label="Avalúo" muted={appraisal === null}>
            {appraisal !== null ? <Money value={appraisal} /> : 'Falta el avalúo'}
          </Row>
        )}
        {ltvPct !== null && ltvCeiling !== null && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">Préstamo sobre avalúo</dt>
            {/* Pasarse del cupo pide acción (o el permiso): es el único rojo. */}
            <dd className={cn('tnum text-right text-sm font-semibold', quote?.ltv_exceeded ? 'text-danger' : 'text-foreground')}>
              {formatPercent(ltvPct, 'auto')} <span className="font-normal text-muted-foreground">de {formatPercent(ltvCeiling, 'auto')}</span>
              {quote?.override_reason === 'ltv_exceeded' && quote.max_loan && (
                <span className="mt-0.5 block text-xs font-normal">
                  Pasa el tope de <Money value={quote.max_loan} />
                </span>
              )}
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
        {total === null ? (
          <span className="tnum text-lg font-bold text-muted-foreground">—</span>
        ) : (
          <Money value={total} className="text-lg font-bold text-foreground" />
        )}
      </div>
      {children}
    </SummaryCard>
  )
}
