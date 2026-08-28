export type DocumentLayout = 'classic' | 'modern' | 'compact'

export const LAYOUT_OPTIONS: DocumentLayout[] = ['classic', 'modern', 'compact']

export const LAYOUT_LABELS: Record<DocumentLayout, string> = {
  classic: 'Clásico',
  modern: 'Moderno',
  compact: 'Compacto',
}

/**
 * Tipografía del CONTENIDO enriquecido (envuelve `<EditorContent>`) — usa
 * `@tailwindcss/typography` (`prose`), sin la cual un `<h2>`/lista de Tiptap
 * se ve igual que un párrafo (el preflight de Tailwind resetea encabezados y
 * listas a cero estilo).
 */
export const LAYOUT_CONTENT_CLASSES: Record<DocumentLayout, string> = {
  classic: 'prose prose-sm max-w-none font-serif prose-headings:font-semibold',
  modern: 'prose prose-sm max-w-none font-sans prose-headings:font-bold prose-headings:text-(--brand-600)',
  compact:
    'prose prose-xs max-w-none font-sans prose-headings:font-semibold prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1',
}

/** Familia tipográfica del encabezado/pie de `PrintLayout` (fuera del `body` editable). */
export const LAYOUT_FONT_CLASS: Record<DocumentLayout, string> = {
  classic: 'font-serif',
  modern: 'font-sans',
  compact: 'font-sans text-[13px]',
}

/** Línea divisoria bajo el bloque de encabezado (logo/nombre/título/fecha). */
export const LAYOUT_HEADER_DIVIDER_CLASS: Record<DocumentLayout, string> = {
  classic: 'mb-6 border-b-2 border-double border-black/30 pb-4',
  modern: 'mb-6 border-b border-black/15 pb-4',
  compact: 'mb-3 border-b border-black/20 pb-2',
}

/** Solo "Moderno" lleva la barra de acento de marca arriba de todo — es lo
 * que le da el aire de letterhead; Clásico y Compacto no la llevan. */
export function showAccentBar(layout: DocumentLayout): boolean {
  return layout === 'modern'
}
