import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOGOTA_TZ, formatDate, formatDateTime, getActiveTimezone, setActiveTimezone, todayBogota } from '@/lib/dates'

describe('todayBogota', () => {
  afterEach(() => {
    vi.useRealTimers()
    setActiveTimezone(BOGOTA_TZ)
  })

  it('coincide con la fecha en Bogotá durante la ventana 7pm–medianoche (bug histórico del backend)', () => {
    // 2026-08-15 23:30 en Bogotá (UTC-5) = 2026-08-16 04:30 UTC. Un cálculo
    // naive en UTC reportaría "16" cuando en Bogotá todavía es "15".
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-16T04:30:00Z'))
    expect(todayBogota()).toBe('2026-08-15')
  })

  it('coincide con la fecha en Bogotá a plena tarde (sin corrimiento)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T18:00:00Z')) // 1pm Bogotá
    expect(todayBogota()).toBe('2026-08-15')
  })

  it('usa la zona activa configurada por el bootstrap de sesión (`/me.company.timezone`)', () => {
    vi.useFakeTimers()
    // 2026-08-15 23:30 UTC-5 (Bogotá) == 2026-08-16 01:30 UTC-3 (Argentina).
    vi.setSystemTime(new Date('2026-08-16T04:30:00Z'))
    setActiveTimezone('America/Argentina/Buenos_Aires')
    expect(todayBogota()).toBe('2026-08-16')
  })
})

describe('setActiveTimezone / getActiveTimezone', () => {
  afterEach(() => setActiveTimezone(BOGOTA_TZ))

  it('por defecto es America/Bogota (fallback hasta que /me cargue)', () => {
    expect(getActiveTimezone()).toBe(BOGOTA_TZ)
  })

  it('se actualiza tras el bootstrap de sesión', () => {
    setActiveTimezone('America/Mexico_City')
    expect(getActiveTimezone()).toBe('America/Mexico_City')
  })
})

describe('formatDate (fechas sin hora)', () => {
  it('reformatea "yyyy-MM-dd" a "dd/MM/yyyy" sin pasar por Date', () => {
    expect(formatDate('2026-08-15')).toBe('15/08/2026')
  })

  it('no se corre un día aunque la zona local del proceso no sea Bogotá', () => {
    // Si esto pasara por `new Date('2026-01-01')` + formateo, correría a 2025-12-31
    // en zonas horarias detrás de UTC. formatDate nunca debe hacer esa conversión.
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
  })

  it('lanza si no recibe el formato esperado', () => {
    expect(() => formatDate('15/08/2026')).toThrow()
  })
})

describe('formatDateTime (timestamps con hora)', () => {
  beforeEach(() => setActiveTimezone(BOGOTA_TZ))
  afterEach(() => setActiveTimezone(BOGOTA_TZ))

  it('convierte un timestamp UTC a la hora de Bogotá', () => {
    expect(formatDateTime('2026-08-15T23:30:00Z')).toBe('15/08/2026 6:30 PM')
  })

  it('respeta el cruce de día al convertir a Bogotá', () => {
    expect(formatDateTime('2026-08-16T03:30:00Z')).toBe('15/08/2026 10:30 PM')
  })

  it('usa la zona activa, no siempre Bogotá', () => {
    setActiveTimezone('America/Mexico_City')
    // México (UTC-6) va una hora detrás de Bogotá (UTC-5).
    expect(formatDateTime('2026-08-15T23:30:00Z')).toBe('15/08/2026 5:30 PM')
  })
})
