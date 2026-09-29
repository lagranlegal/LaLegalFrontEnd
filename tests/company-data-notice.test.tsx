import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { joinSpanish, missingCompanyFields } from '@/lib/documents/companyData'

let company: Record<string, unknown> | null = null
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { company } }) }))
const { CompanyDataNotice } = await import('@/components/shared/CompanyDataNotice')

afterEach(cleanup)

describe('aviso de datos de empresa faltantes al imprimir (F8-10)', () => {
  it('nombra lo que falta y manda a Configuración', () => {
    company = { name: 'ZZ QA', tax_id: null, address: '  ', contact_phone: '3001234567' }
    render(<CompanyDataNotice />)
    expect(screen.getByRole('status').textContent).toMatch(/faltan el NIT y la dirección.*Completa los datos de la empresa en Configuración/)
  })

  it('con todo completo no dice nada', () => {
    company = { name: 'ZZ QA', tax_id: '900123456-7', address: 'Calle 1', contact_phone: '300' }
    render(<CompanyDataNotice />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('lista en español', () => {
    expect(joinSpanish(['el NIT', 'la dirección', 'el teléfono'])).toBe('el NIT, la dirección y el teléfono')
    expect(missingCompanyFields({ tax_id: '1', address: null, contact_phone: null })).toEqual(['la dirección', 'el teléfono'])
  })
})
