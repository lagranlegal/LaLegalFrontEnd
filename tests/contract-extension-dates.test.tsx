import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-g2.json'
import type { Contract } from '@/features/contracts/api'

/**
 * F8-09 (legal): el contrato que nace de un recargo conserva la fecha del
 * contrato RAÍZ (00053) y se firma el día del recargo. Con el formato de
 * fábrica el papel lo dice; con una plantilla propia la leyenda desaparecía
 * y el documento quedaba antedatado sin explicación, y la empresa ni
 * siquiera podía insertar la fecha del recargo porque no estaba en el
 * catálogo.
 *
 * Los contratos son respuestas reales del backend local: #2 es el sucesor de
 * un contrato del 05/09 ampliado el 29/09; en la cadena, #3 es el sucesor
 * del sucesor y conserva la fecha de la raíz (09/09).
 */

const recargo = fixtures.contrato_recargo.body as unknown as Contract
const cadena = fixtures.contrato_recargo_cadena.body as unknown as Contract
const nuevo = fixtures.contrato_nuevo.body as unknown as Contract

const activeTemplate = vi.hoisted(() => ({ current: { data: null as unknown, isPending: false, isError: false } }))

vi.mock('@/lib/auth/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }))
vi.mock('@/features/settings/documentTemplates/api', () => ({
  useActiveDocumentTemplate: () => activeTemplate.current,
}))
vi.mock('@/lib/auth/me', () => ({
  useMe: () => ({ data: { company: { name: 'ZZ QA', legal_name: 'ZZ QA S.A.S.', signature_url: null } } }),
}))
vi.mock('@/lib/storage/photos', () => ({ useSignedPhotoUrl: () => ({ data: undefined }) }))

const { MERGE_FIELDS, buildContractContext, buildSampleContractContext } = await import('@/lib/documents/mergeFields')
const { ContractPrintView } = await import('@/features/contracts/components/ContractPrintView')

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

afterEach(() => {
  cleanup()
  activeTemplate.current = { data: null, isPending: false, isError: false }
})

describe('catálogo de campos — fechas del recargo', () => {
  it('el contrato ofrece fecha y monto del recargo y la fecha original', () => {
    const keys = MERGE_FIELDS.contract.map((f) => f.key)
    expect(keys).toEqual(expect.arrayContaining(['contrato.fecha_recargo', 'contrato.monto_recargo', 'contrato.fecha_original']))
  })

  it('se resuelven con los datos del sucesor', () => {
    const ctx = buildContractContext(recargo, undefined, undefined)
    expect(ctx['contrato.fecha_recargo']).toBe('29/09/2026')
    expect(ctx['contrato.monto_recargo']).toMatch(/400\.000/)
    expect(ctx['contrato.fecha_original']).toBe('05/09/2026')
  })

  it('en una cadena, la fecha original es la de la raíz', () => {
    expect(buildContractContext(cadena, undefined, undefined)['contrato.fecha_original']).toBe('09/09/2026')
  })

  it('un contrato que no es un recargo no deja el campo vacío en silencio', () => {
    const ctx = buildContractContext(nuevo, undefined, undefined)
    expect(ctx['contrato.fecha_recargo']).toBe('no aplica')
    expect(ctx['contrato.monto_recargo']).toBe('no aplica')
    expect(ctx['contrato.fecha_original']).toBe('29/09/2026')
  })

  it('la vista previa del editor también los resuelve', () => {
    const ctx = buildSampleContractContext(undefined)
    for (const f of MERGE_FIELDS.contract) expect(ctx[f.key], f.key).toBeDefined()
  })
})

describe('contrato impreso con plantilla propia — la leyenda de las dos fechas', () => {
  const plantillaSinFechas = {
    id: 't1',
    document_type: 'contract',
    name: 'Propia',
    layout: 'classic',
    is_active: true,
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contrato de la casa.' }] }] },
  }

  it('sale aunque la plantilla no la incluya', () => {
    activeTemplate.current = { data: plantillaSinFechas, isPending: false, isError: false }
    const { baseElement } = wrap(<ContractPrintView contract={recargo} customer={undefined} categories={[]} />)
    const doc = baseElement.querySelector('[data-print-document]')
    expect(doc?.textContent).toMatch(/amplía el préstamo/)
    expect(doc?.textContent).toContain('05/09/2026')
    expect(doc?.textContent).toContain('29/09/2026')
    expect(doc?.textContent).toMatch(/400\.000/)
  })

  it('no sale en un contrato que no es un recargo', () => {
    activeTemplate.current = { data: plantillaSinFechas, isPending: false, isError: false }
    const { baseElement } = wrap(<ContractPrintView contract={nuevo} customer={undefined} categories={[]} />)
    expect(baseElement.textContent).not.toMatch(/amplía el préstamo/)
  })

  it('el formato de fábrica la sigue trayendo', () => {
    const { baseElement } = wrap(<ContractPrintView contract={recargo} customer={undefined} categories={[]} />)
    expect(baseElement.textContent).toMatch(/amplía el préstamo/)
  })
})

describe('F8-11: una plantilla activa que no imprime nada no reemplaza al formato de fábrica', () => {
  // Con el backend desplegado antes de 93f95e0 la activa se podía vaciar por
  // PATCH o quedar con basura: el contrato salía en 70 caracteres.
  it.each([
    ['{}', {}],
    ['párrafo vacío', { type: 'doc', content: [{ type: 'paragraph' }] }],
    ['basura', { content: [1, 2] }],
  ])('%s → se imprime el de fábrica', (_nombre, body) => {
    activeTemplate.current = { data: { id: 't', document_type: 'contract', name: 'Vacía', layout: 'classic', is_active: true, body }, isPending: false, isError: false }
    const { baseElement } = wrap(<ContractPrintView contract={nuevo} customer={undefined} categories={[]} />)
    expect(baseElement.textContent).toContain('Condiciones del préstamo')
    expect(baseElement.textContent).toContain('Firma del cliente')
  })
})
