import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import fixtures from './fixtures/backend-p2c.json'
import type { Dashboard } from '@/features/dashboard/api'
import { DashboardKpis } from '@/features/dashboard/components/DashboardKpis'

/**
 * KPIs del Inicio (rediseño P2-c) contra la respuesta REAL de
 * `/reports/dashboard` con las comparaciones del mes: intereses 40.000 contra
 * 25.000 del mes anterior, ventas 0 contra 450.000, un contrato abierto.
 */
const BODY = fixtures.dashboard_comparado.body as Dashboard
const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
/** Las líneas de la tarjeta (etiqueta, cifra, pie), separadas por un espacio. */
const tarjeta = (label: string) => [...screen.getByText(label).parentElement!.children].map(text).join(' ')

afterEach(cleanup)

describe('KPIs del Inicio', () => {
  it('cartera con los contratos abiertos e inventario con sus artículos', () => {
    render(<DashboardKpis data={BODY} />)
    expect(tarjeta('Cartera activa')).toBe('Cartera activa $ 1.000.000 1 contrato abierto')
    expect(tarjeta('Inventario disponible')).toBe('Inventario disponible $ 0 0 artículos')
  })

  it('el % contra el mes anterior, en es-CO, con el nombre del mes y la flecha de su color', () => {
    render(<DashboardKpis data={BODY} />)
    // as_of 2026-10-01: el mes anterior es septiembre.
    expect(tarjeta('Intereses cobrados del mes')).toBe('Intereses cobrados del mes $ 40.000 ▲ 60 % vs. septiembre')
    expect(screen.getByText('▲ 60 %')).toHaveClass('text-success')
    expect(tarjeta('Ventas del mes')).toBe('Ventas del mes $ 0 ▼ 100 % vs. septiembre')
    expect(screen.getByText('▼ 100 %')).toHaveClass('text-danger')
  })

  it('si el mes anterior fue 0, no hay %: se dice que no hubo movimiento', () => {
    render(<DashboardKpis data={{ ...BODY, contracts: { ...BODY.contracts, interest_collected_prev_month: '0.00' } }} />)
    expect(tarjeta('Intereses cobrados del mes')).toBe('Intereses cobrados del mes $ 40.000 Sin movimiento en septiembre')
    expect(tarjeta('Intereses cobrados del mes')).not.toMatch(/%/)
  })

  it('cada KPI en su propia tarjeta', () => {
    const { container } = render(<DashboardKpis data={BODY} />)
    const fila = container.firstElementChild!
    expect(fila.children).toHaveLength(4)
  })
})
