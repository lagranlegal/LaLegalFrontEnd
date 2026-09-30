import { describe, expect, it, vi } from 'vitest'

/**
 * F9-16: «En mora» era una pastilla chica junto a un «Vencimiento» futuro. El
 * detalle ahora abre con un titular que dice desde cuándo y cuánto se debe;
 * las cifras vienen de `payment-options`, no se calculan en el front.
 */
vi.mock('@/lib/dates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dates')>()),
  todayBogota: () => '2026-09-30',
}))

const { contractStatusHeadline } = await import('@/features/contracts/contractStatus')

const base = { interest_paid_until: '2026-08-28', extension_ends_at: null as string | null }
const quote = { months_owed: 1, payoff_total: '1050000.00' }

describe('contractStatusHeadline', () => {
  it('en mora: desde cuándo, cuánto debe y cuánto salda', () => {
    const h = contractStatusHeadline({ ...base, status: 'in_arrears' }, quote)
    // La mora empieza al CUMPLIRSE el primer mes adeudado (`rules.months_between`
    // pasa de 0 a 1), no en `interest_paid_until`, que es el inicio del mes sin
    // pagar: un contrato del 28/08 sin abonos no está en mora desde que se firmó.
    expect(h?.title).toBe('En mora desde el 28/09/2026')
    expect(h?.detail).toMatch(/Debe 1 mes de interés · para saldar hoy \$\s1\.050\.000/)
  })

  it('en mora con ancla el 31: el mes siguiente recorta el día, como `rules.add_months`', () => {
    expect(contractStatusHeadline({ ...base, interest_paid_until: '2026-08-31', status: 'in_arrears' }, null)?.title).toBe(
      'En mora desde el 30/09/2026',
    )
    expect(contractStatusHeadline({ ...base, interest_paid_until: '2028-01-31', status: 'in_arrears' }, null)?.title).toBe(
      'En mora desde el 29/02/2028',
    )
  })

  it('en prórroga vigente y ya vencida (lista para remate)', () => {
    expect(contractStatusHeadline({ ...base, status: 'in_extension', extension_ends_at: '2026-10-15' }, null)?.title).toMatch(
      /^En prórroga hasta el 15\/10\/2026/,
    )
    expect(contractStatusHeadline({ ...base, status: 'in_extension', extension_ends_at: '2026-09-20' }, null)?.title).toMatch(
      /^Listo para remate: la prórroga terminó el 20\/09\/2026/,
    )
  })

  it('al día o cerrado no lleva titular', () => {
    expect(contractStatusHeadline({ ...base, status: 'active' }, quote)).toBeNull()
    expect(contractStatusHeadline({ ...base, status: 'paid' }, null)).toBeNull()
  })
})
