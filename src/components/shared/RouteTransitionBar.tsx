import { useRouterState } from '@tanstack/react-router'

/**
 * Barra fija arriba mientras el router está resolviendo una navegación.
 *
 * EL HUECO QUE TAPA. `createRouter` no tenía `defaultPendingComponent`, y
 * TanStack Router, mientras corre el `beforeLoad` de la ruta destino, **sigue
 * mostrando la pantalla anterior**. El layout de la app espera dos cosas por
 * red en su `beforeLoad` —`getSession()` y `GET /me`—, así que cada
 * navegación a una pantalla protegida tenía una ventana en la que la interfaz
 * se veía EXACTAMENTE IGUAL que antes de hacer clic. Sin spinner, sin barra,
 * sin nada.
 *
 * Se reportó como "al crear la contraseña se queda cargando, luego deja de
 * cargar en la misma pantalla y después de un rato lleva al inicio". Los tres
 * momentos eran: la contraseña guardándose, la contraseña ya guardada con el
 * router trabajando en silencio, y el `/me` respondiendo. El del medio es
 * este. Pero no era un problema de esa pantalla: le pasaba a TODA la app, y en
 * las demás se notaba menos solo porque nadie venía de esperar algo.
 *
 * Va acá y no como `defaultPendingComponent` a propósito: un pending component
 * REEMPLAZA el contenido, así que un salto de pestaña de medio segundo
 * parpadearía a blanco. Esto se superpone y deja lo anterior visible, que es
 * lo correcto cuando la espera es corta — la pantalla vieja sigue siendo
 * información útil hasta que llegue la nueva.
 *
 * `pointer-events-none` porque no es un bloqueo: la navegación se puede
 * cancelar haciendo clic en otra parte, y taparlo lo impediría.
 */
export function RouteTransitionBar() {
  const navegando = useRouterState({ select: (s) => s.status === 'pending' })

  if (!navegando) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-border"
      role="status"
      aria-live="polite"
      aria-label="Cargando"
    >
      <div className="h-full w-1/3 animate-[refreshing_1.1s_ease-in-out_infinite] bg-primary motion-reduce:w-full motion-reduce:animate-pulse" />
    </div>
  )
}
