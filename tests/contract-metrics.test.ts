import { describe, expect, it } from 'vitest'
import {
  buildBalanceHistory,
  computeContractMetrics,
  daysSinceStart,
  splitCollected,
} from '@/features/contracts/metrics'
import type { Contract, Payment } from '@/features/contracts/api'

function contract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'c1',
    number: 1,
    legacy_code: null,
    customer_id: 'cust',
    principal: '1000000.00',
    capital_balance: '800000.00',
    appraisal_value: null,
    interest_rate_pct: '5',
    term_months: 4,
    arrears_window_months: 4,
    extension_months: 1,
    start_date: '2026-05-01',
    due_date: '2026-09-01',
    interest_paid_until: '2026-07-01',
    status: 'active',
    extension_ends_at: null,
    ltv_warning: false,
    notes: null,
    signed_photo_url: null,
    created_at: '2026-05-01T10:00:00Z',
    items: [],
    ...overrides,
  } as Contract
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    receipt_number: 1,
    paid_at: '2026-06-01T10:00:00Z',
    months_covered: 1,
    interest_amount: '50000.00',
    capital_amount: '0.00',
    discount_amount: '0.00',
    discount_reason: null,
    payment_method: 'cash',
    total: '50000.00',
    new_capital_balance: '1000000.00',
    new_interest_paid_until: '2026-06-01',
    created_at: '2026-06-01T10:00:00Z',
    ...overrides,
  } as Payment
}

describe('computeContractMetrics', () => {
  it('separa lo que el préstamo GENERÓ de lo que solo devolvió', () => {
    // Préstamo de 1.000.000. Dos abonos: uno de solo interés, otro con
    // interés + 200.000 a capital.
    const metrics = computeContractMetrics(contract(), [
      payment({ interest_amount: '50000.00', capital_amount: '0.00' }),
      payment({
        id: 'p2',
        interest_amount: '50000.00',
        capital_amount: '200000.00',
        new_capital_balance: '800000.00',
      }),
    ])

    // Lo que ganó el negocio: SOLO los intereses.
    expect(metrics.interesesCobrados).toBe('100000.00')
    // El capital devuelto entró a la caja pero NO es ganancia: reduce la deuda.
    expect(metrics.capitalRecuperado).toBe('200000.00')
    expect(metrics.totalCobrado).toBe('300000.00')

    // Rendimiento = intereses / capital prestado. 100.000 sobre 1.000.000.
    expect(metrics.rendimientoPct).toBeCloseTo(10)
    // Capital recuperado: 200.000 de 1.000.000.
    expect(metrics.capitalRecuperadoPct).toBeCloseTo(20)
    expect(metrics.cantidadAbonos).toBe(2)
  })

  it('el interés mensual se calcula sobre el SALDO actual, no sobre el original', () => {
    // Regla del contrato: 5% sobre el capital ACTUAL. Con saldo de 800.000
    // son 40.000, no los 50.000 del principal.
    const metrics = computeContractMetrics(contract({ capital_balance: '800000.00' }), [])
    expect(metrics.interesMensualActual).toBe('40000.00')
  })

  it('suma los descuentos de interés otorgados', () => {
    const metrics = computeContractMetrics(contract(), [
      payment({ discount_amount: '10000.00' }),
      payment({ id: 'p2', discount_amount: '5000.00' }),
    ])
    expect(metrics.descuentos).toBe('15000.00')
  })

  it('sin abonos no inventa rendimiento', () => {
    const metrics = computeContractMetrics(contract({ capital_balance: '1000000.00' }), [])
    expect(metrics.interesesCobrados).toBe('0.00')
    expect(metrics.rendimientoPct).toBe(0)
    expect(metrics.capitalRecuperadoPct).toBe(0)
  })

  it('no divide por cero si el principal fuera 0', () => {
    const metrics = computeContractMetrics(
      contract({ principal: '0.00', capital_balance: '0.00' }),
      [],
    )
    expect(metrics.rendimientoPct).toBeNull()
    expect(metrics.capitalRecuperadoPct).toBeNull()
  })

  it('suma decimal-safe, sin float', () => {
    const metrics = computeContractMetrics(contract(), [
      payment({ interest_amount: '0.10' }),
      payment({ id: 'p2', interest_amount: '0.20' }),
    ])
    // 0.10 + 0.20 en float da 0.30000000000000004.
    expect(metrics.interesesCobrados).toBe('0.30')
  })
})

describe('buildBalanceHistory', () => {
  it('arranca en el principal y sigue el saldo que calculó el backend', () => {
    const puntos = buildBalanceHistory(contract(), [
      payment({ paid_at: '2026-06-01T10:00:00Z', new_capital_balance: '900000.00' }),
      payment({ id: 'p2', paid_at: '2026-07-01T10:00:00Z', new_capital_balance: '800000.00' }),
    ])

    expect(puntos).toEqual([
      { date: '2026-05-01', saldo: '1000000.00' },
      { date: '2026-06-01', saldo: '900000.00' },
      { date: '2026-07-01', saldo: '800000.00' },
    ])
  })

  it('ordena cronológicamente aunque la API los devuelva al revés', () => {
    // `usePaymentsList` los trae del más reciente al más antiguo; una gráfica
    // de evolución se lee hacia adelante.
    const puntos = buildBalanceHistory(contract(), [
      payment({ id: 'p2', paid_at: '2026-07-01T10:00:00Z', new_capital_balance: '800000.00' }),
      payment({ paid_at: '2026-06-01T10:00:00Z', new_capital_balance: '900000.00' }),
    ])
    expect(puntos.map((p) => p.date)).toEqual(['2026-05-01', '2026-06-01', '2026-07-01'])
  })
})

describe('splitCollected', () => {
  it('separa interés de capital para la dona', () => {
    const metrics = computeContractMetrics(contract(), [
      payment({ interest_amount: '100000.00', capital_amount: '200000.00' }),
    ])
    expect(splitCollected(metrics)).toEqual({ interes: 100000, capital: 200000 })
  })
})

describe('daysSinceStart', () => {
  it('cuenta días de calendario', () => {
    expect(daysSinceStart('2026-05-01', '2026-05-31')).toBe(30)
  })

  it('cruza meses y años sin desfase de zona horaria', () => {
    expect(daysSinceStart('2025-12-31', '2026-01-01')).toBe(1)
  })
})
