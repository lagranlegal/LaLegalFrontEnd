import type { ReactNode } from 'react'
import { useMe } from '@/lib/auth/me'
import { formatDate, todayBogota } from '@/lib/dates'
import { useSignedPhotoUrl } from '@/lib/storage/photos'
import { cn } from '@/lib/utils'
import {
  LAYOUT_FONT_CLASS,
  LAYOUT_HEADER_DIVIDER_CLASS,
  showAccentBar,
  type DocumentLayout,
} from '@/lib/documents/layouts'

/** El logo vive en el bucket privado, así que necesita URL firmada como cualquier otra imagen. */
function CompanyLogo({ path }: { path: string }) {
  const { data: url } = useSignedPhotoUrl(path)
  if (!url) return null
  return <img src={url} alt="" className="max-h-16 max-w-40 object-contain" />
}

/**
 * Layout imprimible mientras el backend no genera PDFs (docs/DESIGN_SYSTEM.md
 * §3, §1): hoja carta. Oculto en pantalla (`hidden print:block`) — vive
 * siempre en el DOM junto al contenido normal de la página, y aparece SOLO
 * cuando el usuario imprime (`window.print()` desde un botón `print:hidden`).
 * El shell de la app (sidebar/topbar/`CashSessionBanner`) se oculta con la
 * misma convención `print:hidden`.
 *
 * `layout` (`lib/documents/layouts.ts`) da la identidad visual — tipografía,
 * borde del encabezado, barra de acento — de una plantilla activa; sin
 * plantilla activa el caller no pasa `layout` y cae en `'classic'`. El
 * CONTENIDO de una empresa que nunca toca esta feature no cambia ni un
 * carácter (fallback de código, ver `ContractPrintView`), pero `classic` en
 * sí NO es pixel-idéntico al look de antes de esta feature — el borde bajo
 * el encabezado es intencionalmente doble (`LAYOUT_HEADER_DIVIDER_CLASS`),
 * antes era una línea simple. Decisión consciente de Mateo (28/08/2026):
 * mejora estética aceptada, no una regresión a corregir.
 *
 * `screenPreview` hace que el MISMO componente se vea directo en pantalla en
 * vez de solo al imprimir — usado por la vista previa de
 * `/configuracion/documentos`, para que lo que el usuario ve ahí y lo que
 * realmente imprime nunca puedan divergir.
 *
 * Encabezado y pie salen de `GET /me` (no de `GET /company/settings`, que
 * exige el permiso `company.configure`): imprimir un contrato lo hace
 * cualquier asesor. Se configuran en /configuracion.
 */
export function PrintLayout({
  title,
  layout = 'classic',
  screenPreview = false,
  children,
}: {
  title: string
  layout?: DocumentLayout
  screenPreview?: boolean
  children: ReactNode
}) {
  const { data: me } = useMe()
  const company = me?.company
  const documents = company?.documents
  const stackedHeader = layout === 'modern'

  // El div raíz decide TODO lo que se ve: `hidden` en pantalla normal,
  // `print:block` solo al imprimir (o directo visible si `screenPreview`).
  // Como cualquier clase de un descendiente es irrelevante mientras su
  // ancestro tiene `display:none`, el encabezado/barra de acento de abajo
  // usan las mismas clases sin importar el modo — no hace falta duplicar
  // cada una con el prefijo `print:`.
  const containerClass = screenPreview
    ? cn('mx-auto block w-full max-w-204 bg-white p-8 text-black print:hidden', LAYOUT_FONT_CLASS[layout])
    : cn(
        'hidden print:mx-auto print:block print:w-204 print:bg-white print:p-8 print:text-black',
        LAYOUT_FONT_CLASS[layout].replace(/(^|\s)/g, '$1print:'),
      )

  const headerClass = cn(
    'flex gap-4',
    stackedHeader ? 'flex-col items-start' : 'items-start justify-between',
    LAYOUT_HEADER_DIVIDER_CLASS[layout],
  )

  return (
    <div className={containerClass}>
      {showAccentBar(layout) && <div className="mb-4 h-1.5 w-full bg-(--brand-500)" />}

      <header className={headerClass}>
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
        <div className={stackedHeader ? 'text-left' : 'text-right'}>
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
