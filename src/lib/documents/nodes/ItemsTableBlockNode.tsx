import { Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { PrintContractItemsTable } from '@/components/shared/PrintBlocks'

export interface PrintableContractItem {
  id: string
  description: string
  categoryName: string
  weight_grams: string | null
  serial_imei: string | null
  item_appraisal: string | null
}

/**
 * Bloque atómico (solo Contrato) — la tabla de prendas. En edición es un
 * placeholder visual: no tiene sentido editar sus columnas por dentro, es
 * la misma tabla estructurada que ya existía como JSX fijo en
 * `ContractPrintView`. En impresión renderiza la tabla real desde
 * `contract.items`, pre-resuelta por el caller (nombre de categoría ya
 * buscado, no un id).
 */
function ItemsTableBlockView({ editor, extension }: ReactNodeViewProps) {
  if (editor.isEditable) {
    return (
      <NodeViewWrapper className="my-2 rounded-input border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        [Tabla de prendas del contrato]
      </NodeViewWrapper>
    )
  }

  const items = (extension.options.items ?? []) as PrintableContractItem[]
  return (
    <NodeViewWrapper className="my-5">
      <PrintContractItemsTable items={items} />
    </NodeViewWrapper>
  )
}

export const ItemsTableBlockNode = Node.create<{ items: PrintableContractItem[] }>({
  name: 'itemsTableBlock',
  group: 'block',
  atom: true,

  addOptions() {
    return { items: [] }
  },

  parseHTML() {
    return [{ tag: 'div[data-items-table-block]' }]
  },

  renderHTML() {
    return ['div', { 'data-items-table-block': '' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ItemsTableBlockView)
  },
})
