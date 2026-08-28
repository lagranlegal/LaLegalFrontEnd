import { Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { Money } from '@/components/shared/Money'

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
    <NodeViewWrapper>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/20 text-left">
            <th className="py-1.5">Prenda</th>
            <th className="py-1.5">Categoría</th>
            <th className="py-1.5">Peso</th>
            <th className="py-1.5">Serial/IMEI</th>
            <th className="py-1.5 text-right">Avalúo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-black/10">
              <td className="py-1.5">{item.description}</td>
              <td className="py-1.5">{item.categoryName}</td>
              <td className="py-1.5">{item.weight_grams ? `${item.weight_grams} g` : '—'}</td>
              <td className="py-1.5">{item.serial_imei ?? '—'}</td>
              <td className="py-1.5 text-right">{item.item_appraisal ? <Money value={item.item_appraisal} /> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
