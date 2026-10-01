import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { parseApiError } from '@/lib/api/errors'
import { DetailLoadError } from '@/components/shared/DetailLoadError'

/**
 * Issue #17, lo que cerró P3-b. El 404 es el cuerpo que emite el backend
 * (`app/core/errors.py::NotFoundError`, mensaje de
 * `contracts/service.py`: «El contrato no existe en esta empresa.»).
 */
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))

afterEach(cleanup)

const props = {
  notFoundTitle: 'Este contrato no existe o no es de tu empresa',
  loadFailedText: 'No se pudo cargar el contrato.',
  backTo: '/contratos',
  backLabel: 'Volver a contratos',
}

describe('detalle de un registro que no existe (F9-58)', () => {
  it('dice que no existe y ofrece volver, no «Reintentar»', () => {
    const error = parseApiError(404, { code: 'NOT_FOUND', message: 'El contrato no existe en esta empresa.' })
    render(<DetailLoadError {...props} error={error} onRetry={vi.fn()} />)
    expect(screen.getByText('Este contrato no existe o no es de tu empresa')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a contratos' })).toHaveAttribute('href', '/contratos')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull()
  })

  it('una falla de red sí ofrece reintentar', () => {
    const onRetry = vi.fn()
    render(<DetailLoadError {...props} error={new TypeError('Failed to fetch')} onRetry={onRetry} />)
    expect(screen.getByText('No se pudo cargar el contrato.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('el contrato y la ficha del cliente usan la pieza', () => {
    for (const f of ['src/features/contracts/pages/ContractDetailPage.tsx', 'src/features/customers/pages/CustomerDetailPage.tsx']) {
      expect(readFileSync(f, 'utf8')).toContain('<DetailLoadError')
    }
  })
})

describe('textos y nombres accesibles', () => {
  it('los filtros de Auditoría se nombran por lo que filtran (F9-52)', () => {
    const src = readFileSync('src/features/audit/pages/AuditPage.tsx', 'utf8')
    for (const name of ['Filtrar por módulo', 'Filtrar por tipo de entidad', 'Filtrar por usuario']) expect(src).toContain(`aria-label="${name}"`)
  })

  it('el comprobante rotula el medio de pago (F9-35)', () => {
    expect(readFileSync('src/components/shared/SaleReceiptDialog.tsx', 'utf8')).toMatch(/Medio de pago:\{' '\}/)
  })

  it('en Capital ningún botón de plata va en el oro del primario (F9-45)', () => {
    const src = readFileSync('src/features/capital/pages/CapitalPage.tsx', 'utf8')
    expect(src).toMatch(/<Button variant="outline" onClick=\{\(\) => setDialog\('withdrawal'\)\}>/)
    expect(src).toMatch(/<Button variant="outline" onClick=\{\(\) => setDialog\('contribution'\)\}>/)
  })

  it('el login enfoca el correo y «¿Olvidaste…?» limpia el error anterior (F9-62)', () => {
    const src = readFileSync('src/features/auth/pages/LoginPage.tsx', 'utf8')
    expect(src).toContain('autoFocus')
    expect(src).toMatch(/onForgotPassword\(\) \{[\s\S]*?login\.reset\(\)/)
  })
})
