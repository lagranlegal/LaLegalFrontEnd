import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
 * §3, §1): hoja carta (`@page` en globals.css), encabezado de marca del tenant
 * (logo, razón social, NIT) y pie con los textos de /configuracion.
 *
 * **Imprime SOLO el documento.** Fuera de la vista previa, se monta en un
 * portal como hijo directo de `<body>` con `data-print-document`, y
 * `globals.css` oculta todo lo demás al imprimir — el shell, la página de
 * atrás, el diálogo desde el que se abrió. Antes vivía dentro del árbol de la
 * página y dependía de que cada página se envolviera en `print:hidden`: la
 * lista de Ventas no lo hacía, y el comprobante salía debajo de la tabla
 * completa con el botón de Excel (reportado por el dueño, 25/09/2026). En
 * pantalla sigue oculto (`hidden print:block`): aparece SOLO al imprimir
 * (`window.print()` desde un botón cualquiera).
 *
 * **Colores del papel, no del tema:** todo va con los tokens `--paper-*`, que
 * no se redefinen en oscuro (ver tokens.css). Las piezas de adentro
 * (sección, campo, tabla, firma) están en `PrintBlocks.tsx`.
 *
 * `layout` (`lib/documents/layouts.ts`) da la identidad visual — borde del
 * encabezado, barra de acento, tamaño — de una plantilla activa; sin
 * plantilla activa el caller no pasa `layout` y cae en `'classic'`. El
 * encabezado y el pie van siempre en la tipografía de la app (Inter, con
 * cifras tabulares); solo el TEXTO libre de una plantilla «Clásica» va en
 * serif (`LAYOUT_CONTENT_CLASSES`).
 *
 * `screenPreview` hace que el MISMO componente se vea directo en pantalla en
 * vez de solo al imprimir — usado por la vista previa de
 * `/configuracion/documentos`, para que lo que el usuario ve ahí y lo que
 * realmente imprime nunca puedan divergir. La vista previa NO va en portal:
 * es parte de la página, y al imprimir esa página no sale.
 *
 * Encabezado y pie salen de `GET /me` (no de `GET /company/settings`, que
 * exige el permiso `company.configure`): imprimir un contrato lo hace
 * cualquier asesor. Se configuran en /configuracion.
 */
export function PrintLayout({
  title,
  number,
  layout = 'classic',
  screenPreview = false,
  children,
}: {
  /** Nombre del documento: «Contrato de empeño», «Comprobante de venta». */
  title: string
  /** Número del documento, destacado debajo del nombre. */
  number?: number | string
  layout?: DocumentLayout
  screenPreview?: boolean
  children: ReactNode
}) {
  const { data: me } = useMe()
  const company = me?.company
  const documents = company?.documents
  const stackedHeader = layout === 'modern'

  const headerClass = cn(
    'print-keep flex gap-6',
    stackedHeader ? 'flex-col items-start' : 'items-start justify-between',
    LAYOUT_HEADER_DIVIDER_CLASS[layout],
  )

  const sheet = (
    <div
      className={cn(
        'print-doc bg-paper text-paper-ink',
        LAYOUT_FONT_CLASS[layout],
        // En pantalla (vista previa) la hoja lleva su propio margen; al
        // imprimir el margen lo pone `@page`.
        screenPreview ? 'mx-auto block w-full max-w-204 px-10 py-9 print:hidden' : 'hidden w-full print:block',
      )}
      {...(screenPreview ? {} : { 'data-print-document': '' })}
    >
      {showAccentBar(layout) && <div className="mb-5 h-1.5 w-full bg-paper-accent" />}

      <header className={headerClass}>
        <div className="flex items-center gap-4">
          {company?.logo_url && <CompanyLogo path={company.logo_url} />}
          <div className="leading-snug">
            <p className="text-lg font-semibold tracking-tight">{company?.legal_name || company?.name}</p>
            {/* La razón social manda arriba cuando existe; el nombre comercial
                pasa a segunda línea para no perderlo. */}
            {company?.legal_name && company.name !== company.legal_name && (
              <p className="text-sm text-paper-ink-soft">{company.name}</p>
            )}
            {company?.tax_id && <p className="text-xs text-paper-muted tnum">NIT {company.tax_id}</p>}
            {documents?.header_note && <p className="mt-0.5 text-xs text-paper-muted">{documents.header_note}</p>}
          </div>
        </div>
        <div className={stackedHeader ? 'text-left' : 'shrink-0 text-right'}>
          <p className="text-xs font-semibold tracking-wider text-paper-accent-ink uppercase">{title}</p>
          {number != null && <p className="text-2xl leading-tight font-semibold tnum">Nº {number}</p>}
          <p className="mt-1 text-xs text-paper-muted">Impreso el {formatDate(todayBogota())}</p>
        </div>
      </header>

      {children}

      {(documents?.legal_notice || documents?.footer_note || company?.address || company?.contact_phone) && (
        <footer className="print-keep mt-6 border-t border-paper-rule pt-3 text-paper-muted">
          {documents?.legal_notice && <p className="mb-2 text-xs leading-snug">{documents.legal_notice}</p>}
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
            <span>{documents?.footer_note}</span>
            <span>{[company?.address, company?.contact_phone].filter(Boolean).join(' · ')}</span>
          </div>
        </footer>
      )}
    </div>
  )

  return screenPreview ? sheet : createPortal(sheet, document.body)
}
