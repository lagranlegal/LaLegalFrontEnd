import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Input, Textarea } from '@/components/ui/input'
import { MoneyInput } from '@/components/shared/MoneyInput'

/**
 * Rediseño P1, §4 «Campo»: radio 10, 44 px, el borde de controles
 * (`--border-strong`, distinto del de una card) y el foco con su token propio
 * (`--focus`, anillo de 2 px puesto en `globals.css`).
 */

afterEach(cleanup)

describe('campo del rediseño P1', () => {
  it('Input y Textarea: radio 10, 44 px, borde de controles y borde de foco', () => {
    render(
      <>
        <Input id="a" aria-label="Nombre" />
        <Textarea id="b" aria-label="Notas" />
      </>,
    )
    for (const campo of [screen.getByLabelText('Nombre'), screen.getByLabelText('Notas')]) {
      expect(campo).toHaveClass('rounded-input', 'min-h-11', 'border-border-strong', 'bg-card', 'focus-visible:border-ring')
      expect(campo.className).not.toMatch(/\bborder-border(?!-)/)
    }
  })

  it('el campo de dinero usa el mismo borde y alto', () => {
    const { container } = render(<MoneyInput id="m" value="0.00" onChange={() => {}} />)
    expect(container.querySelector('[data-focus-ring="within"]')).toHaveClass('min-h-11', 'border-border-strong', 'focus-within:border-ring')
  })

  it('el anillo de foco sale del token --focus', () => {
    const css = readFileSync(resolve(__dirname, '../src/styles/globals.css'), 'utf8')
    expect(css).toMatch(/--color-ring: var\(--focus\);/)
    expect(css).toMatch(/box-shadow: 0 0 0 2px var\(--color-ring\)/)
  })
})
