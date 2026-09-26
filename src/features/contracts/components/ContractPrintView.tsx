import { Suspense, useEffect } from 'react'
import { PrintLayout } from '@/components/shared/PrintLayout'
import { Money } from '@/components/shared/Money'
import { formatDate } from '@/lib/dates'
import { useMe } from '@/lib/auth/me'
import { PrintContractItemsTable, PrintField, PrintSection, PrintSignature } from '@/components/shared/PrintBlocks'
import { LazyTemplateRenderer, preloadTemplateRenderer } from '@/components/shared/documentTemplate/lazy'
import { useActiveDocumentTemplate } from '@/features/settings/documentTemplates/api'
import { buildContractContext } from '@/lib/documents/mergeFields'
import { noticeConsentClauseBlocks } from '@/lib/documents/noticeConsentClause'
import type { PrintableContractItem } from '@/lib/documents/nodes/ItemsTableBlockNode'
import type { Contract } from '@/features/contracts/api'
import type { Customer } from '@/lib/customers/search'
import type { Category } from '@/lib/catalogs/categories'
import type { JSONContent } from '@tiptap/core'

function categoryName(categories: Category[] | undefined, categoryId: string): string {
  return categories?.find((c) => c.id === categoryId)?.name ?? '—'
}

/**
 * Firma de la empresa sobre la línea. Si no hay ninguna cargada en
 * /configuracion, queda el espacio en blanco de siempre — el documento nunca
 * sale peor que antes de que existiera esta función. La misma pieza
 * (`PrintSignature`) que usa el bloque de firma de una plantilla propia.
 */
function CompanySignature() {
  const { data: me } = useMe()
  return <PrintSignature label="Firma de la empresa" detail={me?.company.legal_name} imagePath={me?.company.signature_url ?? null} />
}

/** La cláusula de avisos en el formato de siempre — ver el comentario de `ContractPrintView`. */
function NoticeConsentSection({ contract, customer }: { contract: Contract; customer: Customer | undefined }) {
  const { data: me } = useMe()
  const blocks = noticeConsentClauseBlocks(buildContractContext(contract, customer, me?.company))
  // `data-notice-consent`: el mismo marcado que el nodo de una plantilla
  // propia, así los dos toman el estilo de `.print-doc section[data-notice-consent]`
  // (globals.css) y se ven iguales.
  return (
    <section data-notice-consent="" className="print-keep">
      {blocks.map((block, i) => (block.kind === 'heading' ? <h3 key={i}>{block.text}</h3> : <p key={i}>{block.text}</p>))}
    </section>
  )
}

function printableItems(contract: Contract, categories: Category[] | undefined): PrintableContractItem[] {
  return contract.items.map((item) => ({
    id: item.id,
    description: item.description,
    categoryName: categoryName(categories, item.category_id),
    weight_grams: item.weight_grams,
    serial_imei: item.serial_imei,
    item_appraisal: item.item_appraisal,
  }))
}

function months(count: number): string {
  return `${count} ${count === 1 ? 'mes' : 'meses'}`
}

/**
 * Documento imprimible del contrato (CONTEXTO.md: "Cliente firma el
 * impreso" — fase 1, sin firma en pantalla). Mismo patrón de `PrintLayout`
 * que `ClosingActDialog` (paso 6): vive como hermano de cualquier diálogo,
 * nunca anidado (`print:hidden` en un ancestro lo taparía).
 *
 * Si la empresa activó una plantilla propia (`/configuracion/documentos`),
 * se renderiza esa — mismo `PrintLayout` por fuera, el `body` guardado por
 * dentro vía `TemplateRenderer`. Si no hay ninguna activa (el caso de HOY
 * para toda empresa que no toque esta feature), se sigue imprimiendo con
 * el JSX de siempre, sin cambios: fallback de código, no una plantilla
 * sembrada en la base de datos — cero riesgo de regresión. La firma de la
 * empresa (`CompanySignature`, en el fallback) se estampa automáticamente
 * si está cargada en /configuracion, si no cae a la línea en blanco de
 * siempre.
 *
 * El formato de siempre trae también la cláusula de autorización de avisos
 * (25/09/2026, `lib/documents/noticeConsentClause.ts`), antes de las firmas:
 * mismo texto que el formato de arranque del editor, resuelto a texto plano
 * para no cargar TipTap acá. Es un agregado al final, nada de lo que ya se
 * imprimía se movió.
 */
export function ContractPrintView({ contract, customer, categories }: { contract: Contract; customer: Customer | undefined; categories: Category[] | undefined }) {
  const { data: me } = useMe()
  const { data: activeTemplate } = useActiveDocumentTemplate('contract')

  // `window.print()` es síncrono — precargar el chunk de Tiptap apenas se
  // sabe que hay plantilla activa, para que ya esté en caché cuando el
  // usuario alcance a hacer click en "Imprimir".
  useEffect(() => {
    if (activeTemplate) void preloadTemplateRenderer()
  }, [activeTemplate])

  if (activeTemplate) {
    const items = printableItems(contract, categories)
    return (
      <PrintLayout title="Contrato de empeño" number={contract.number} layout={activeTemplate.layout}>
        <Suspense fallback={null}>
          <LazyTemplateRenderer
            body={activeTemplate.body as JSONContent}
            mergeFieldContext={buildContractContext(contract, customer, me?.company)}
            items={items}
            companySignatureUrl={me?.company.signature_url ?? null}
            companyLegalName={me?.company.legal_name ?? null}
            layout={activeTemplate.layout}
          />
        </Suspense>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title="Contrato de empeño" number={contract.number}>
      <section className="grid grid-cols-2 gap-6">
        <PrintField label="Cliente">
          <p>{customer?.full_name ?? '—'}</p>
          <div className="font-normal text-paper-ink-soft">
            {customer && <p>{customer.doc_type.toUpperCase()} {customer.doc_number}</p>}
            {customer?.address && <p>{customer.address}</p>}
            {customer?.phone && <p>{customer.phone}</p>}
          </div>
        </PrintField>
        <PrintField label="Contrato" align="right">
          <p>
            #{contract.number}
            {contract.legacy_code ? ` (código anterior ${contract.legacy_code})` : ''}
          </p>
          <div className="font-normal text-paper-ink-soft tnum">
            <p>Fecha: {formatDate(contract.start_date)}</p>
            <p>Vencimiento: {formatDate(contract.due_date)}</p>
          </div>
        </PrintField>
      </section>

      {/* LAS DOS FECHAS, y no es un detalle de formato.
          Desde 00053 un contrato que nace de un recargo conserva la fecha del
          contrato original —para que la fecha de cobro del cliente no se
          mueva—, así que "Fecha: 1 de septiembre" queda arriba en un papel
          que se firma el 25. Sin esta línea, el documento está antedatado y
          nada en él lo explica: es un problema legal, no de UI. */}
      {contract.extended_on && contract.extended_on !== contract.start_date && (
        <section className="print-keep mt-6 border-l-2 border-paper-accent bg-paper-accent-soft px-4 py-3 text-sm">
          <p>
            Este contrato <strong>amplía el préstamo</strong> del contrato anterior de la misma
            garantía. Conserva la fecha de aquel ({formatDate(contract.start_date)}) porque el
            interés se sigue liquidando en el mismo ciclo mensual.
          </p>
          <p className="mt-1">
            El recargo de <strong><Money value={contract.extension_amount ?? '0'} /></strong> se
            entregó el <strong>{formatDate(contract.extended_on)}</strong>, fecha en que se firma
            este documento.
          </p>
        </section>
      )}

      <PrintSection title="Condiciones del préstamo">
        <div className="grid grid-cols-4 gap-4 tnum">
          <PrintField label="Capital prestado">
            <Money value={contract.principal} />
          </PrintField>
          <PrintField label="Tasa de interés mensual">{contract.interest_rate_pct}%</PrintField>
          <PrintField label="Plazo">{months(contract.term_months)}</PrintField>
          <PrintField label="Ventana de mora">{months(contract.arrears_window_months)}</PrintField>
        </div>
      </PrintSection>

      <PrintSection title="Prendas en garantía">
        <PrintContractItemsTable items={printableItems(contract, categories)} />
        {contract.notes && <p className="mt-3 text-sm">Notas: {contract.notes}</p>}
      </PrintSection>

      <NoticeConsentSection contract={contract} customer={customer} />

      {/* Las dos líneas quedan a la misma altura: `PrintSignature` reserva el
          mismo espacio con o sin imagen y con o sin segunda línea. */}
      <section className="print-keep mt-10 grid grid-cols-2 gap-12">
        <PrintSignature
          label="Firma del cliente"
          detail={customer ? `${customer.full_name} · ${customer.doc_type.toUpperCase()} ${customer.doc_number}` : undefined}
        />
        <CompanySignature />
      </section>
    </PrintLayout>
  )
}
