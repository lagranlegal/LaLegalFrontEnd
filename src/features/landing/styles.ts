/**
 * Clases que se repiten en toda la landing. Solo utilidades de tokens: el
 * color, el radio y la tipografía salen de `tokens.css`.
 */

/** Ancho del contenido: 1200 px en escritorio, con 16 px de margen en celular. */
export const CONTAINER = 'mx-auto w-full max-w-300 px-4 sm:px-8 xl:px-0'

/** Titulares: Archivo con el tracking de marca. */
export const DISPLAY = 'font-display tracking-display'

/** Espaciado vertical de una sección clara. */
export const SECTION_Y = 'py-16 sm:py-24 lg:py-34'

const BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2.5 rounded-pill transition-colors duration-(--duration-fast) ease-out focus-visible:outline-2 focus-visible:outline-offset-2'

/** Botón dorado. El texto encima es carbón, nunca blanco (2.57:1). */
export const BUTTON_PRIMARY = `${BUTTON} group bg-primary font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-brand-on-dark`

/** Botón con borde sobre el carbón. */
export const BUTTON_GHOST_DARK = `${BUTTON} border border-sidebar-accent font-medium text-sidebar-foreground-strong hover:bg-sidebar-hover focus-visible:outline-brand-on-dark`

/** Tamaño grande (hero y CTA final). */
export const BUTTON_LG = 'px-7 py-4 text-base sm:px-8'

/** Enlace de texto sobre el carbón. */
export const LINK_DARK =
  'rounded-input text-sidebar-foreground transition-colors duration-(--duration-fast) ease-out hover:text-sidebar-foreground-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-on-dark'
