import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { MERGE_FIELD_LABELS, resolveMergeField, type MergeFieldContext } from '@/lib/documents/mergeFields'

/**
 * Campo dinámico ({{cliente.nombre}}, etc.) — inline, atómico, no editable
 * por dentro (se inserta y se borra entero, nunca se le escribe texto
 * adentro). En modo edición (`editor.isEditable`) muestra un chip con la
 * etiqueta legible; en modo impresión/preview resuelve el valor real desde
 * `context` (opción de la extensión, no prop de React — así lo mismo sirve
 * tanto para `TemplateEditor` como para `TemplateRenderer`, sin dos
 * implementaciones que puedan divergir).
 */
function MergeFieldView({ node, editor, extension }: ReactNodeViewProps) {
  const key = node.attrs.key as string
  if (editor.isEditable) {
    const label = MERGE_FIELD_LABELS[key] ?? key
    return (
      <NodeViewWrapper as="span" className="mx-0.5 inline-flex items-center rounded-pill bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
        {label}
      </NodeViewWrapper>
    )
  }
  // `extension` es la instancia YA CONFIGURADA de este editor
  // (`MergeFieldNode.configure({context})`), no el export estático — así
  // el mismo componente sirve para el editor (sin contexto real) y para
  // `TemplateRenderer` (con el contexto de datos reales o de ejemplo).
  const context = (extension.options.context ?? {}) as MergeFieldContext
  return <NodeViewWrapper as="span">{resolveMergeField(key, context)}</NodeViewWrapper>
}

export const MergeFieldNode = Node.create<{ context: MergeFieldContext }>({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { context: {} }
  },

  addAttributes() {
    return {
      key: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-merge-field]', getAttrs: (el) => ({ key: (el as HTMLElement).getAttribute('data-merge-field') }) }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-merge-field': HTMLAttributes.key })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MergeFieldView)
  },
})
