import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusHeadlineView } from '@/features/contracts/components/ContractStatusHeadline'

/**
 * Rediseño P1, tipografía: Archivo (la de la landing) pasa al título de página
 * (600 · 24/28 · −0.025em) y al titular de estado del contrato (700 · 22 ·
 * −0.02em). Las cifras quedan en Inter con tnum.
 */

afterEach(cleanup)

const TOKENS = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8')
const GLOBALS = readFileSync(resolve(__dirname, '../src/styles/globals.css'), 'utf8')

describe('tipografía del rediseño P1', () => {
  it('Archivo está cargada en la app, no solo en la landing', () => {
    expect(GLOBALS).toMatch(/@import '@fontsource-variable\/archivo/)
    expect(TOKENS).toMatch(/--font-display: 'Archivo Variable'/)
  })

  it('los tokens tienen los valores de la propuesta', () => {
    expect(TOKENS).toMatch(/--tracking-title: -0\.025em/)
    expect(TOKENS).toMatch(/--tracking-headline: -0\.02em/)
    expect(TOKENS).toMatch(/--font-size-headline: 1\.375rem/)
  })

  it('el título de página va en Archivo 600 · 24/28 con su tracking', () => {
    render(<PageHeader title="Contratos" />)
    const h1 = screen.getByRole('heading', { level: 1, name: 'Contratos' })
    for (const c of ['font-display', 'text-2xl', 'leading-7', 'font-semibold', 'tracking-title']) expect(h1).toHaveClass(c)
  })

  it('el titular de estado va en Archivo 700 · 22 y la cifra del detalle en tnum', () => {
    render(<StatusHeadlineView tone="danger" title="En mora desde el 28/09/2026" detail="Debe 1 mes" />)
    const titulo = screen.getByText('En mora desde el 28/09/2026')
    for (const c of ['font-display', 'text-headline', 'font-bold', 'tracking-headline']) expect(titulo).toHaveClass(c)
    expect(screen.getByText('Debe 1 mes')).toHaveClass('tnum')
  })

  it('la mora es roja y la prórroga ámbar, cada una con su ícono', () => {
    const { container, unmount } = render(<StatusHeadlineView tone="danger" title="En mora" />)
    expect(screen.getByRole('status')).toHaveClass('bg-danger-soft')
    expect(container.querySelector('svg.lucide-triangle-alert, svg.lucide-alert-triangle')).not.toBeNull()
    unmount()
    const r = render(<StatusHeadlineView tone="warning" title="En prórroga" />)
    expect(screen.getByRole('status')).toHaveClass('bg-warning-soft')
    expect(r.container.querySelector('svg.lucide-hourglass')).not.toBeNull()
  })
})
