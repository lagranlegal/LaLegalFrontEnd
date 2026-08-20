import type { ReactNode } from 'react'
import { useMe } from '@/lib/auth/me'
import { formatDate, todayBogota } from '@/lib/dates'
import { useSignedPhotoUrl } from '@/lib/storage/photos'

/** El logo vive en el bucket privado, así que necesita URL firmada como cualquier otra imagen. */
function CompanyLogo({ path }: { path: string }) {
  const { data: url } = useSignedPhotoUrl(path)
  if (!url) return null
  return <img src={url} alt="" className="max-h-16 max-w-40 object-contain" />
}

/**
 * Layout imprimible mientras el backend no genera PDFs (docs/DESIGN_SYSTEM.md
 * §3, §1): hoja carta, tipografía serif legible. Oculto en pantalla
 * (`hidden print:block`) — vive siempre en el DOM junto al contenido normal de
 * la página, y aparece SOLO cuando el usuario imprime (`window.print()` desde
 * un botón `print:hidden`). El shell de la app (sidebar/topbar/
 * `CashSessionBanner`) se oculta con la misma convención `print:hidden`.
 *
 * Encabezado y pie salen de `GET /me` (no de `GET /company/settings`, que
 * exige el permiso `company.configure`): imprimir un contrato lo hace
 * cualquier asesor. Se configuran en /configuracion.
 */
export function PrintLayout({ title, children }: { title: string; children: ReactNode }) {
  const { data: me } = useMe()
  const company = me?.company
  const documents = company?.documents

  return (
    <div className="hidden print:mx-auto print:block print:w-204 print:bg-white print:p-8 print:font-serif print:text-black">
      <header className="mb-6 flex items-start justify-between gap-4 border-b border-black/20 pb-4">
        <div className="flex items-start gap-3">
          {company?.logo_url && <CompanyLogo path={company.logo_url} />}
          <div>
            <p className="text-lg font-semibold">{company?.legal_name || company?.name}</p>
            {/* La razón social manda arriba cuando existe; el nombre comercial
                pasa a segunda línea para no perderlo. */}
            {company?.legal_name && company.name !== company.legal_name && (
              <p className="text-sm text-black/70">{company.name}</p>
            )}
            {company?.tax_id && <p className="text-xs text-black/60">NIT {company.tax_id}</p>}
            {documents?.header_note && <p className="mt-0.5 text-xs text-black/60">{documents.header_note}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-black/60">{title}</p>
          <p className="text-sm text-black/60">{formatDate(todayBogota())}</p>
        </div>
      </header>

      {children}

      {(documents?.legal_notice || documents?.footer_note || company?.address || company?.contact_phone) && (
        <footer className="mt-8 border-t border-black/20 pt-3">
          {documents?.legal_notice && (
            <p className="mb-2 text-[10px] leading-snug text-black/60">{documents.legal_notice}</p>
          )}
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-[10px] text-black/60">
            <span>{documents?.footer_note}</span>
            <span>
              {[company?.address, company?.contact_phone].filter(Boolean).join(' · ')}
            </span>
          </div>
        </footer>
      )}
    </div>
  )
}
