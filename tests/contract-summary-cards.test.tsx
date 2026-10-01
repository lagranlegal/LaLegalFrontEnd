import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { formatPercent } from '@/lib/percent'

/**
 * Rediseño P2-a, columna derecha del Resumen: «Préstamo» con la tasa en es-CO
 * («5,00 % mensual», F9-21) y «Prenda» con peso, avalúo y su estado.
 */
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: unknown }) => children }))
vi.mock('@/components/shared/PhotoThumbnail', () => ({ PhotoThumbnail: () => null }))

const { LoanCard, ItemsCard } = await import('@/features/contracts/components/ContractSummaryCards')

const contract = {
  id: 'c1',
  status: 'in_arrears',
  principal: '1000000.00',
  capital_balance: '1000000.00',
  interest_rate_pct: '5.00',
  appraisal_value: '2000000.00',
  start_date: '2026-06-28',
  due_date: '2026-12-28',
  ltv_warning: false,
  items: [
    {
      id: 'i1',
      category_id: 'cat',
      description: 'Cadena oro 18k',
      weight_grams: '10.000',
      serial_imei: null,
      item_appraisal: '2000000.00',
      status: 'in_custody',
      photos: [],
      inventory_item_id: null,
    },
  ],
} as unknown as Parameters<typeof LoanCard>[0]['contract']

afterEach(cleanup)

const texto = (el: HTMLElement | null) => (el?.textContent ?? '').replace(/\s+/g, ' ')

describe('tarjetas del resumen del contrato', () => {
  it('formatPercent usa coma decimal y espacio antes del signo', () => {
    expect(formatPercent('5.00')).toBe('5,00 %')
    expect(formatPercent(12.345, 1)).toBe('12,3 %')
  })

  it('Préstamo: capital, saldo, tasa mensual en es-CO y avalúo; sin fechas en un contrato abierto', () => {
    render(<LoanCard contract={contract} />)
    expect(screen.getByRole('heading', { name: 'Préstamo' })).toBeInTheDocument()
    expect(screen.getByText('5,00 % mensual')).toBeInTheDocument()
    expect(texto(screen.getByText('Avalúo').nextElementSibling as HTMLElement)).toBe('$ 2.000.000')
    expect(screen.queryByText('Inicio')).toBeNull()
  })

  it('un contrato cerrado muestra inicio y fin (no tiene línea de tiempo)', () => {
    render(<LoanCard contract={{ ...contract, status: 'paid' }} />)
    expect(screen.getByText('Fin del plazo')).toBeInTheDocument()
  })

  it('Prenda: peso con coma, avalúo y su estado', () => {
    render(<ItemsCard contract={contract} />)
    expect(screen.getByRole('heading', { name: 'Prenda' })).toBeInTheDocument()
    expect(texto(screen.getByText(/10,0 g/))).toBe('10,0 g · avalúo $ 2.000.000')
    expect(screen.getByText('En custodia')).toBeInTheDocument()
  })
})
