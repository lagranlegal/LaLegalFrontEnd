import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { preventImplicitSubmit } from '@/lib/forms/preventImplicitSubmit'

/**
 * QA F6-03, generalizado: una operación de dinero se registra SOLO con su
 * botón. Enter en cualquier `<input>` de estos formularios desembolsaba un
 * contrato, cerraba la caja o registraba un gasto sin confirmar.
 *
 * jsdom no hace el envío implícito, así que se mide su causa: `fireEvent`
 * devuelve `false` cuando el `keydown` de Enter quedó cancelado, y un Enter
 * cancelado es un Enter que el navegador no convierte en submit.
 */

afterEach(cleanup)

function Formulario({ onSubmit }: { onSubmit: () => void }) {
  return (
    <form
      onKeyDown={preventImplicitSubmit}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <input aria-label="monto" />
      <textarea aria-label="notas" />
      <button type="submit">Registrar</button>
    </form>
  )
}

describe('preventImplicitSubmit', () => {
  it('cancela Enter en un input (el envío implícito)', () => {
    render(<Formulario onSubmit={vi.fn()} />)
    expect(fireEvent.keyDown(screen.getByLabelText('monto'), { key: 'Enter' })).toBe(false)
  })

  it('no toca otras teclas ni el salto de línea de un textarea', () => {
    render(<Formulario onSubmit={vi.fn()} />)
    expect(fireEvent.keyDown(screen.getByLabelText('monto'), { key: 'a' })).toBe(true)
    expect(fireEvent.keyDown(screen.getByLabelText('notas'), { key: 'Enter' })).toBe(true)
  })

  it('Enter sobre el botón explícito sigue siendo su clic', () => {
    render(<Formulario onSubmit={vi.fn()} />)
    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Registrar' }), { key: 'Enter' })).toBe(true)
  })
})

/**
 * El eslabón débil es el formulario de dinero que se escriba mañana sin
 * acordarse; esta lista es el inventario de hoy (todo `<form>` que registra
 * dinero, stock o un contrato), y el test falla si alguno pierde la guarda.
 */
const FORMULARIOS_DE_DINERO = [
  'src/features/sales/pages/SaleFormPage.tsx',
  'src/features/contracts/pages/ContractFormPage.tsx',
  'src/features/contracts/pages/ContractImportPage.tsx',
  'src/features/contracts/components/ContractEditDialog.tsx',
  'src/features/cashbox/components/OpenSessionDialog.tsx',
  'src/features/cashbox/components/CloseSessionDialog.tsx',
  'src/features/cashbox/components/ExpenseFormDialog.tsx',
  'src/features/inventory/pages/EntryFormPage.tsx',
  'src/features/inventory/components/ExitFormDialog.tsx',
  'src/components/shared/ReturnFormDialog.tsx',
]

describe('formularios de dinero', () => {
  it.each(FORMULARIOS_DE_DINERO)('%s cuelga la guarda de su <form>', (ruta) => {
    const fuente = readFileSync(resolve(process.cwd(), ruta), 'utf8')
    const etiquetas = fuente.match(/<form\s[^>]*>/g) ?? []
    expect(etiquetas.length).toBeGreaterThan(0)
    for (const etiqueta of etiquetas) expect(etiqueta).toContain('onKeyDown={preventImplicitSubmit}')
  })
})
