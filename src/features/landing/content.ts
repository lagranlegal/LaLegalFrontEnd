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
 * Correo por decisión de Mateo (26/09/2026): todavía no hay número de
 * WhatsApp. Cuando lo haya, cambiar por `https://wa.me/57…` — los botones
 * abren un enlace `https://` en pestaña nueva solos. Con `null`, bajan a la
 * sección final (`#demo`) y la línea de contacto no se muestra.
 *
 * ⚠️ `contacto@prendo.com.co` tiene que RECIBIR: el dominio solo envía
 * (Resend, desde `notificaciones@`). Si el buzón no existe, las solicitudes
 * rebotan sin que nadie se entere — ver `docs/DEPLOY.md`.
 */
export const DEMO_CONTACT: string | null =
  'mailto:contacto@prendo.com.co?subject=Quiero%20una%20demostraci%C3%B3n%20de%20Prendo'

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
