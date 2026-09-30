import type { Editor, JSONContent } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'

/**
 * Inserta un bloque atómico (tabla de prendas, firma) y deja el cursor en un
 * párrafo DESPUÉS de él. Insertado a secas, el bloque queda seleccionado como
 * nodo, y el siguiente bloque que se inserte lo REEMPLAZA: en la verificación
 * del 29/09, «Tabla de prendas» seguido de «Firma del cliente» dejó la firma y
 * borró la tabla. Si ya hay un párrafo vacío a continuación se reusa; si no, se
 * crea uno, que es donde el usuario seguiría escribiendo de todos modos.
 */
export function insertBlock(editor: Editor, block: JSONContent): boolean {
  return editor
    .chain()
    .focus()
    .insertContent(block)
    .command(({ tr, dispatch }) => {
      const sel = tr.selection
      // Si la selección ya es un cursor de texto, el siguiente bloque no pisa
      // nada. Solo la selección de nodo es el problema.
      if (!(sel instanceof NodeSelection)) return true
      const after = sel.to
      const next = tr.doc.resolve(after).nodeAfter
      if (!dispatch) return true
      if (next && next.type.name === 'paragraph' && next.content.size === 0) {
        tr.setSelection(TextSelection.create(tr.doc, after + 1))
      } else {
        tr.insert(after, tr.doc.type.schema.nodes.paragraph.create())
        tr.setSelection(TextSelection.create(tr.doc, after + 1))
      }
      return true
    })
    .scrollIntoView()
    .run()
}
