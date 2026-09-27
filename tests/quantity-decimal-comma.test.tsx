import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { entryLineSchema } from '@/features/inventory/entryLineSchema'

/**
 * QTY-coma (QA 03 H-21): en Colombia el decimal se escribe con coma. En el
 * ingreso de inventario "1,5" g daba "La cantidad debe ser mayor a cero"
 * (`Number("1,5")` es NaN), un mensaje falso; en la transformación la
 * cantidad con coma valía $0 en la vista previa y viajaba cruda. El peso del
 * contrato ya lo resolvía con `normalizeDecimalInput`; acá se hace igual.
 */

afterEach(cleanup)

const linea = {
  name: 'Cadena oro 18k',
  cat1_id: 'c1',
  cat2_id: 'c2',
  cat3_id: 'c3',
  unit_cost: '250000.00',
  quantity: '1,5',
  unit: 'gram' as const,
}

describe('ingreso de inventario — cantidad con coma', () => {
  it('"1,5" es una cantidad válida y viaja como "1.5"', () => {
    const resultado = entryLineSchema.safeParse(linea)
    expect(resultado.success).toBe(true)
    expect(resultado.data?.quantity).toBe('1.5')
  })

  it('cero con coma sigue siendo cero', () => {
    expect(entryLineSchema.safeParse({ ...linea, quantity: '0,0' }).success).toBe(false)
  })
})

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useBlocker: () => ({ status: 'idle' }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [], isPending: false }) }))
vi.mock('@/features/inventory/api', () => ({ useCreateTransformation: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/components/shared/AccountPicker', () => ({ AccountPicker: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/ItemPicker', () => ({
  ItemPicker: ({ onSelect }: { onSelect: (item: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onSelect({ id: 'a1', name: 'Anillo roto', code: 'JOA0001-01K', cost: '100000.00', unit: 'gram', status: 'available', quantity: '5.000' })}
    >
      agregar
    </button>
  ),
}))

const { TransformationFormPage } = await import('@/features/inventory/pages/TransformationFormPage')

describe('transformación — cantidad con coma', () => {
  it('"1,5" g a $ 100.000/g cuestan $ 150.000 en la vista previa, no $ 0', () => {
    render(<TransformationFormPage />)
    fireEvent.click(screen.getByText('agregar'))

    fireEvent.change(screen.getByLabelText('Cantidad de Anillo roto'), { target: { value: '1,5' } })

    expect(screen.getAllByText(/150\.000/).length).toBeGreaterThan(0)
  })
})
