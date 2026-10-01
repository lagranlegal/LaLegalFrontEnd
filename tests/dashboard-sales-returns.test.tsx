import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import fixtures from './fixtures/backend-p2c.json'
import type { Dashboard } from '@/features/dashboard/api'
import { DashboardKpis } from '@/features/dashboard/components/DashboardKpis'

// Respuesta real del backend local: dos ventas por 800.000 y una devolución
// de 300.000 en el mes (F7-07), sin ventas el mes anterior. `month_total` ya
// viene neto. El Inicio del rediseño P2-c muestra el mes, no el día.
const BODY = fixtures.dashboard_devolucion.body as Dashboard
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ')

afterEach(cleanup)

describe('Inicio — ventas del mes netas de devoluciones (F7-07)', () => {
  it('muestra la cifra neta y, debajo, el bruto y lo devuelto', () => {
    render(<DashboardKpis data={BODY} />)
    const mes = text(screen.getByText('Ventas del mes').parentElement)
    expect(mes).toContain('$ 500.000')
    expect(mes).toContain('$ 800.000 vendidas − $ 300.000 devueltas')
  })

  it('sin devoluciones no agrega el detalle', () => {
    render(<DashboardKpis data={{ ...BODY, sales: { ...BODY.sales, month_total: '800000.00', month_returns: '0.00' } }} />)
    expect(text(screen.getByText('Ventas del mes').parentElement)).not.toContain('devueltas')
  })
})
