import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { StatusHeroView } from '@/features/contracts/components/ContractStatusHero'

afterEach(cleanup)

describe('tarjeta de estado del contrato', () => {
  it('pinta las cifras (la primera en grande) y la línea de tiempo con el hoy marcado', () => {
    render(
      <StatusHeroView
        hero={{
          status: 'in_arrears',
          tone: 'danger',
          title: 'En mora hace 2 días',
          detail: 'Interés pagado hasta 28/08/2026',
          figures: [
            { label: 'Para ponerse al día', value: '$ 100.000', big: true },
            { label: 'Para saldar hoy', value: '$ 1.100.000' },
          ],
          timeline: [
            { label: 'Inicio', date: '2026-06-28', state: 'done' },
            { label: 'Pagado', date: '2026-08-28', state: 'done' },
            { label: 'Hoy', date: '2026-09-30', state: 'now' },
            { label: 'Fin', date: '2026-12-28', state: 'pending' },
          ],
          segments: ['done', 'late', 'pending'],
        }}
      />,
    )
    const card = screen.getByRole('status', { name: 'Estado del contrato' })
    expect(card).toHaveClass('bg-danger-soft')
    expect(within(card).getByText('$ 100.000')).toHaveClass('text-figure-lg')
    expect(within(card).getByText('$ 1.100.000')).toHaveClass('text-headline')
    const linea = screen.getByRole('list', { name: 'Línea de tiempo del contrato' })
    expect(within(linea).getAllByRole('listitem')).toHaveLength(4)
    expect(within(linea).getByText('Hoy').closest('li')).toHaveAttribute('aria-current', 'date')
    expect(within(linea).getByText('30/09/2026')).toBeInTheDocument()
  })
})
