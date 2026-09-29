import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import fixtures from './fixtures/backend-g2.json'
import type { NotificationSettings } from '@/features/settings/notifications/api'
import { parseApiError, userMessage } from '@/lib/api/errors'

/**
 * F8-05 (Ley 2300 de 2023, backend d185e38): la empresa puede ENDURECER los
 * límites de contacto al cliente, no aflojarlos. Piso: lunes a viernes
 * 07:00–19:00, sábado 08:00–15:00, sin domingos ni festivos, 1 por semana,
 * y el control siempre encendido. El backend nuevo rechaza con
 * CONTACT_LIMITS_BELOW_LEGAL_FLOOR (422, `details.fields`, `details.floor`);
 * el desplegado hoy acepta cualquier cosa, así que la pantalla aplica el
 * piso por su cuenta.
 *
 * `avisos_mas_estricto` es la respuesta real de un PATCH aceptado (9–17,
 * 9–12, 0 por semana); `avisos_domingos`, el rechazo real al pedir domingos.
 */
const estricto = fixtures.avisos_mas_estricto.body as unknown as NotificationSettings

/** Lo que el backend desplegado HOY devuelve para una empresa que aflojó todo antes del piso. */
function guardadoAntesDelPiso(): NotificationSettings {
  return {
    ...estricto,
    customer_contact_limits: {
      ...estricto.customer_contact_limits,
      enabled: false,
      max_per_week: 50,
      weekday_hours: ['00:00', '23:59'],
      saturday_hours: ['06:00', '18:00'],
      sundays_and_holidays: true,
    },
  }
}

// Radix (Checkbox, Select) mide con ResizeObserver, que jsdom no trae.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const state = vi.hoisted(() => ({ settings: null as unknown, mutate: vi.fn() }))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/shared/BackLink', () => ({ BackLink: () => null }))
vi.mock('@/features/settings/notifications/components/ContractClauseNotice', () => ({ ContractClauseNotice: () => null }))
vi.mock('@/features/settings/notifications/api', () => ({
  useNotificationSettings: () => ({ data: state.settings, isPending: false, isError: false, refetch: vi.fn() }),
  useUpdateNotificationSettings: () => ({ mutateAsync: state.mutate, isPending: false }),
  useNotificationDeliveries: () => ({ data: { pages: [] }, isPending: false, isError: false, hasNextPage: false, fetchNextPage: vi.fn() }),
}))

const { NotificationSettingsPage } = await import('@/features/settings/notifications/pages/NotificationSettingsPage')
const { draftFromSettings, validateDraft, buildParamsPatch } = await import('@/features/settings/notifications/logic')

beforeEach(() => {
  state.mutate = vi.fn().mockResolvedValue({})
})
afterEach(cleanup)

describe('piso legal — lógica del formulario', () => {
  it('lo que ya es más estricto queda igual', () => {
    const d = draftFromSettings(estricto)
    expect(d).toMatchObject({ limits_enabled: true, max_per_week: '0', weekday_start: '09:00', weekday_end: '17:00', sundays_and_holidays: false })
    expect(validateDraft(d)).toEqual({})
    expect(buildParamsPatch(estricto, d)).toBeNull()
  })

  it('lo guardado por debajo del piso se muestra sujetado, y guardarlo lo corrige', () => {
    const server = guardadoAntesDelPiso()
    const d = draftFromSettings(server)
    expect(d).toMatchObject({
      limits_enabled: true,
      max_per_week: '1',
      weekday_start: '07:00',
      weekday_end: '19:00',
      saturday_start: '08:00',
      saturday_end: '15:00',
      sundays_and_holidays: false,
    })
    expect(buildParamsPatch(server, d)?.customer_contact_limits).toEqual({
      enabled: true,
      max_per_week: 1,
      weekday_hours: ['07:00', '19:00'],
      saturday_hours: ['08:00', '15:00'],
      sundays_and_holidays: false,
    })
  })

  it('no deja escribir por fuera del piso', () => {
    const d = { ...draftFromSettings(estricto), max_per_week: '2', weekday_start: '06:30', saturday_end: '16:00' }
    const errors = validateDraft(d)
    expect(errors.max_per_week).toMatch(/0 y 1/)
    expect(errors.weekday_start).toMatch(/07:00/)
    expect(errors.saturday_end).toMatch(/15:00/)
  })
})

describe('CONTACT_LIMITS_BELOW_LEGAL_FLOOR', () => {
  it('se reconoce y dice qué campo afloja el piso y cuál es el piso', () => {
    const error = parseApiError(fixtures.avisos_domingos.status, fixtures.avisos_domingos.body)
    expect(error.code).toBe('CONTACT_LIMITS_BELOW_LEGAL_FLOOR')
    const msg = userMessage(error)
    expect(msg).toContain('domingos y festivos')
    expect(msg).toContain('07:00 a 19:00')
    expect(msg).toContain('08:00 a 15:00')
  })
})

describe('pantalla de notificaciones — el piso a la vista', () => {
  it('explica en una línea que es un mínimo legal; el interruptor y los domingos no se pueden cambiar', () => {
    state.settings = estricto
    render(<NotificationSettingsPage />)
    expect(screen.getByText(/mínimo legal.*puede endurecer.*no relajar/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Aplicar los límites de contacto' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Aplicar los límites de contacto' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Permitir domingos y festivos' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Permitir domingos y festivos' })).not.toBeChecked()
    expect(screen.getByText(/la ley no permite contactar domingos ni festivos/i)).toBeInTheDocument()
  })

  it('con lo guardado por debajo del piso (backend desplegado hoy) avisa y deja guardar la corrección', () => {
    state.settings = guardadoAntesDelPiso()
    render(<NotificationSettingsPage />)
    expect(screen.getByText(/por debajo del mínimo legal y abajo se ve ajustado/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar parámetros' })).toBeEnabled()
  })

  it('un rechazo del backend marca el campo y muestra el motivo', async () => {
    state.settings = estricto
    state.mutate = vi.fn().mockRejectedValue(parseApiError(fixtures.avisos_domingos.status, fixtures.avisos_domingos.body))
    render(<NotificationSettingsPage />)
    fireEvent.change(screen.getByLabelText('Máximo por día'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar parámetros' }))
    await waitFor(() => expect(screen.getByText(/Ley 2300 de 2023/)).toBeInTheDocument())
  })
})
