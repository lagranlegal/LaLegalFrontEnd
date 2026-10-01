import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import fixtures from './fixtures/backend-g2.json'
import type { NotificationSettings } from '@/features/settings/notifications/api'
import { formatHourOfDay } from '@/lib/dates'

/**
 * Issue #6: Notificaciones tenía dos modelos de guardado (las casillas al
 * tocarlas, los parámetros con un botón). Ahora es uno: todo en borrador y un
 * solo «Guardar cambios», que manda UN PATCH con lo que cambió y confirma lo
 * que se enciende antes de mandarlo. Ajustes: la respuesta real de un PATCH
 * (`avisos_mas_estricto`, `backend-g2.json`).
 */
const real = fixtures.avisos_mas_estricto.body as unknown as NotificationSettings

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const state = vi.hoisted(() => ({ mutate: vi.fn(), confirm: vi.fn() }))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle' }) }))
vi.mock('@/components/shared/BackLink', () => ({ BackLink: () => null }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: (...args: unknown[]) => state.confirm(...args) }))
vi.mock('@/features/settings/notifications/components/ContractClauseNotice', () => ({ ContractClauseNotice: () => null }))
vi.mock('@/features/settings/notifications/api', () => ({
  useNotificationSettings: () => ({ data: real, isPending: false, isError: false, refetch: vi.fn() }),
  useUpdateNotificationSettings: () => ({ mutateAsync: (...args: unknown[]) => state.mutate(...args), isPending: false }),
  useNotificationDeliveries: () => ({ data: { pages: [] }, isPending: false, isError: false, hasNextPage: false, fetchNextPage: vi.fn() }),
}))

const { NotificationSettingsPage } = await import('@/features/settings/notifications/pages/NotificationSettingsPage')

const primerAviso = real.events.find((e) => e.audience === 'customer')!
const nombreAviso = primerAviso.description.replace(/^[A-Z]\d+\s*·\s*/, '')

beforeEach(() => {
  state.mutate = vi.fn().mockResolvedValue(real)
  state.confirm = vi.fn().mockResolvedValue({ confirmed: true })
})
afterEach(cleanup)

describe('Notificaciones — un solo modelo de guardado (issue #6)', () => {
  it('marcar un aviso no guarda nada: queda en borrador y la barra lo dice', () => {
    render(<NotificationSettingsPage />)
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    expect(screen.getByText('Todo está guardado.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: nombreAviso }))
    expect(state.mutate).not.toHaveBeenCalled()
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
  })

  it('volver a dejarlo como estaba no es un cambio', () => {
    render(<NotificationSettingsPage />)
    const casilla = screen.getByRole('checkbox', { name: nombreAviso })
    fireEvent.click(casilla)
    fireEvent.click(casilla)
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('un aviso y un parámetro viajan en un solo PATCH, solo con lo que cambió', async () => {
    render(<NotificationSettingsPage />)
    fireEvent.click(screen.getByRole('checkbox', { name: nombreAviso }))
    fireEvent.change(screen.getByLabelText('Máximo por día'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(state.mutate).toHaveBeenCalledTimes(1))
    expect(state.mutate).toHaveBeenCalledWith({
      events: { [primerAviso.code]: !primerAviso.enabled },
      customer_contact_limits: { max_per_day: 2 },
    })
  })

  it('encender el interruptor general se confirma al guardar; si se cancela, no se manda nada', async () => {
    state.confirm = vi.fn().mockResolvedValue({ confirmed: false })
    render(<NotificationSettingsPage />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Enviar avisos por correo' }))
    expect(state.confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(state.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Encender los avisos por correo' })))
    expect(state.mutate).not.toHaveBeenCalled()
  })

  it('«Descartar» devuelve todo a lo guardado', () => {
    render(<NotificationSettingsPage />)
    fireEvent.click(screen.getByRole('checkbox', { name: nombreAviso }))
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.getByRole('checkbox', { name: nombreAviso })).toHaveAttribute('aria-checked', String(primerAviso.enabled))
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('las franjas horarias se leen en es-CO, no «07:00 AM»', () => {
    expect(formatHourOfDay('07:00')).toBe('7:00 a. m.')
    expect(formatHourOfDay('12:30')).toBe('12:30 p. m.')
    expect(formatHourOfDay('19:00')).toBe('7:00 p. m.')
    expect(formatHourOfDay('00:00')).toBe('12:00 a. m.')
    render(<NotificationSettingsPage />)
    expect(screen.getByRole('combobox', { name: 'Lunes a viernes, desde' })).toHaveTextContent(formatHourOfDay(real.customer_contact_limits.weekday_hours[0]))
  })
})
