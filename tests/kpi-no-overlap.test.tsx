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
  it('una columna en pantallas angostas, dos desde 400 px', () => {
    const { container } = render(
      <KpiRow>
        <KpiCard label="Cartera activa" value="$ 6.000.000" />
        <KpiCard label="Ventas de hoy" value="$ 0" />
      </KpiRow>,
    )
    const row = container.firstElementChild as HTMLElement
    expect(row.className).toMatch(/(^| )grid-cols-1( |$)/)
    expect(row.className).toContain('min-[400px]:grid-cols-2')
  })

  it('la celda se encoge y la cifra se parte dentro de ella', () => {
    render(<KpiCard label="Cartera activa" value="$ 12.345.678.901" />)
    const cifra = screen.getByText('$ 12.345.678.901')
    expect(cifra.className).toContain('wrap-anywhere')
    expect(cifra.className).toContain('min-w-0')
    expect((cifra.parentElement as HTMLElement).className).toContain('min-w-0')
  })
})
