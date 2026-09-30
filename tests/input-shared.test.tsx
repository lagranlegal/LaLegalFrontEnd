import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * Issue #4 (F9-26, F9-29): un campo inválido se anunciaba «inválido» pero el
 * lector de pantalla no decía por qué: el mensaje no estaba enlazado con
 * `aria-describedby`. `Input`/`Textarea`/`FieldError` (components/ui/input)
 * lo resuelven una vez, y `MoneyInput` hace lo mismo con su `id`.
 */
const { Input, Textarea, FieldError } = await import('@/components/ui/input')
const { MoneyInput } = await import('@/components/shared/MoneyInput')

afterEach(cleanup)

describe('Input compartido', () => {
  it('con error: aria-invalid y el mensaje como descripción accesible', () => {
    render(
      <>
        <label htmlFor="nombre">Nombre</label>
        <Input id="nombre" invalid />
        <FieldError fieldId="nombre">Escribe el nombre</FieldError>
      </>,
    )
    const campo = screen.getByRole('textbox', { name: 'Nombre', description: 'Escribe el nombre' })
    expect(campo.getAttribute('aria-invalid')).toBe('true')
  })

  it('sin error no marca nada ni pinta mensaje', () => {
    const { container } = render(
      <>
        <Input id="nombre" aria-label="Nombre" />
        <FieldError fieldId="nombre">{undefined}</FieldError>
      </>,
    )
    const campo = screen.getByRole('textbox', { name: 'Nombre' })
    expect(campo.hasAttribute('aria-invalid')).toBe(false)
    expect(campo.hasAttribute('aria-describedby')).toBe(false)
    expect(container.querySelector('p')).toBeNull()
  })

  it('Textarea y MoneyInput siguen la misma regla', () => {
    render(
      <>
        <Textarea id="notas" aria-label="Notas" invalid />
        <FieldError fieldId="notas">Demasiado largo</FieldError>
        <MoneyInput id="monto" ariaLabel="Monto" value="0.00" onChange={() => {}} invalid />
        <FieldError fieldId="monto">El monto debe ser mayor a cero</FieldError>
      </>,
    )
    expect(screen.getByRole('textbox', { name: 'Notas', description: 'Demasiado largo' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Monto', description: 'El monto debe ser mayor a cero' })).toBeInTheDocument()
  })
})

// Los formularios más usados y los de dinero: ninguno vuelve a su copia local.
const MIGRADOS = [
  'src/features/contracts/pages/ContractFormPage.tsx',
  'src/features/contracts/components/ContractItemsFields.tsx',
  'src/features/sales/pages/SaleFormPage.tsx',
  'src/features/cashbox/components/ExpenseFormDialog.tsx',
  'src/features/customers/components/CustomerFormDialog.tsx',
  'src/features/inventory/pages/EntryFormPage.tsx',
]

describe('formularios migrados', () => {
  it.each(MIGRADOS)('%s no define su propio inputClass', (ruta) => {
    expect(readFileSync(ruta, 'utf8')).not.toMatch(/inputClass\s*=/)
  })
})

// Un formulario real: el error de la descripción del gasto se anuncia con su motivo.
const CUENTAS = [
  { id: '7654af51-6f51-4e3e-8857-d33dbd89b2ea', name: 'Caja principal', type: 'cash', reference: null, is_default: true, active: true, opening_balance: '0.00', balance: '0.00', created_at: '2026-09-29T02:19:55.635133Z' },
]
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: CUENTAS, isPending: false, error: null }) }))
vi.mock('@/features/cashbox/api', () => ({
  useCreateExpense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateExpenseCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useExpenseCategories: () => ({ data: [] }),
}))
vi.mock('@/components/shared/CashClosedNotice', () => ({ CashClosedNotice: () => null }))
vi.mock('@/components/shared/CashSessionRequiredDialog', () => ({ CashSessionRequiredDialog: () => null }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))
const { ExpenseFormDialog } = await import('@/features/cashbox/components/ExpenseFormDialog')

describe('Nuevo gasto enviado vacío', () => {
  it('la descripción y el monto se anuncian con su motivo', async () => {
    render(<ExpenseFormDialog open onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar gasto' }))
    expect(await screen.findByRole('textbox', { name: 'Descripción', description: 'La descripción es obligatoria' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Monto', description: 'El monto debe ser mayor a cero' })).toBeInTheDocument()
  })
})
