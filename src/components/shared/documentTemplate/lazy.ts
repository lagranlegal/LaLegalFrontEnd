import { lazy } from 'react'

/**
 * Tiptap (react+core+starter-kit+pm) pesa ~134KB gzip — cargado con
 * `React.lazy` en vez de import estático, mismo criterio que `xlsx`
 * (`lib/export/xlsx.ts`): quien nunca abre `/configuracion/documentos` ni
 * imprime un contrato con plantilla activa no paga ese peso. Confirmado
 * con `npm run build`: sin esto, el bundle principal subía de 482KB a
 * 616KB gzip — con esto, vuelve a 482KB y Tiptap queda en su propio chunk.
 *
 * Un solo lugar para las dos versiones (edición/solo-lectura) — los 3
 * consumidores (`ContractPrintView`, `SettlementPrintView`,
 * `DocumentTemplatesPage`) importan de acá, nunca de los archivos reales
 * directamente.
 */
export const LazyTemplateEditor = lazy(() =>
  import('@/components/shared/documentTemplate/TemplateEditor').then((m) => ({ default: m.TemplateEditor })),
)

export const LazyTemplateRenderer = lazy(() =>
  import('@/components/shared/documentTemplate/TemplateRenderer').then((m) => ({ default: m.TemplateRenderer })),
)

/**
 * `window.print()` es síncrono — si el chunk de Tiptap todavía no cargó en
 * el momento del click, `Suspense` mostraría el fallback y ESO es lo que se
 * imprimiría. Los print views llaman esto en un `useEffect` apenas saben
 * que hay una plantilla activa, para darle tiempo de sobra a la descarga
 * antes de que el usuario alcance a hacer click en "Imprimir". Mismo
 * módulo — el cache de `import()` hace que esto y `LazyTemplateRenderer`
 * nunca descarguen el chunk dos veces.
 */
export function preloadTemplateRenderer() {
  return import('@/components/shared/documentTemplate/TemplateRenderer')
}
