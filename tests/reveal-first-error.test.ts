import { describe, expect, it, beforeEach } from 'vitest'
import { collectErrorNames, revealFirstError } from '@/lib/forms/revealFirstError'

/**
 * El botón "Crear contrato" está al final de un formulario largo y los
 * mensajes de error se pintan junto a su campo, arriba. Con todo lleno menos
 * el cliente, el único mensaje quedaba ~800px por encima del botón, sin foco
 * ni scroll: desde la silla del usuario, el botón no hacía nada.
 */
describe('collectErrorNames', () => {
  it('saca los nombres de campos anidados y de arrays, como los usa el DOM', () => {
    const errores = {
      principal: { type: 'custom', message: 'El monto debe ser mayor a cero' },
      items: [{ category_id: { type: 'custom', message: 'Selecciona una categoría' } }, {}],
    }
    expect(collectErrorNames(errores)).toEqual(['principal', 'items.0.category_id'])
  })

  it('un array que falla como conjunto también se puede señalar', () => {
    // `items: z.array(...).min(1)` — el error no cuelga de ninguna prenda.
    expect(collectErrorNames({ items: { type: 'too_small', message: 'Agrega al menos una prenda' } })).toEqual(['items'])
  })

  it('sin errores no devuelve nada', () => {
    expect(collectErrorNames({})).toEqual([])
  })
})

describe('revealFirstError', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="customer-picker" />
      <input id="principal" />
      <input name="items.0.description" />
    `
    // jsdom no implementa scrollIntoView.
    Element.prototype.scrollIntoView = () => {}
  })

  it('encuentra los campos por id y por name', () => {
    expect(revealFirstError(['items.0.description'])).toBe(true)
    expect(document.activeElement?.getAttribute('name')).toBe('items.0.description')
  })

  it('elige el que está MÁS ARRIBA, no el primero de la lista', () => {
    // Es lo que permite mezclar errores de react-hook-form con los de estado
    // propio (el cliente) sin depender del orden en que llegan.
    const posiciones: Record<string, number> = { 'customer-picker': 10, principal: 200 }
    for (const [id, top] of Object.entries(posiciones)) {
      document.getElementById(id)!.getBoundingClientRect = () => ({ top }) as DOMRect
    }
    revealFirstError(['principal', 'customer-picker'])
    expect(document.activeElement?.id).toBe('customer-picker')
  })

  it('no explota si el campo no está en pantalla', () => {
    expect(revealFirstError(['no_existe'])).toBe(false)
  })
})
