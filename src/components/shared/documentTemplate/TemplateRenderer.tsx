import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { MergeFieldNode } from '@/lib/documents/nodes/MergeFieldNode'
import { ItemsTableBlockNode, type PrintableContractItem } from '@/lib/documents/nodes/ItemsTableBlockNode'
import { SignatureBlockNode } from '@/lib/documents/nodes/SignatureBlockNode'
import { LAYOUT_CONTENT_CLASSES, type DocumentLayout } from '@/lib/documents/layouts'
import type { MergeFieldContext } from '@/lib/documents/mergeFields'
import type { JSONContent } from '@tiptap/core'

/**
 * Solo lectura (`editable: false`) — MISMOS Node extensions que
 * `TemplateEditor`, para que la vista previa del editor y lo que
 * realmente imprime nunca diverjan. Usado tanto por la pestaña "Vista
 * previa" de `DocumentTemplatesPage` (con datos de ejemplo) como por
 * `ContractPrintView`/`SettlementPrintView` en producción (con datos
 * reales).
 */
export function TemplateRenderer({
  body,
  mergeFieldContext,
  items,
  companySignatureUrl = null,
  companyLegalName = null,
  layout = 'classic',
}: {
  body: JSONContent
  mergeFieldContext: MergeFieldContext
  items?: PrintableContractItem[]
  companySignatureUrl?: string | null
  companyLegalName?: string | null
  layout?: DocumentLayout
}) {
  const editor = useEditor(
    {
      editable: false,
      immediatelyRender: true,
      content: body,
      extensions: [
        StarterKit,
        MergeFieldNode.configure({ context: mergeFieldContext }),
        ItemsTableBlockNode.configure({ items: items ?? [] }),
        SignatureBlockNode.configure({ companySignatureUrl, companyLegalName }),
      ],
    },
    [body, mergeFieldContext, items, companySignatureUrl, companyLegalName],
  )

  return (
    <div className={LAYOUT_CONTENT_CLASSES[layout]}>
      <EditorContent editor={editor} />
    </div>
  )
}
