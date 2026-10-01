import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import fixtures from './fixtures/backend-p2c.json'
import type { Dashboard } from '@/features/dashboard/api'
import { ContractsByStatusCard } from '@/features/dashboard/components/ContractsByStatusCard'

/**
 * «Contratos por estado» como barra apilada (rediseño P2-c, F9-08/F9-09):
 * cada estado con nombre y número escritos, y un texto alternativo con el
 * resumen. Los listos para remate están DENTRO de `in_extension_count`.
 */
const BODY = fixtures.dashboard_comparado.body as Dashboard
// La maqueta: 21 vigentes, 11 en mora, 4 en prórroga + 1 listo, 2 rematados este mes.
const MAQUETA: Dashboard['contracts'] = {
  ...BODY.contracts,
  active_count: 21,
  in_arrears_count: 11,
  in_extension_count: 5,
  ready_for_auction_count: 1,
  auctioned_this_month: 2,
}

afterEach(cleanup)

describe('Contratos por estado', () => {
  it('barra con texto alternativo y leyenda con conteo, sin contar dos veces el remate', () => {
    render(<ContractsByStatusCard contracts={MAQUETA} />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(
      '21 vigentes, 11 en mora, 4 prórroga, 1 listo para remate, 2 rematados este mes',
    )
    const filas = within(screen.getByRole('list')).getAllByRole('listitem').map((li) => li.textContent)
    expect(filas).toEqual(['Vigentes21', 'En mora11', 'Prórroga4', 'Listos para remate1', 'Rematados este mes2'])
    expect(screen.getByText('37 abiertos')).toBeInTheDocument()
  })

  it('remate rayado (no solo rojo) y un tramo por estado con datos', () => {
    render(<ContractsByStatusCard contracts={MAQUETA} />)
    const tramos = screen.getByRole('img').children
    expect(tramos).toHaveLength(5)
    expect(tramos[3]).toHaveClass('bg-hatch-danger')
  })

  it('con la respuesta real: un estado en 0 no se dibuja, pero su renglón queda', () => {
    render(<ContractsByStatusCard contracts={BODY.contracts} />)
    // 1 vigente y 1 rematado este mes; el resto en 0.
    expect(screen.getByRole('img').children).toHaveLength(2)
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('1 abierto')).toBeInTheDocument()
  })
})
