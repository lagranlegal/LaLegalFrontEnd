export type DocumentLayout = 'classic' | 'modern' | 'compact'

export const LAYOUT_OPTIONS: DocumentLayout[] = ['classic', 'modern', 'compact']

export const LAYOUT_LABELS: Record<DocumentLayout, string> = {
  classic: 'Clásico',
  modern: 'Moderno',
  compact: 'Compacto',
}

/**
 * Colores de `prose` (`@tailwindcss/typography`) llevados al papel: sin esto
 * el cuerpo de una plantilla salía en los grises fríos del plugin, que no son
 * los de la app, y los encabezados de «Moderno» en `--brand-600`, que en el
 * tema oscuro es un oro claro casi ilegible sobre la hoja blanca. Los tokens
 * `--paper-*` no cambian con el tema (ver tokens.css).
 */
const PAPER_PROSE =
  '[--tw-prose-body:var(--paper-ink-soft)] [--tw-prose-headings:var(--paper-ink)] [--tw-prose-bold:var(--paper-ink)] [--tw-prose-bullets:var(--paper-muted)] [--tw-prose-counters:var(--paper-muted)] [--tw-prose-hr:var(--paper-rule)]'

/**
 * Tipografía del CONTENIDO enriquecido (envuelve `<EditorContent>`) — usa
 * `@tailwindcss/typography` (`prose`), sin la cual un `<h2>`/lista de Tiptap
 * se ve igual que un párrafo (el preflight de Tailwind resetea encabezados y
 * listas a cero estilo). Clases literales, completas: Tailwind solo genera
 * las que ve escritas en el código.
 */
export const LAYOUT_CONTENT_CLASSES: Record<DocumentLayout, string> = {
  classic: `prose prose-sm max-w-none font-serif prose-headings:font-semibold prose-p:leading-relaxed ${PAPER_PROSE}`,
  modern: `prose prose-sm max-w-none font-sans prose-headings:font-bold prose-headings:text-paper-accent-ink prose-p:leading-relaxed ${PAPER_PROSE}`,
  // `prose-xs` no existe en @tailwindcss/typography (sus tamaños arrancan en
  // `sm`): con él «Compacto» caía al `prose` base de 16 px y salía MÁS grande
  // que los otros dos. Ahora es `prose-sm` con texto de 13 px y márgenes cortos.
  compact: `prose prose-sm max-w-none font-sans prose-headings:font-semibold prose-p:my-1 prose-p:text-[0.8125rem] prose-p:leading-snug prose-li:text-[0.8125rem] prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 ${PAPER_PROSE}`,
}

/**
 * Tipografía base de la hoja en `PrintLayout` (encabezado, pie y los bloques
 * estructurados: tablas, campos, firmas). Siempre la de la app —Inter, con
 * cifras tabulares para el dinero—; el serif de «Clásico» vive solo en el
 * texto libre de la plantilla (`LAYOUT_CONTENT_CLASSES`).
 *
 * Antes esta clase se aplicaba con un `print:` antepuesto en tiempo de
 * ejecución (`'font-serif'.replace(...)`), y Tailwind nunca generó esas
 * clases porque no las veía escritas: el encabezado salía en la fuente del
 * navegador sin que nadie lo notara. Ya no hace falta el prefijo — la hoja
 * entera está oculta en pantalla.
 */
export const LAYOUT_FONT_CLASS: Record<DocumentLayout, string> = {
  classic: 'font-sans text-sm',
  modern: 'font-sans text-sm',
  compact: 'font-sans text-xs',
}

/** Línea divisoria bajo el bloque de encabezado (logo/nombre/título/fecha), en el oro de la marca. */
export const LAYOUT_HEADER_DIVIDER_CLASS: Record<DocumentLayout, string> = {
  classic: 'mb-6 border-b-4 border-double border-paper-accent pb-4',
  modern: 'mb-6 border-b border-paper-rule pb-4',
  compact: 'mb-4 border-b-2 border-paper-accent pb-2',
}

/** Solo "Moderno" lleva la barra de acento de marca arriba de todo — es lo
 * que le da el aire de letterhead; Clásico y Compacto no la llevan. */
export function showAccentBar(layout: DocumentLayout): boolean {
  return layout === 'modern'
}
