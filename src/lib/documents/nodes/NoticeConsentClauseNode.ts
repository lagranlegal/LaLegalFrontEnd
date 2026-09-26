import { Node, mergeAttributes } from '@tiptap/core'
import {
  NOTICE_CONSENT_CLAUSE_VERSION,
  NOTICE_CONSENT_NODE,
  clauseInsertIndex,
  hasNoticeConsentClause,
  noticeConsentClause,
} from '@/lib/documents/noticeConsentClause'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noticeConsentClause: {
      /** Inserta la cláusula de avisos antes de la primera firma (o al final). No hace nada si ya está. */
      insertNoticeConsentClause: () => ReturnType
    }
  }
}

/**
 * Envoltorio de la cláusula de autorización de avisos
 * (`lib/documents/noticeConsentClause.ts`). A diferencia de la firma o la
 * tabla de prendas, NO es atómico: adentro hay párrafos normales que la
 * empresa puede editar con su abogado. El nodo solo existe para MARCAR que
 * ese bloque es la cláusula — así la detección no depende del texto — y lleva
 * la versión del texto con que nació.
 *
 * Sin NodeView de React: se renderiza como un `<section>` común, igual en el
 * editor y en la impresión. El editor le agrega un borde a la izquierda con
 * una clase propia (`TemplateEditor`), para que se vea dónde empieza y
 * termina; al imprimir no lleva nada.
 */
export const NoticeConsentClauseNode = Node.create({
  name: NOTICE_CONSENT_NODE,
  group: 'block',
  content: 'block+',
  // Al pegar dentro, el contenido pegado queda adentro del bloque en vez de
  // partirlo.
  defining: true,

  addAttributes() {
    return {
      version: {
        default: NOTICE_CONSENT_CLAUSE_VERSION,
        parseHTML: (el) => Number((el as HTMLElement).getAttribute('data-notice-consent')) || NOTICE_CONSENT_CLAUSE_VERSION,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-notice-consent]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const { version, ...rest } = HTMLAttributes as { version?: number }
    return ['section', mergeAttributes(rest, { 'data-notice-consent': String(version ?? NOTICE_CONSENT_CLAUSE_VERSION) }), 0]
  },

  addCommands() {
    return {
      insertNoticeConsentClause:
        () =>
        ({ state, commands }) => {
          if (hasNoticeConsentClause(state.doc.toJSON())) return false
          const types: string[] = []
          const offsets: number[] = []
          state.doc.forEach((node, offset) => {
            types.push(node.type.name)
            offsets.push(offset)
          })
          const index = clauseInsertIndex(types)
          const pos = offsets[index] ?? state.doc.content.size
          return commands.insertContentAt(pos, noticeConsentClause())
        },
    }
  },
})
