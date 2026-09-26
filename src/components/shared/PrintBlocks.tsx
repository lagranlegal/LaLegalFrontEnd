import type { ReactNode } from 'react'
import { Money } from '@/components/shared/Money'
import { useSignedPhotoUrl } from '@/lib/storage/photos'
import type { PrintableContractItem } from '@/lib/documents/nodes/ItemsTableBlockNode'
import { cn } from '@/lib/utils'

/**
 * Piezas de los documentos impresos (docs/DESIGN_SYSTEM.md §3, `PrintLayout`):
 * sección con título, campo etiqueta/valor, tabla y bloque de firma. Todo con
 * los tokens `--paper-*`, que no cambian con el tema — el papel es blanco
 * aunque la app esté en oscuro.
 *
 * Existen para que el contrato, el comprobante de venta, el paz y salvo y el
 * acta de cierre hablen el mismo idioma visual sin copiar clases: antes cada
 * uno armaba su tabla a mano con `border-black/20` y el comprobante no se
 * parecía al contrato en nada más que el encabezado.
 */

export function PrintSection({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mt-5 first:mt-0', className)}>
      {title && (
        <h2 className="print-keep mb-2 border-b border-paper-rule pb-1 text-xs font-semibold tracking-wider text-paper-accent-ink uppercase">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

export function PrintField({ label, children, align = 'left' }: { label: string; children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <p className="text-xs text-paper-muted">{label}</p>
      <div className="text-sm font-medium text-paper-ink">{children}</div>
    </div>
  )
}

/** Tabla del documento: encabezado sobre el oro suave de la marca, filas que no se parten entre hojas (`.print-doc tr`, globals.css). */
export function PrintTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <table className="not-prose w-full border-collapse font-sans text-sm tnum">
      <thead>
        <tr className="border-b border-paper-accent bg-paper-accent-soft text-left">{head}</tr>
      </thead>
      <tbody className="text-paper-ink">{children}</tbody>
    </table>
  )
}

export function PrintTh({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={cn('px-2 py-1.5 text-xs font-semibold tracking-wide text-paper-accent-ink uppercase', align === 'right' && 'text-right')}>
      {children}
    </th>
  )
}

export function PrintTd({ children, align = 'left', className }: { children: ReactNode; align?: 'left' | 'right'; className?: string }) {
  return <td className={cn('border-b border-paper-rule px-2 py-2 align-top', align === 'right' && 'text-right whitespace-nowrap', className)}>{children}</td>
}

/**
 * La tabla de prendas del contrato — la MISMA en el formato de siempre
 * (`ContractPrintView`) y en una plantilla propia (`ItemsTableBlockNode`).
 * Mismas columnas y datos que antes; cambia solo la forma.
 */
export function PrintContractItemsTable({ items }: { items: PrintableContractItem[] }) {
  return (
    <PrintTable
      head={
        <>
          <PrintTh>Prenda</PrintTh>
          <PrintTh>Categoría</PrintTh>
          <PrintTh>Peso</PrintTh>
          <PrintTh>Serial/IMEI</PrintTh>
          <PrintTh align="right">Avalúo</PrintTh>
        </>
      }
    >
      {items.map((item) => (
        <tr key={item.id}>
          <PrintTd className="font-medium">{item.description}</PrintTd>
          <PrintTd>{item.categoryName}</PrintTd>
          <PrintTd className="whitespace-nowrap">{item.weight_grams ? `${item.weight_grams} g` : '—'}</PrintTd>
          <PrintTd className="break-all">{item.serial_imei ?? '—'}</PrintTd>
          <PrintTd align="right">{item.item_appraisal ? <Money value={item.item_appraisal} /> : '—'}</PrintTd>
        </tr>
      ))}
    </PrintTable>
  )
}

/**
 * Bloque de firma: un espacio, la línea y el rótulo debajo. El espacio tiene
 * SIEMPRE el mismo alto —con o sin imagen, con o sin segunda línea de
 * rótulo—, así dos firmas lado a lado dejan sus líneas a la misma altura (en
 * el formato de siempre la de la empresa quedaba más arriba por traer la
 * razón social debajo).
 *
 * La imagen (`company.signature_url`) puede ser PNG transparente o con fondo
 * blanco: va sobre la hoja blanca (`--paper`) y no sobre un gris, así que
 * ninguno de los dos deja caja; `object-contain` + `object-bottom` la escalan
 * sin deformarla y la apoyan sobre la línea, como una firma a mano.
 * `mix-blend-multiply` es por el fondo blanco: sin él, el rectángulo blanco de
 * la imagen tapaba el tramo de la línea de firma que queda debajo (se vio en
 * el PDF, el borde de la imagen cae sobre el píxel de la línea). Multiplicado,
 * el blanco no pinta nada y la tinta queda igual.
 *
 * Sin `imagePath`, el espacio queda en blanco para firmar a mano.
 */
export function PrintSignature({ label, detail, imagePath = null }: { label: string; detail?: ReactNode; imagePath?: string | null }) {
  const { data: imageUrl } = useSignedPhotoUrl(imagePath)
  return (
    <div className="print-keep not-prose font-sans text-paper-ink">
      <div data-testid="signature-space" className="flex h-20 items-end justify-center">
        {imageUrl && <img src={imageUrl} alt={label} className="block max-h-20 max-w-[85%] object-contain object-bottom mix-blend-multiply" />}
      </div>
      <div className="border-t border-paper-ink pt-1.5 text-center">
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="text-xs text-paper-muted">{detail}</p>}
      </div>
    </div>
  )
}
