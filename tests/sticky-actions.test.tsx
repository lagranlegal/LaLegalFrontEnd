import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AppDialog } from '@/components/shared/AppDialog'
import { StickyActionBar } from '@/components/shared/StickyActionBar'

/**
 * Rediseño P3 (F9-31, F9-41): la acción de un formulario largo no se pierde
 * bajo el pliegue. En los diálogos el título y el pie quedan fijos y solo el
 * cuerpo hace scroll; en las páginas, una barra pegada al fondo.
 */
const read = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf8')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AppDialog: pie fijo, cuerpo con scroll', () => {
  it('el pie (Guardar) queda fuera del cuerpo que se desplaza', () => {
    render(
      <AppDialog open onOpenChange={() => {}} title="Nuevo cliente" footer={<button form="f">Guardar</button>}>
        <form id="f">
          <input aria-label="Nombre" />
        </form>
      </AppDialog>,
    )
    const body = document.querySelector('[data-slot="dialog-body"]')!
    expect(body).toHaveClass('overflow-y-auto')
    expect(body.contains(screen.getByLabelText('Nombre'))).toBe(true)
    // El botón no está dentro de lo que se desplaza: siempre a la vista.
    expect(body.contains(screen.getByRole('button', { name: 'Guardar' }))).toBe(false)
    // El contenedor no hace scroll: lo hace solo el cuerpo.
    expect(screen.getByRole('dialog')).toHaveClass('overflow-hidden')
  })

  it('cuando el cuerpo no cabe, el pie lleva su divisor', () => {
    let notify: () => void = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: () => void) {
          notify = cb
        }
        observe() {}
        disconnect() {}
      },
    )
    const sh = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(1200)
    const ch = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600)
    render(
      <AppDialog open onOpenChange={() => {}} title="Largo" footer={<button>Guardar</button>}>
        <p>Mucho contenido</p>
      </AppDialog>,
    )
    act(() => notify())
    const footer = screen.getByRole('button', { name: 'Guardar' }).parentElement!
    expect(footer).toHaveAttribute('data-overflows', 'true')
    expect(footer).toHaveClass('border-t')
    sh.mockRestore()
    ch.mockRestore()
  })

  it('un diálogo corto no lleva raya en el pie', () => {
    render(
      <AppDialog open onOpenChange={() => {}} title="Corto" footer={<button>Listo</button>}>
        <p>Poco</p>
      </AppDialog>,
    )
    expect(screen.getByRole('button', { name: 'Listo' }).parentElement).not.toHaveAttribute('data-overflows')
  })
})

describe('StickyActionBar', () => {
  it('se pega al fondo, flota con la sombra de lo que flota y su botón sigue siendo el submit del formulario', () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={onSubmit}>
        <StickyActionBar summary={<p>Costo total estimado $ 10.000</p>}>
          <button type="submit">Registrar ingreso</button>
        </StickyActionBar>
      </form>,
    )
    const bar = document.querySelector('[data-slot="sticky-action-bar"]')!
    expect(bar).toHaveClass('sticky', 'shadow-modal')
    expect(bar.textContent).toContain('Costo total estimado')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ingreso' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it.each([
    'src/features/contracts/pages/ContractImportPage.tsx',
    'src/features/inventory/pages/EntryFormPage.tsx',
    'src/features/inventory/pages/TransformationFormPage.tsx',
  ])('%s lleva su acción en la barra fija', (path) => {
    expect(read(path)).toContain('<StickyActionBar')
  })
})

describe('formularios en diálogo: una columna a 360 px (F9-41)', () => {
  it.each([
    'src/features/catalogs/components/CategoryFormDialog.tsx',
    'src/features/catalogs/components/SupplierFormDialog.tsx',
    'src/features/platform/components/CompanyFormDialog.tsx',
  ])('%s no deja campos en dos columnas en el celular', (path) => {
    // Una grilla de campos con columnas fijas, sin un punto de quiebre que
    // la abra solo desde 480 px.
    expect(read(path)).not.toMatch(/className="grid grid-cols-[2-9] /)
  })
})
