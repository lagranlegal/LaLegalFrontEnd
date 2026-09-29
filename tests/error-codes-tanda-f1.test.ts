import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/backend-f1.json'
import { belowCostLines, parseApiError, userMessage } from '@/lib/api/errors'

/**
 * Códigos de la tanda F1 del backend. Se mira el CÓDIGO, no el status, y los
 * sobres son REALES (tests/fixtures/backend-f1.json y, el 429,
 * `test_identity.py::test_invitaciones_y_enlaces_tienen_tope_por_hora_por_empresa`).
 */
const RATE_LIMITED = {
  status: 429,
  body: {
    code: 'INVITATIONS_RATE_LIMITED',
    message: 'Se alcanzó el límite de invitaciones y enlaces de acceso de la empresa (2 por hora, 100 por día). Intenta de nuevo más tarde.',
    details: { retry_after_seconds: 3600 },
  },
}

describe('códigos de la tanda F1', () => {
  it.each([
    ['INVALID_DATE_RANGE', fixtures.error_rango_invertido],
    ['DATE_RANGE_TOO_LONG', fixtures.error_rango_largo],
    ['SALE_BELOW_COST_REQUIRES_PERMISSION', fixtures.sale_error_bajo_costo],
    ['INVITATIONS_RATE_LIMITED', RATE_LIMITED],
  ])('%s se reconoce (no cae en UNKNOWN)', (code, sobre) => {
    expect(parseApiError(sobre.status, sobre.body).code).toBe(code)
  })

  it('bajo costo: dice cuánto se pierde y qué hacer, y expone las líneas', () => {
    const error = parseApiError(403, fixtures.sale_error_bajo_costo.body)
    expect(belowCostLines(error)).toHaveLength(1)
    expect(belowCostLines(error)[0]!.unit_cost).toBe('300000.00')
    const msg = userMessage(error).replace(/\s/g, ' ')
    expect(msg).toContain('perdería $ 50.000')
    expect(msg).toContain('permiso de descuentos')
  })

  it('tope de invitaciones: no manda a «generar el enlace», que comparte el cupo, y dice cuánto esperar', () => {
    const msg = userMessage(parseApiError(429, RATE_LIMITED.body))
    expect(msg).toMatch(/límite de invitaciones/)
    expect(msg).toContain('generar el enlace también cuenta')
    expect(msg).toContain('60 minuto')
  })
})
