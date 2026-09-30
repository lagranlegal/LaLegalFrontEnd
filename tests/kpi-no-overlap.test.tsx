import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'

/**
 * F9-06 (ALTO visual): a 360 px las cifras del Inicio se pegaban entre
 * columnas y se leían «$ 6.000.000$ 0». jsdom no mide, así que se fija la
 * estructura que lo impide: una sola columna por debajo de 400 px, celdas
 * que pueden encogerse (min-width 0) y la cifra que baja de línea dentro de
 * su celda antes que invadir la de al lado.
 */
afterEach(cleanup)

describe('KPI — dos cifras nunca comparten línea', () => {
  it('una columna en pantallas angostas, dos desde 480 px', () => {
    const { container } = render(
      <KpiRow>
        <KpiCard label="Cartera activa" value="$ 6.000.000" />
        <KpiCard label="Ventas de hoy" value="$ 0" />
      </KpiRow>,
    )
    const row = container.firstElementChild as HTMLElement
    expect(row.className).toMatch(/(^| )grid-cols-1( |$)/)
    expect(row.className).toContain('min-[480px]:grid-cols-2')
  })

  it('la cifra nunca se parte dentro de un número (sin wrap-anywhere ni break-all)', () => {
    // Verificación del 29/09: con `wrap-anywhere`, entre 1024 y 1280 px se leía
    // «$ 6.000.00 / 0». Medido con Chrome a 360–1920 px: sin él, ninguna cifra
    // se parte ni se sale de su celda con las columnas de `KpiRow`.
    render(<KpiCard label="Cartera activa" value="$ 12.345.678" />)
    const cifra = screen.getByText('$ 12.345.678')
    expect(cifra.className).not.toMatch(/wrap-anywhere|break-all|break-words/)
    expect((cifra.parentElement as HTMLElement).className).toContain('min-w-0')
  })

  it('seis tarjetas van en una sola fila solo desde 1536 px; cuatro, desde 1024', () => {
    const cards = (n: number) => Array.from({ length: n }, (_, i) => <KpiCard key={i} label={`K${i}`} value="$ 6.000.000" />)
    const { container, rerender } = render(<KpiRow>{cards(6)}</KpiRow>)
    const six = (container.firstElementChild as HTMLElement).className
    expect(six).toContain('2xl:flex')
    expect(six).not.toMatch(/(^| )lg:flex/)
    rerender(<KpiRow>{cards(4)}</KpiRow>)
    expect((container.firstElementChild as HTMLElement).className).toMatch(/(^| )lg:flex/)
  })
})
