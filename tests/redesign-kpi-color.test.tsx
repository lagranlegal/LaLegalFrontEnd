import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { KpiCard } from '@/components/shared/KpiCard'

/**
 * Rediseño P1, F9-07: la cifra de un KPI va en color de texto. La «Cartera
 * activa» en rojo se leía como alarma todos los días; el rojo queda solo para
 * lo que pide acción y el color de una comparación va en el delta.
 */

afterEach(cleanup)

/** Las etiquetas `<KpiCard …/>` de un archivo, con sus props completas. */
function kpis(ruta: string): string[] {
  const src = readFileSync(resolve(__dirname, '..', ruta), 'utf8')
  const out: string[] = []
  let i = src.indexOf('<KpiCard')
  while (i !== -1) {
    let k = i + 8
    let depth = 0
    for (; k < src.length; k++) {
      const ch = src[k]
      if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '/' && src[k + 1] === '>' && depth === 0) break
    }
    out.push(src.slice(i, k + 2))
    i = src.indexOf('<KpiCard', k)
  }
  return out
}

describe('KpiCard sin rojo por defecto', () => {
  it('la cifra va en color de texto', () => {
    render(<KpiCard label="Cartera activa" value="$ 31.773.000" />)
    const cifra = screen.getByText('$ 31.773.000')
    expect(cifra).toHaveClass('text-foreground', 'tnum')
    expect(cifra.className).not.toMatch(/text-(danger|success|brand)/)
  })

  it('el rojo existe solo como «pide acción»', () => {
    render(<KpiCard label="Más de 60 días" value="$ 1" tone="danger" />)
    expect(screen.getByText('$ 1')).toHaveClass('text-danger')
  })

  it('el delta lleva el color, según si el cambio es bueno o malo', () => {
    render(
      <>
        <KpiCard label="Ventas" value="$ 2" delta={{ pct: -8, favorable: false }} />
        <KpiCard label="Intereses" value="$ 3" delta={{ pct: 12, favorable: true }} />
      </>,
    )
    expect(screen.getByText('▼ 8% vs período anterior')).toHaveClass('text-danger')
    expect(screen.getByText('▲ 12% vs período anterior')).toHaveClass('text-success')
    expect(screen.getByText('$ 2')).toHaveClass('text-foreground')
  })

  it('en Inicio, la cartera y la caja ya no van en rojo, y ninguna cifra en verde u oro', () => {
    const tarjetas = kpis('src/features/dashboard/pages/DashboardPage.tsx')
    expect(tarjetas.find((t) => t.includes('Cartera activa'))).not.toMatch(/tone=/)
    expect(tarjetas.find((t) => t.includes('Estado de caja'))).not.toMatch(/tone=/)
    for (const t of tarjetas) expect(t).not.toMatch(/tone="(success|brand)"/)
  })

  it('en Reportes, ninguna cifra de KPI se pinta de verde, oro ni rojo por ser entrada o salida', () => {
    for (const ruta of [
      'src/features/reports/pages/ReportesPage.tsx',
      'src/features/reports/components/PerformanceCards.tsx',
      'src/features/reports/components/ContablesSection.tsx',
    ]) {
      for (const t of kpis(ruta)) {
        expect(t, ruta).not.toMatch(/tone="(in|out|success|brand)"|'success'|tone=\{[^}]*'out'/)
      }
    }
  })

  it('en Reportes el rojo queda donde se pide actuar: lo vencido y los cierres descuadrados', () => {
    const contables = kpis('src/features/reports/components/ContablesSection.tsx')
    expect(contables.find((t) => t.includes('Más de 60 días'))).toMatch(/tone=\{vencido \? 'danger'/)
    expect(contables.find((t) => t.includes('Total por pagar'))).not.toMatch(/tone=/)
    const reportes = kpis('src/features/reports/pages/ReportesPage.tsx')
    expect(reportes.find((t) => t.includes('Cierres con descuadre'))).toMatch(/'danger'/)
    expect(reportes.find((t) => t.includes('Gastos operativos'))).not.toMatch(/tone=/)
  })
})
