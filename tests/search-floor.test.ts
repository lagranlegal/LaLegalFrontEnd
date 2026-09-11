import { describe, expect, it } from 'vitest'
import { MIN_SEARCH_CHARS, hasEnoughToSearch } from '@/lib/search'

describe('el piso del buscador', () => {
  it('son tres caracteres, y está alineado con el backend', () => {
    // Espejo de `MIN_SEARCH_CHARS` en `app/common/search.py`. Si uno de los
    // dos se mueve sin el otro, la pantalla dice "escribe 3" y el servidor
    // filtra con otro criterio — o al revés, calla una búsqueda que sí
    // habría respondido.
    expect(MIN_SEARCH_CHARS).toBe(3)
  })

  it('no consulta con menos de tres', () => {
    expect(hasEnoughToSearch('')).toBe(false)
    expect(hasEnoughToSearch('m')).toBe(false)
    expect(hasEnoughToSearch('ma')).toBe(false)
  })

  it('consulta desde la tercera — que es lo que se pidió', () => {
    expect(hasEnoughToSearch('mat')).toBe(true)
    expect(hasEnoughToSearch('mateo')).toBe(true)
  })

  it('los espacios no cuentan como letras', () => {
    // "  m " son cuatro caracteres y una sola letra. Sin el `trim`, el picker
    // dispararía una consulta que devuelve las primeras ocho filas de
    // cientos y las pinta como si fueran el resultado.
    expect(hasEnoughToSearch('   ')).toBe(false)
    expect(hasEnoughToSearch('  m ')).toBe(false)
    expect(hasEnoughToSearch(' mat ')).toBe(true)
  })

  it('las tildes y la eñe cuentan como una letra cada una', () => {
    // `length` sobre un string JS cuenta unidades UTF-16: "ñ" es una, pero
    // una "n" con tilde combinante serían dos. Los nombres colombianos traen
    // ambas cosas según de dónde se copien.
    expect(hasEnoughToSearch('muñ')).toBe(true)
    expect(hasEnoughToSearch('jo')).toBe(false)
  })
})
