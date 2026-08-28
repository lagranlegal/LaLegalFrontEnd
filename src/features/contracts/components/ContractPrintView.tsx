import { Suspense, useEffect } from 'react'
import { PrintLayout } from '@/components/shared/PrintLayout'
import { Money } from '@/components/shared/Money'
import { formatDate } from '@/lib/dates'
import { useMe } from '@/lib/auth/me'
import { useSignedPhotoUrl } from '@/lib/storage/photos'
import { LazyTemplateRenderer, preloadTemplateRenderer } from '@/components/shared/documentTemplate/lazy'
import { useActiveDocumentTemplate } from '@/features/settings/documentTemplates/api'
import { buildContractContext } from '@/lib/documents/mergeFields'
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
 * sale peor que antes de que existiera esta función.
 */
function CompanySignature() {
  const { data: me } = useMe()
  const signaturePath = me?.company.signature_url ?? null
  const { data: signatureUrl } = useSignedPhotoUrl(signaturePath)

  return (
    <div>
      <div className="flex h-16 items-end justify-center">
        {signatureUrl && <img src={signatureUrl} alt="" className="max-h-16 object-contain" />}
      </div>
      <div className="border-t border-black/40 pt-2 text-center">
        Firma de la empresa
        {me?.company.legal_name && <span className="block text-xs text-black/60">{me.company.legal_name}</span>}
      </div>
    </div>
  )
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
    const items: PrintableContractItem[] = contract.items.map((item) => ({
      id: item.id,
      description: item.description,
      categoryName: categoryName(categories, item.category_id),
      weight_grams: item.weight_grams,
      serial_imei: item.serial_imei,
      item_appraisal: item.item_appraisal,
    }))
    return (
      <PrintLayout title={`Contrato de empeño #${contract.number}`} layout={activeTemplate.layout}>
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
    <PrintLayout title={`Contrato de empeño #${contract.number}`}>
      <section className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-black/60">Cliente</p>
          <p className="font-medium">{customer?.full_name ?? '—'}</p>
          {customer && <p>{customer.doc_type.toUpperCase()} {customer.doc_number}</p>}
          {customer?.address && <p>{customer.address}</p>}
          {customer?.phone && <p>{customer.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-black/60">Contrato</p>
          <p className="font-medium">
            #{contract.number}
            {contract.legacy_code ? ` (código anterior ${contract.legacy_code})` : ''}
          </p>
          <p>Fecha: {formatDate(contract.start_date)}</p>
          <p>Vencimiento: {formatDate(contract.due_date)}</p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-black/60">Capital prestado</p>
          <p className="font-medium">
            <Money value={contract.principal} />
          </p>
        </div>
        <div>
          <p className="text-black/60">Tasa de interés mensual</p>
          <p className="font-medium">{contract.interest_rate_pct}%</p>
        </div>
        <div>
          <p className="text-black/60">Plazo</p>
          <p className="font-medium">{months(contract.term_months)}</p>
        </div>
        <div>
          <p className="text-black/60">Ventana de mora</p>
          <p className="font-medium">{months(contract.arrears_window_months)}</p>
        </div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/20 text-left">
            <th className="py-1.5">Prenda</th>
            <th className="py-1.5">Categoría</th>
            <th className="py-1.5">Peso</th>
            <th className="py-1.5">Serial/IMEI</th>
            <th className="py-1.5 text-right">Avalúo</th>
          </tr>
        </thead>
        <tbody>
          {contract.items.map((item) => (
            <tr key={item.id} className="border-b border-black/10">
              <td className="py-1.5">{item.description}</td>
              <td className="py-1.5">{categoryName(categories, item.category_id)}</td>
              <td className="py-1.5">{item.weight_grams ? `${item.weight_grams} g` : '—'}</td>
              <td className="py-1.5">{item.serial_imei ?? '—'}</td>
              <td className="py-1.5 text-right">{item.item_appraisal ? <Money value={item.item_appraisal} /> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {contract.notes && <p className="mt-4 text-sm">Notas: {contract.notes}</p>}

      <section className="mt-16 grid grid-cols-2 items-end gap-8 text-sm">
        <div>
          <div className="h-16" />
          <div className="border-t border-black/40 pt-2 text-center">Firma del cliente</div>
        </div>
        <CompanySignature />
      </section>
    </PrintLayout>
  )
}
