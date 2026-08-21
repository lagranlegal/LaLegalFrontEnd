import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Para animaciones que NO son CSS.
 *
 * `globals.css` ya neutraliza toda animación y transición CSS cuando el
 * sistema pide movimiento reducido, pero Recharts anima desde JavaScript
 * (interpola valores y redibuja): ninguna regla de CSS lo alcanza. Estas
 * gráficas necesitan preguntar la preferencia y apagar su animación a mano.
 *
 * Escucha los cambios en vez de leer una sola vez: la preferencia se puede
 * activar con la app abierta y en macOS es un interruptor de accesibilidad
 * que la gente prende justo cuando el movimiento le está molestando.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(QUERY)
    const onChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches)
    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [])

  return prefersReduced
}
