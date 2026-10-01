import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

/**
 * Rediseño P1, F9-02: «Abrir menú» y «Cambiar tema» medían 28 × 28 px y «Abrir
 * caja» del banner 73 × 24 en un celular, la acción más importante del día con
 * el objetivo más chico de la pantalla. Todo a 44 px.
 */
const cashbox = vi.hoisted(() => ({ current: { data: null as unknown, isPending: false, error: null as unknown } }))
vi.mock('@/features/cashbox/api', () => ({ useCashboxCurrent: () => cashbox.current }))
vi.mock('@/features/cashbox/components/OpenSessionDialog', () => ({ OpenSessionDialog: () => null }))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => true }))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { user: { id: 'u-laura', full_name: 'Laura Martínez' } } }) }))
vi.mock('@/lib/dates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dates')>()),
  todayBogota: () => '2026-09-30',
}))

const { CashSessionBanner } = await import('@/components/shared/CashSessionBanner')
const { ThemeToggle } = await import('@/components/shared/ThemeToggle')

afterEach(() => {
  cleanup()
  cashbox.current = { data: null, isPending: false, error: null }
})

describe('objetivos táctiles de 44 px', () => {
  it('«Cambiar tema» es un botón de 44 × 44', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Cambiar tema' })).toHaveClass('size-11')
  })

  it('«Abrir menú», el avatar y «Cerrar menú» del topbar miden 44', () => {
    const src = readFileSync(resolve(__dirname, '../src/components/shared/AppShell.tsx'), 'utf8')
    expect(src).toMatch(/size="icon" className="lg:hidden".*aria-label="Abrir menú"/)
    expect(src).toMatch(/min-h-11 min-w-11/)
    expect(src).toMatch(/size="icon"\s+className="shrink-0[^"]*"\s+onClick=\{\(\) => setMobileDrawerOpen\(false\)\}/)
  })

  it('«Abrir caja» del banner: botón de verdad con área táctil de 44 dentro de una franja de 44', () => {
    render(<CashSessionBanner />)
    const boton = screen.getByRole('button', { name: 'Abrir caja' })
    expect(boton).toHaveClass('h-9', 'relative', 'after:absolute', 'after:-inset-y-1')
    expect(boton).toHaveClass('border-border-strong')
    expect(boton.parentElement).toHaveClass('min-h-11')
  })

  it('la franja de caja abierta va en tinta, sin el verde a media opacidad', () => {
    cashbox.current = { data: { session_date: '2026-09-30', opened_at: '2026-09-30T13:00:00Z' }, isPending: false, error: null }
    const { container } = render(<CashSessionBanner />)
    const franja = container.firstElementChild!
    expect(franja).toHaveClass('min-h-11', 'bg-success-soft', 'text-body')
    expect(container.innerHTML).not.toMatch(/text-success\/70/)
    expect(screen.getByText('Caja abierta').tagName).toBe('B')
  })

  it('P2-c: abierta dice quién y desde qué hora, en «a. m.»; sin «Efectivo esperado» mientras el backend no lo da', () => {
    cashbox.current = {
      data: { session_date: '2026-09-30', opened_at: '2026-09-30T13:02:00Z', opened_by: 'u-laura', expected_cash: null },
      isPending: false,
      error: null,
    }
    const { container } = render(<CashSessionBanner />)
    expect(container.textContent).toBe('Caja abierta por Laura M. desde 8:02 a. m.')
  })

  it('P2-c: abierta por otra persona no inventa el nombre', () => {
    cashbox.current = {
      data: { session_date: '2026-09-30', opened_at: '2026-09-30T13:02:00Z', opened_by: 'otro', expected_cash: null },
      isPending: false,
      error: null,
    }
    const { container } = render(<CashSessionBanner />)
    expect(container.textContent).toBe('Caja abierta desde 8:02 a. m.')
  })

  it('P2-c: si la sesión trae el efectivo esperado, va a la derecha', () => {
    cashbox.current = {
      data: { session_date: '2026-09-30', opened_at: '2026-09-30T13:02:00Z', opened_by: 'otro', expected_cash: '1240000.00' },
      isPending: false,
      error: null,
    }
    render(<CashSessionBanner />)
    expect(screen.getByText(/Efectivo esperado/).textContent?.replace(/\s+/g, ' ')).toBe('Efectivo esperado $ 1.240.000')
  })
})
