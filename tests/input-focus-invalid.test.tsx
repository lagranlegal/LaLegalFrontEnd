import { afterEach, describe, expect, it } from 'vitest'
import { createRef } from 'react'
import { readFileSync } from 'node:fs'
import { cleanup, render, screen } from '@testing-library/react'
import { MoneyInput } from '@/components/shared/MoneyInput'

/**
 * F9-25 / F9-26: los campos con error se anuncian (`aria-invalid`), el primer
 * error puede recibir el foco también en un campo de dinero (`ref`), y el foco
 * de un campo se ve (anillo en `--color-ring`, no solo el borde a 2,5:1).
 * jsdom no pinta: el anillo se midió en Chrome sobre el CSS compilado
 * (sombra de 2 px rgb(122, 90, 28) sobre marfil, ~6:1).
 */
afterEach(cleanup)

describe('MoneyInput — error y foco', () => {
  it('invalid marca aria-invalid; sin error no lo pone', () => {
    const { rerender } = render(<MoneyInput id="m" ariaLabel="Monto" value="0.00" onChange={() => {}} invalid />)
    expect(screen.getByLabelText('Monto').getAttribute('aria-invalid')).toBe('true')
    rerender(<MoneyInput id="m" ariaLabel="Monto" value="0.00" onChange={() => {}} />)
    expect(screen.getByLabelText('Monto').hasAttribute('aria-invalid')).toBe(false)
  })

  it('el ref llega al <input>: React Hook Form puede enfocarlo como primer error', () => {
    const ref = createRef<HTMLInputElement>()
    render(<MoneyInput ref={ref} ariaLabel="Monto" value="0.00" onChange={() => {}} />)
    ref.current?.focus()
    expect(document.activeElement).toBe(screen.getByLabelText('Monto'))
  })

  it('el anillo envuelve el campo compuesto, no el <input> de adentro', () => {
    const { container } = render(<MoneyInput ariaLabel="Monto" value="0.00" onChange={() => {}} />)
    expect((container.firstElementChild as HTMLElement).dataset.focusRing).toBe('within')
    expect(screen.getByLabelText('Monto').dataset.focusRing).toBe('none')
  })
})

describe('globals.css — foco y error para todos los campos', () => {
  const css = readFileSync('src/styles/globals.css', 'utf8')
  it('anillo de foco con el token de foco, por box-shadow (outline-none de las utilidades lo anularía)', () => {
    expect(css).toMatch(/:focus-visible,\s*\[data-focus-ring='within'\]:focus-within\s*\{\s*box-shadow: 0 0 0 2px var\(--color-ring\)/)
  })
  it('aria-invalid pinta el borde de peligro', () => {
    expect(css).toMatch(/\[aria-invalid='true'\][^{]*\{\s*border-color: var\(--danger\)/)
  })
})
