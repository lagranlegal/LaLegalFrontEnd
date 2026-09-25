import { describe, expect, it } from 'vitest'
import type { NotificationEventSetting, NotificationSettings } from '@/features/settings/notifications/api'
import {
  buildParamsPatch,
  draftFromSettings,
  enableConfirmDescription,
  groupEvents,
  validateDraft,
} from '@/features/settings/notifications/logic'

function event(code: string, audience: NotificationEventSetting['audience'], family: string, default_enabled = false): NotificationEventSetting {
  return {
    code,
    audience,
    purpose: 'service',
    family,
    description: code,
    default_enabled,
    enabled: default_enabled,
    overridden: false,
    effective: false,
  }
}

/**
 * Forma de `GET /notifications/settings` para una empresa que nunca tocó la
 * pantalla — los defaults de `preferences.py` (00058), no inventados: umbral
 * "0.00", Ley 2300 con 1/semana y 3/día, 07:00–19:00 y 08:00–15:00.
 */
function settings(overrides: Partial<NotificationSettings> = {}): NotificationSettings {
  return {
    enabled: false,
    provider_configured: true,
    events: [
      event('contract_created', 'customer', 'transactional'),
      event('auction_ready_customer', 'customer', 'state'),
      event('company_daily_digest', 'company', 'digest', true),
      event('company_weekly_digest', 'company', 'digest', true),
      event('alert_sale_voided', 'company', 'alert', true),
      event('user_invitation', 'platform', 'platform', true),
    ],
    thresholds: { discount_amount: '0.00', cash_difference_amount: '0.00' },
    customer_contact_limits: {
      enabled: true,
      max_per_week: 1,
      max_per_day: 3,
      weekday_hours: ['07:00', '19:00'],
      saturday_hours: ['08:00', '15:00'],
      sundays_and_holidays: false,
    },
    stale_after_days: 2,
    digest_recipients: [{ user_id: 'u1', full_name: 'Ana Admin', email: 'ana@example.com' }],
    ...overrides,
  }
}

describe('buildParamsPatch', () => {
  it('sin cambios no manda nada (el backend audita cada campo que llega)', () => {
    const s = settings()
    expect(buildParamsPatch(s, draftFromSettings(s))).toBeNull()
  })

  it('"0" y "0.00" son el mismo umbral', () => {
    const s = settings()
    const d = { ...draftFromSettings(s), discount_amount: '0' }
    expect(buildParamsPatch(s, d)).toBeNull()
  })

  it('manda solo el campo tocado, dentro de su grupo', () => {
    const s = settings()
    const d = { ...draftFromSettings(s), cash_difference_amount: '20000.00', max_per_day: '2' }
    expect(buildParamsPatch(s, d)).toEqual({
      thresholds: { cash_difference_amount: '20000.00' },
      customer_contact_limits: { max_per_day: 2 },
    })
  })

  it('un horario viaja como par aunque cambie solo un extremo', () => {
    const s = settings()
    const d = { ...draftFromSettings(s), saturday_end: '13:00' }
    expect(buildParamsPatch(s, d)).toEqual({ customer_contact_limits: { saturday_hours: ['08:00', '13:00'] } })
  })

  it('nunca incluye `enabled` ni `events`: esos se guardan al tocarlos, con su confirmación', () => {
    const s = settings()
    const d = { ...draftFromSettings(s), stale_after_days: '5', limits_enabled: false }
    const body = buildParamsPatch(s, d)
    expect(body).toEqual({ stale_after_days: 5, customer_contact_limits: { enabled: false } })
    expect(body).not.toHaveProperty('enabled')
    expect(body).not.toHaveProperty('events')
  })
})

describe('validateDraft', () => {
  it('los defaults son válidos', () => {
    expect(validateDraft(draftFromSettings(settings()))).toEqual({})
  })

  it('mismos rangos que el backend (stale 0–30, semana 0–50, día 0–20)', () => {
    const d = { ...draftFromSettings(settings()), stale_after_days: '31', max_per_week: '-1', max_per_day: '2.5' }
    expect(Object.keys(validateDraft(d)).sort()).toEqual(['max_per_day', 'max_per_week', 'stale_after_days'])
  })

  it('el inicio tiene que ser antes que el fin (el backend responde 422 si no)', () => {
    const d = { ...draftFromSettings(settings()), weekday_start: '19:00', weekday_end: '19:00' }
    expect(validateDraft(d)).toHaveProperty('weekday_end')
  })
})

describe('groupEvents', () => {
  it('los de la plataforma no aparecen: el backend no deja configurarlos por empresa', () => {
    const codes = groupEvents(settings().events).flatMap((g) => g.events.map((e) => e.code))
    expect(codes).not.toContain('user_invitation')
  })

  it('separa resumen, alertas y avisos al cliente', () => {
    const groups = groupEvents(settings().events)
    expect(groups.map((g) => [g.key, g.events.map((e) => e.code)])).toEqual([
      ['digest', ['company_daily_digest', 'company_weekly_digest']],
      ['alert', ['alert_sale_voided']],
      ['customer', ['contract_created', 'auction_ready_customer']],
    ])
  })
})

describe('enableConfirmDescription', () => {
  it('nombra a quién le va a llegar y avisa del semanal de la primera corrida', () => {
    const text = enableConfirmDescription(settings())
    expect(text).toContain('Ana Admin (ana@example.com)')
    expect(text).toContain('resumen semanal, sea el día que sea')
    expect(text).not.toContain('no está configurado')
  })

  it('sin destinatarios lo dice, en vez de encender algo que no le llega a nadie', () => {
    expect(enableConfirmDescription(settings({ digest_recipients: [] }))).toContain('no le llegaría a nadie')
  })

  it('sin proveedor avisa que no sale ninguno', () => {
    expect(enableConfirmDescription(settings({ provider_configured: false }))).toContain('no sale ninguno')
  })
})
