/**
 * Datos de la landing pública que no son copia de un solo componente.
 *
 * La copia vive en cada sección; acá queda lo que se comparte entre varias
 * (el canal de contacto, los enlaces del nav) y lo que alguien va a tener que
 * cambiar sin leer JSX.
 */

/**
 * Canal del botón «Solicitar demostración».
 *
 * TODO(Mateo): definir el canal real — un `mailto:` o un enlace `https://…`.
 * Mientras sea `null`, los botones de demostración bajan a la sección final
 * (`#demo`) y la línea de contacto bajo sus botones no se muestra. Nada de
 * inventar un correo o un teléfono: un visitante que escribe a una dirección
 * que nadie lee es peor que uno que no encuentra dónde escribir.
 */
export const DEMO_CONTACT: string | null = null

/** Cómo se lee el canal en la línea bajo el CTA final. */
export function contactLabel(href: string): string {
  if (href.startsWith('mailto:')) return href.slice('mailto:'.length).split('?')[0] ?? href
  return href.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export const DEMO_SECTION_ID = 'demo'

export const NAV_LINKS = [
  { href: '#producto', label: 'Producto' },
  { href: '#cadena', label: 'Cómo funciona' },
  { href: '#para-quien', label: 'Para quién' },
  { href: '#confianza', label: 'Seguridad' },
] as const

export const PAGE_TITLE = 'Prendo — La plataforma para compraventas'
