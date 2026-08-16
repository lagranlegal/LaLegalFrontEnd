import { Can } from '@/components/shared/Can'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CategoryTreeNode } from '@/features/catalogs/tree'

function CategoryRow({
  node,
  depth,
  onEdit,
  onAddChild,
}: {
  node: CategoryTreeNode
  depth: number
  onEdit: (node: CategoryTreeNode) => void
  onAddChild: (parentId: string) => void
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 rounded-input py-1.5 pr-2 hover:bg-accent/50" style={{ paddingLeft: `${depth * 24 + 8}px` }}>
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onEdit(node)}>
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-brand-50 text-xs font-semibold text-brand-700">{node.code_letter}</span>
          <span className={cn('truncate text-sm text-foreground', !node.active && 'text-muted-foreground line-through')}>{node.name}</span>
          {!node.active && <span className="shrink-0 text-xs text-muted-foreground">(inactiva)</span>}
        </button>
        {node.level < 3 && (
          <Can permission="catalogs.manage">
            <Button variant="ghost" size="xs" onClick={() => onAddChild(node.id)}>
              + Subcategoría
            </Button>
          </Can>
        )}
      </div>
      {node.children.map((child) => (
        <CategoryRow key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onAddChild={onAddChild} />
      ))}
    </>
  )
}

/** Árbol de categorías (3 niveles) — ver `features/catalogs/tree.ts` para cómo se arma desde la lista plana. */
export function CategoryTreeView({
  tree,
  onEdit,
  onAddChild,
}: {
  tree: CategoryTreeNode[]
  onEdit: (node: CategoryTreeNode) => void
  onAddChild: (parentId: string) => void
}) {
  if (tree.length === 0) {
    return <EmptyState title="Aún no tienes categorías" description="Crea la primera para poder registrar prendas y artículos." />
  }
  return (
    <div className="flex flex-col gap-0.5">
      {tree.map((node) => (
        <CategoryRow key={node.id} node={node} depth={0} onEdit={onEdit} onAddChild={onAddChild} />
      ))}
    </div>
  )
}
