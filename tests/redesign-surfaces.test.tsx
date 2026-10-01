import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'

/**
 * Rediseño P1, radios y superficies: campo y botón 10, tarjeta 12, diálogo 16,
 * padding de tarjeta 16. Las tarjetas se separan por borde, sin sombra; la
 * sombra queda para lo que flota (diálogos, menús, desplegables).
 */

afterEach(cleanup)

const TOKENS = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8')
const raiz = TOKENS.slice(0, TOKENS.indexOf("[data-theme='dark'] {"))

function archivos(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n)
    if (statSync(ruta).isDirectory()) archivos(ruta, out)
    else if (n.endsWith('.tsx')) out.push(ruta)
  }
  return out
}

describe('radios y superficies del rediseño P1', () => {
  it('los tokens de forma tienen los valores de la propuesta', () => {
    expect(raiz).toMatch(/--radius-input: 10px;/)
    expect(raiz).toMatch(/--radius-card: 12px;/)
    expect(raiz).toMatch(/--radius-modal: 16px;/)
    expect(raiz).toMatch(/--space-card: 16px;/)
    expect(raiz).toMatch(/--shadow-modal: 0 12px 32px rgb\(36 33 28 \/ 0\.14\);/)
  })

  it('ninguna tarjeta del panel lleva sombra (la landing tiene su propio sistema)', () => {
    const conSombra = archivos(resolve(__dirname, '../src'))
      .filter((f) => !f.includes('/features/landing/'))
      .filter((f) => /\bshadow-card\b/.test(readFileSync(f, 'utf8')))
    expect(conSombra).toEqual([])
  })

  it('la fila de KPIs es una tarjeta con borde y sin sombra', () => {
    render(
      <KpiRow>
        <KpiCard label="Cartera" value="$ 1" />
      </KpiRow>,
    )
    const fila = screen.getByText('Cartera').parentElement!.parentElement!
    expect(fila).toHaveClass('rounded-card', 'border', 'p-card')
    expect(fila.className).not.toMatch(/shadow/)
  })

  it('el diálogo flota: radio de modal, borde y sombra', () => {
    render(
      <Dialog open>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Hola</DialogTitle>
        </DialogContent>
      </Dialog>,
    )
    const dialogo = screen.getByRole('dialog')
    expect(dialogo).toHaveClass('rounded-xl', 'border', 'shadow-modal')
  })

  it('menús, selects y popovers usan la sombra de lo que flota', () => {
    for (const f of ['select', 'popover', 'dropdown-menu']) {
      const src = readFileSync(resolve(__dirname, `../src/components/ui/${f}.tsx`), 'utf8')
      expect(src, f).toMatch(/shadow-modal/)
      expect(src, f).not.toMatch(/shadow-(md|lg)\b/)
    }
  })
})
