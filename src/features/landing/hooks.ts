import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/auth/supabase'

const REDUCED = '(prefers-reduced-motion: reduce)'

/**
 * `true` desde que el elemento entra en pantalla por primera vez, y no vuelve
 * a `false`: cada sección de la landing aparece UNA vez.
 *
 * El estado final es el de por defecto. Si no hay `IntersectionObserver`
 * (jsdom, un navegador viejo) o el sistema pide movimiento reducido, arranca
 * en `true` y nada queda esperando un evento que no va a llegar.
 */
export function useInView<T extends Element>(threshold = 0.18) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(
    () =>
      typeof window === 'undefined' ||
      typeof window.IntersectionObserver === 'undefined' ||
      window.matchMedia(REDUCED).matches,
  )

  useEffect(() => {
    const node = ref.current
    if (inView || !node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      // El margen inferior negativo hace que la animación empiece cuando la
      // sección ya se ve de verdad, no cuando asoma un píxel.
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [inView, threshold])

  return [ref, inView] as const
}

/**
 * Si el visitante ya tiene sesión, el nav dice «Ir a mi panel» en vez de
 * «Iniciar sesión». Mientras no se sabe, `false`: el caso de la mayoría.
 */
export function useHasSession(): boolean {
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    let alive = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (alive) setHasSession(Boolean(data.session))
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return hasSession
}

/** `true` cuando la página bajó más de `offset` px — el nav se vuelve translúcido. */
export function useScrolled(offset = 8): boolean {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > offset)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [offset])

  return scrolled
}
