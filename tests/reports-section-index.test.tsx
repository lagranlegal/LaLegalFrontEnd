import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IndexedSection, SectionIndexLayout } from '@/components/shared/SectionIndex'

/**
 * Rediseño P3: Reportes deja de ser una página de 4.500 px. El índice lateral
 * marca la sección que se está leyendo (IntersectionObserver), salta con anclas
 * reales y pasa el foco a la sección; en el celular, un selector arriba.
 */
type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void
let observerCallback: Callback | null = null
const observed: Element[] = []

class FakeIntersectionObserver {
  constructor(cb: Callback) {
    observerCallback = cb
  }
  observe(el: Element) {
    observed.push(el)
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  observerCallback = null
  observed.length = 0
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const SECTIONS = [
  { id: 'resumen', label: 'Resumen del período' },
  { id: 'estado-resultados', label: 'Estado de resultados' },
  { id: 'desglose', label: 'Desglose' },
]

function Page() {
  return (
    <SectionIndexLayout sections={SECTIONS} label="Secciones del reporte">
      {SECTIONS.map((s) => (
        <IndexedSection key={s.id} id={s.id}>
          <h2>{s.label}</h2>
        </IndexedSection>
      ))}
    </SectionIndexLayout>
  )
}

const nav = () => screen.getByRole('navigation', { name: 'Secciones del reporte' })
const current = () => nav().querySelector('[aria-current="location"]')?.textContent

describe('índice lateral de secciones (rediseño P3)', () => {
  it('un enlace por sección, con ancla real, y la primera marcada al abrir', () => {
    render(<Page />)
    const links = nav().querySelectorAll('a')
    expect([...links].map((a) => a.getAttribute('href'))).toEqual(['#resumen', '#estado-resultados', '#desglose'])
    expect(current()).toBe('Resumen del período')
    // Observa cada sección, no la página entera.
    expect(observed.map((el) => el.id)).toEqual(['resumen', 'estado-resultados', 'desglose'])
  })

  it('marca la sección que entra en la franja de lectura', () => {
    render(<Page />)
    act(() => {
      observerCallback?.([
        { target: document.getElementById('resumen')!, isIntersecting: false },
        { target: document.getElementById('estado-resultados')!, isIntersecting: true },
      ])
    })
    expect(current()).toBe('Estado de resultados')
    // Dos a la vez en la franja: gana la de más arriba en la página.
    act(() => {
      observerCallback?.([{ target: document.getElementById('desglose')!, isIntersecting: true }])
    })
    expect(current()).toBe('Estado de resultados')
  })

  it('el salto lleva la sección a la vista, le pasa el foco y la marca', () => {
    render(<Page />)
    fireEvent.click(screen.getByRole('link', { name: 'Desglose' }))
    const target = document.getElementById('desglose')!
    expect(target.scrollIntoView).toHaveBeenCalled()
    expect(document.activeElement).toBe(target)
    expect(current()).toBe('Desglose')
  })

  it('tras un salto, el desplazamiento no le quita la marca hasta que el usuario mueva la página', () => {
    render(<Page />)
    fireEvent.click(screen.getByRole('link', { name: 'Desglose' }))
    act(() => {
      observerCallback?.([{ target: document.getElementById('estado-resultados')!, isIntersecting: true }])
    })
    expect(current()).toBe('Desglose')
    fireEvent.wheel(window)
    act(() => {
      observerCallback?.([{ target: document.getElementById('estado-resultados')!, isIntersecting: true }])
    })
    expect(current()).toBe('Estado de resultados')
  })

  it('en el celular, un selector con nombre que dice en qué sección se está', () => {
    render(<Page />)
    const trigger = screen.getByRole('combobox', { name: /ir a la sección/i })
    expect(trigger.textContent).toContain('Resumen del período')
  })

  it('sin IntersectionObserver no se rompe: el índice sigue saltando', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(<Page />)
    fireEvent.click(screen.getByRole('link', { name: 'Estado de resultados' }))
    expect(current()).toBe('Estado de resultados')
  })
})
