import { Suspense, useEffect } from 'react'
import { PrintLayout } from '@/components/shared/PrintLayout'
import { formatDateTime } from '@/lib/dates'
import { useMe } from '@/lib/auth/me'
import { LazyTemplateRenderer, preloadTemplateRenderer } from '@/components/shared/documentTemplate/lazy'
import { useActiveDocumentTemplate } from '@/features/settings/documentTemplates/api'
import { buildSettlementContext } from '@/lib/documents/mergeFields'
import type { Contract } from '@/features/contracts/api'
import type { Customer } from '@/lib/customers/search'
import type { SettlementInfo } from '@/features/contracts/settlement'
import type { JSONContent } from '@tiptap/core'

/**
 * Documento nuevo (no existía antes de esta feature) — solo tiene sentido
 * para un contrato `status='paid'` (lo garantiza el caller, que solo
 * muestra el botón de imprimir en ese estado). Sin plantilla activa,
 * fallback simple hardcodeado — mismo criterio que `ContractPrintView`,
 * pero sin un JSX "de siempre" que replicar porque este documento no
 * existía todavía.
 */
export function SettlementPrintView({ contract, customer, settlement }: { contract: Contract; customer: Customer | undefined; settlement: SettlementInfo }) {
  const { data: me } = useMe()
  const { data: activeTemplate } = useActiveDocumentTemplate('settlement')
  const context = buildSettlementContext(contract, customer, me?.company, settlement)

  useEffect(() => {
    if (activeTemplate) void preloadTemplateRenderer()
  }, [activeTemplate])

  if (activeTemplate) {
    return (
      <PrintLayout title={`Paz y salvo — Contrato #${contract.number}`}>
        <Suspense fallback={null}>
          <LazyTemplateRenderer
            body={activeTemplate.body as JSONContent}
            mergeFieldContext={context}
            companySignatureUrl={me?.company.signature_url ?? null}
            companyLegalName={me?.company.legal_name ?? null}
          />
        </Suspense>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Paz y salvo — Contrato #${contract.number}`}>
      <p className="text-sm leading-relaxed">
        La empresa {me?.company.legal_name ?? me?.company.name} hace constar que el cliente {customer?.full_name ?? '—'}
        {customer && ` (${customer.doc_type.toUpperCase()} ${customer.doc_number})`} canceló en su totalidad el contrato de
        empeño #{contract.number}, suscrito el {context['contrato.fecha_inicio']} por un capital de {context['contrato.capital']}.
      </p>
      <p className="mt-3 text-sm">
        Cancelado el {formatDateTime(settlement.settled_at)} — Recibo No. {settlement.receipt_number}.
      </p>
      <p className="mt-6 text-sm">Se expide el presente paz y salvo para los fines que el cliente estime convenientes.</p>
    </PrintLayout>
  )
}
