import { describe, expect, it, vi } from 'vitest'

// «Listo para remate» compara la prórroga con el hoy de la empresa.
vi.mock('@/lib/dates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dates')>()),
  todayBogota: () => '2026-09-30',
}))

const { contractStatusHero } = await import('@/features/contracts/contractStatus')

/**
 * F9-16 y rediseño P2-a: el detalle abre con una tarjeta de estado que dice
 * desde cuándo, cuánto para ponerse al día y cuánto para saldar. Las cifras
 * vienen de `payment-options` (aquí, copiadas del caso de la maqueta: $1.000.000
 * al 5 %, dos meses adeudados); los días, de la fecha de la empresa.
 */
const today = '2026-09-30'
const base = {
  start_date: '2026-06-28',
  interest_paid_until: '2026-08-28',
  due_date: '2026-12-28',
  extension_ends_at: null as string | null,
}
const quote = {
  months_owed: 2,
  payoff_total: '1100000.00',
  options: [
    { months: 1, interest_amount: '50000.00' },
    { months: 2, interest_amount: '100000.00' },
    { months: 3, interest_amount: '150000.00' },
  ],
}

describe('contractStatusHero', () => {
  it('en mora: días desde que empezó la mora, las tres cifras y la línea de tiempo', () => {
    const h = contractStatusHero({ ...base, status: 'in_arrears' }, { quote, today })
    // La mora empieza al CUMPLIRSE el primer mes adeudado (`rules.months_between`
    // pasa de 0 a 1), no en `interest_paid_until`: 28/09 → 30/09 son 2 días.
    expect(h.title).toBe('En mora hace 2 días')
    expect(h.tone).toBe('danger')
    expect(h.detail).toBe('Interés pagado hasta 28/08/2026')
    expect(h.figures.map((f) => [f.label, f.value.replace(/\s/g, ' ')])).toEqual([
      ['Para ponerse al día', '$ 100.000'],
      ['Para saldar hoy', '$ 1.100.000'],
      ['Fin', '28/12/2026'],
    ])
    expect(h.figures[0]!.big).toBe(true)
    expect(h.timeline?.map((p) => [p.label, p.state])).toEqual([
      ['Inicio', 'done'],
      ['Pagado', 'done'],
      ['Hoy', 'now'],
      ['Fin', 'pending'],
    ])
    expect(h.segments).toEqual(['done', 'late', 'pending'])
  })

  it('un día y el mismo día se dicen en singular y como «desde hoy»', () => {
    expect(contractStatusHero({ ...base, status: 'in_arrears' }, { today: '2026-09-29' }).title).toBe('En mora hace 1 día')
    expect(contractStatusHero({ ...base, status: 'in_arrears' }, { today: '2026-09-28' }).title).toBe('En mora desde hoy')
  })

  it('ancla el 31: el mes siguiente recorta el día, como `rules.add_months`', () => {
    const h = contractStatusHero({ ...base, interest_paid_until: '2026-08-31', status: 'in_arrears' }, { today: '2026-10-02' })
    expect(h.title).toBe('En mora hace 2 días')
  })

  it('sin la cotización no inventa cifras: solo el fin', () => {
    const h = contractStatusHero({ ...base, status: 'in_arrears' }, { today })
    expect(h.figures.map((f) => f.label)).toEqual(['Fin'])
  })

  it('si el backend no ofrece la opción exacta de los meses adeudados, omite «Para ponerse al día»', () => {
    const h = contractStatusHero({ ...base, status: 'in_arrears' }, { quote: { ...quote, options: [quote.options[0]!] }, today })
    expect(h.figures.map((f) => f.label)).toEqual(['Para saldar hoy', 'Fin'])
  })

  it('prórroga en ámbar con su fin; vencida, listo para remate', () => {
    const p = contractStatusHero({ ...base, status: 'in_extension', extension_ends_at: '2026-10-15' }, { quote, today })
    expect(p.tone).toBe('warning')
    expect(p.title).toBe('En prórroga hasta el 15/10/2026')
    expect(p.figures.at(-1)).toEqual({ label: 'Fin de la prórroga', value: '15/10/2026' })
    const r = contractStatusHero({ ...base, status: 'in_extension', extension_ends_at: '2026-09-20' }, { quote, today })
    expect(r.status).toBe('ready_for_auction')
    expect(r.title).toBe('Listo para remate')
    expect(r.detail).toMatch(/^La prórroga terminó el 20\/09\/2026/)
    // «Hoy» queda después del fin: los puntos van en orden de fecha.
    expect(r.timeline?.map((p) => p.label)).toEqual(['Inicio', 'Pagado', 'Fin de la prórroga', 'Hoy'])
  })

  it('vigente: verde, sin «Para ponerse al día»; sin abonos no marca «Pagado»', () => {
    const h = contractStatusHero(
      { ...base, interest_paid_until: '2026-06-28', start_date: '2026-06-28', status: 'active' },
      { quote: { months_owed: 0, payoff_total: '1050000.00', options: [] }, today: '2026-07-10' },
    )
    expect(h.title).toBe('Vigente')
    expect(h.tone).toBe('success')
    expect(h.figures.map((f) => f.label)).toEqual(['Para saldar hoy', 'Fin'])
    expect(h.timeline?.map((p) => p.label)).toEqual(['Inicio', 'Hoy', 'Fin'])
    expect(h.segments).not.toContain('late')
  })

  it('cerrados: titular sin cifras ni línea de tiempo', () => {
    const paid = contractStatusHero({ ...base, status: 'paid' }, { today, settlement: { settled_at: '2026-09-10T15:00:00Z', receipt_number: 12 } })
    expect(paid).toMatchObject({ title: 'Pagado', tone: 'info', figures: [], timeline: null })
    expect(paid.detail).toMatch(/^Saldado el 10\/09\/2026 .* · recibo #12$/)
    expect(contractStatusHero({ ...base, status: 'auctioned' }, { today })).toMatchObject({ title: 'Rematado', tone: 'neutral' })
    expect(contractStatusHero({ ...base, status: 'superseded' }, { today })).toMatchObject({ title: 'Ampliado', tone: 'neutral' })
  })
})
