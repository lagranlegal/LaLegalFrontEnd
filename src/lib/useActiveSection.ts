import { useCallback, useEffect, useRef, useState } from 'react'

/** Desde arriba de la ventana, la franja donde una sección cuenta como «la que se está leyendo»: el 40 % superior. */
const READING_BAND = '0px 0px -60% 0px'

/**
 * La sección que se está leyendo, con IntersectionObserver: la primera, en el
 * orden de la página, que toca el 40 % superior de la ventana. Al llegar al
 * final de la página gana la última aunque sea corta (nunca llegaría arriba).
 *
 * `pin` fija una sección tras un salto del índice: el desplazamiento suave
 * cruza las de en medio y las iría marcando una por una. La fijación se suelta
 * con la primera rueda, toque o tecla del usuario.
 */
export function useActiveSection(ids: string[]): [string | undefined, (id: string) => void] {
  const [active, setActive] = useState<string | undefined>(ids[0])
  const pinned = useRef(false)
  const key = ids.join('|')

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') return
    const list = key.split('|').filter(Boolean)
    const visible = new Map<string, boolean>()
    // Solo cuenta en una página que de verdad se desplaza: una que cabe entera
    // está «al final» desde el principio.
    const atBottom = () => {
      const height = document.documentElement.scrollHeight
      return height > window.innerHeight + 2 && window.innerHeight + window.scrollY >= height - 2
    }
    const pick = () => {
      if (pinned.current) return
      const bottom = atBottom()
      const first = bottom ? list[list.length - 1] : list.find((id) => visible.get(id))
      if (first) setActive(first)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting)
        pick()
      },
      { rootMargin: READING_BAND, threshold: 0 },
    )
    for (const id of list) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    const release = () => {
      pinned.current = false
    }
    const onScroll = () => {
      if (!pinned.current && atBottom()) pick()
    }
    window.addEventListener('wheel', release, { passive: true })
    window.addEventListener('touchstart', release, { passive: true })
    window.addEventListener('keydown', release)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('wheel', release)
      window.removeEventListener('touchstart', release)
      window.removeEventListener('keydown', release)
      window.removeEventListener('scroll', onScroll)
    }
  }, [key])

  const pin = useCallback((id: string) => {
    pinned.current = true
    setActive(id)
  }, [])

  // Si la sección marcada dejó de existir (cambió el filtro), manda la primera.
  return [active && ids.includes(active) ? active : ids[0], pin]
}
