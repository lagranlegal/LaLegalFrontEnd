import { describe, expect, it } from 'vitest'
import { buildCategoryTree, type Category } from '@/features/catalogs/tree'

function category(overrides: Partial<Category> & { id: string }): Category {
  return {
    parent_id: null,
    level: 1,
    name: 'Categoría',
    code_letter: 'A',
    applies_to: 'both',
    default_term_months: null,
    arrears_window_months: null,
    max_ltv_pct: null,
    active: true,
    ...overrides,
  }
}

describe('buildCategoryTree', () => {
  it('arma 3 niveles anidados desde una lista plana', () => {
    const flat: Category[] = [
      category({ id: 'c2', parent_id: 'c1', level: 2, name: 'Anillos' }),
      category({ id: 'c1', parent_id: null, level: 1, name: 'Joyería' }),
      category({ id: 'c3', parent_id: 'c2', level: 3, name: 'Anillos de oro' }),
    ]

    const tree = buildCategoryTree(flat)

    expect(tree).toHaveLength(1)
    expect(tree[0]?.name).toBe('Joyería')
    expect(tree[0]?.children).toHaveLength(1)
    expect(tree[0]?.children[0]?.name).toBe('Anillos')
    expect(tree[0]?.children[0]?.children).toHaveLength(1)
    expect(tree[0]?.children[0]?.children[0]?.name).toBe('Anillos de oro')
  })

  it('soporta varias raíces y varios hijos por nodo', () => {
    const flat: Category[] = [
      category({ id: 'root-a', name: 'Joyería' }),
      category({ id: 'root-b', name: 'Electrónica' }),
      category({ id: 'a1', parent_id: 'root-a', level: 2, name: 'Anillos' }),
      category({ id: 'a2', parent_id: 'root-a', level: 2, name: 'Cadenas' }),
    ]

    const tree = buildCategoryTree(flat)

    expect(tree.map((n) => n.name)).toEqual(['Joyería', 'Electrónica'])
    expect(tree[0]?.children.map((n) => n.name)).toEqual(['Anillos', 'Cadenas'])
    expect(tree[1]?.children).toEqual([])
  })

  it('trata una categoría con parent_id huérfano como raíz en vez de perderla', () => {
    const flat: Category[] = [category({ id: 'orphan', parent_id: 'no-existe', level: 2, name: 'Huérfana' })]

    const tree = buildCategoryTree(flat)

    expect(tree).toHaveLength(1)
    expect(tree[0]?.name).toBe('Huérfana')
  })

  it('lista vacía da árbol vacío', () => {
    expect(buildCategoryTree([])).toEqual([])
  })
})
