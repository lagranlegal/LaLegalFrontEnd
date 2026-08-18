import { PrintLayout } from '@/components/shared/PrintLayout'
import { Money } from '@/components/shared/Money'
import { formatDate } from '@/lib/dates'
import type { Contract } from '@/features/contracts/api'
import type { Customer } from '@/lib/customers/search'
import type { Category } from '@/lib/catalogs/categories'

function categoryName(categories: Category[] | undefined, categoryId: string): string {
  return categories?.find((c) => c.id === categoryId)?.name ?? '—'
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
 * **No incluye la firma/sello de la empresa** — `docs/pending/API_GUIDE.md`
 * §15 confirma que `GET/PATCH /company/settings` (donde viviría esa imagen)
 * todavía no existe; CONTEXTO.md pedía que se insertara automáticamente,
 * pero no hay dónde cargarla todavía. Deja dos líneas de firma en blanco
 * (cliente + empresa) para firmar a mano sobre el impreso, y el operador
 * sube la foto del documento ya firmado desde "Editar" → `signed_photo_url`.
 */
export function ContractPrintView({ contract, customer, categories }: { contract: Contract; customer: Customer | undefined; categories: Category[] | undefined }) {
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

      <section className="mt-16 grid grid-cols-2 gap-8 text-sm">
        <div className="border-t border-black/40 pt-2 text-center">Firma del cliente</div>
        <div className="border-t border-black/40 pt-2 text-center">Firma de la empresa</div>
      </section>
    </PrintLayout>
  )
}
