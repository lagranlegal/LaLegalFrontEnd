import type { Category } from '@/lib/catalogs/categories'

export type { Category }

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

/**
 * Árbol de categorías (3 niveles) armado en el cliente desde la lista plana
 * `id`/`parent_id` que trae `GET /catalogs/categories` (CLAUDE.md, paso 4).
 * Una categoría cuyo `parent_id` no aparece en la lista (dato inconsistente,
 * o el padre está en otra página que no pedimos) se trata como raíz en vez
 * de desaparecer silenciosamente.
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const byId = new Map<string, CategoryTreeNode>()
  for (const category of categories) {
    byId.set(category.id, { ...category, children: [] })
  }

  const roots: CategoryTreeNode[] = []
  for (const category of categories) {
    const node = byId.get(category.id)
    if (!node) continue
    const parent = category.parent_id ? byId.get(category.parent_id) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}
