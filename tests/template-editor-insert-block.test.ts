import { afterEach, describe, expect, it } from 'vitest'
import { Editor, type JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { ItemsTableBlockNode } from '@/lib/documents/nodes/ItemsTableBlockNode'
import { SignatureBlockNode } from '@/lib/documents/nodes/SignatureBlockNode'

/**
 * Editor de plantillas: insertar un bloque atómico (tabla de prendas, firma)
 * justo después de otro NO lo reemplaza. Antes el bloque recién insertado
 * quedaba seleccionado como nodo y el siguiente lo pisaba (verificación del
 * 29/09: «Tabla de prendas» + «Firma del cliente» dejó solo la firma).
 */

import { insertBlock } from '@/lib/documents/insertBlock'

let editor: Editor | null = null
afterEach(() => editor?.destroy())

function nuevo(content: JSONContent): Editor {
  editor = new Editor({ extensions: [StarterKit, ItemsTableBlockNode, SignatureBlockNode], content })
  // El cursor al final del texto, como cuando el usuario termina de escribir.
  editor.commands.focus('end')
  return editor
}

const types = (e: Editor) => (e.getJSON().content ?? []).map((n) => n.type)

describe('editor de plantillas — insertar bloques seguidos', () => {
  it('«Tabla de prendas» y enseguida «Firma del cliente» deja las dos', () => {
    const e = nuevo({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contrato.' }] }] })
    insertBlock(e, { type: 'itemsTableBlock' })
    expect(e.state.selection.constructor.name).toBe('TextSelection')
    insertBlock(e, { type: 'signatureBlock', attrs: { variant: 'cliente' } })
    expect(types(e)).toEqual(['paragraph', 'itemsTableBlock', 'signatureBlock', 'paragraph'])
  })

  it('reusa el párrafo vacío que ya sigue al bloque en vez de apilar párrafos', () => {
    const e = nuevo({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contrato.' }] }] })
    insertBlock(e, { type: 'itemsTableBlock' })
    insertBlock(e, { type: 'signatureBlock', attrs: { variant: 'cliente' } })
    insertBlock(e, { type: 'signatureBlock', attrs: { variant: 'empresa' } })
    expect(types(e)).toEqual(['paragraph', 'itemsTableBlock', 'signatureBlock', 'signatureBlock', 'paragraph'])
  })
})
