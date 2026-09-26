import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, FileCheck2, FileSignature, Heading2, Heading3, Italic, List, ListOrdered, PenLine, PlusCircle, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/shared/Callout'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MergeFieldNode } from '@/lib/documents/nodes/MergeFieldNode'
import { ItemsTableBlockNode } from '@/lib/documents/nodes/ItemsTableBlockNode'
import { SignatureBlockNode } from '@/lib/documents/nodes/SignatureBlockNode'
import { NoticeConsentClauseNode } from '@/lib/documents/nodes/NoticeConsentClauseNode'
import { hasNoticeConsentClause } from '@/lib/documents/noticeConsentClause'
import { MERGE_FIELDS, type DocumentType } from '@/lib/documents/mergeFields'
import { cn } from '@/lib/utils'
import type { JSONContent } from '@tiptap/core'

function ToolbarButton({ active, onClick, children, label }: { active?: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={label} className={cn(active && 'bg-accent text-accent-foreground')} onClick={onClick}>
      {children}
    </Button>
  )
}

/**
 * Editable — MISMOS Node extensions que `TemplateRenderer` (nunca dos
 * implementaciones que puedan divergir). Los campos dinámicos y bloques se
 * insertan como nodos atómicos; el resto (negrita, títulos, listas) es el
 * `StarterKit` de siempre. Controlado: `value`/`onChange`, el caller decide
 * cuándo guardar.
 */
export function TemplateEditor({ documentType, value, onChange }: { documentType: DocumentType; value: JSONContent; onChange: (json: JSONContent) => void }) {
  // Referencia del último `value` que el editor YA refleja — arranca en el
  // valor inicial (que `useEditor({content: value})` ya usó para crearlo),
  // y se actualiza tanto acá como en `onUpdate`. Así el efecto de abajo solo
  // llama `setContent` cuando `value` cambió por fuera (ej. "Empezar desde
  // la plantilla actual"), nunca como eco de lo que el editor acaba de
  // reportar ni en el primer render.
  //
  // Antes comparaba con `JSON.stringify(editor.getJSON()) !== JSON.stringify(value)`
  // — sensible al orden de las claves, así que con una plantilla que trae
  // nodos atómicos (campo/tabla/firma) casi siempre daba "distinto" incluso
  // cuando el contenido era el mismo, disparando un `setContent` de más
  // justo al montar. Ese `setContent` reconstruye todo el documento
  // mientras los NodeViews de React de esos nodos (`ReactNodeViewRenderer`)
  // todavía están montando por primera vez — la reconstrucción los deja con
  // una referencia al editor ya nula, y la librería explota leyendo
  // `.commands` sobre eso. Reportado en vivo: crear una plantilla con
  // "Empezar desde..." y abrirla tiraba "Cannot read properties of null
  // (reading 'commands')", 100% reproducible.
  const lastSyncedValue = useRef(value)

  const editor = useEditor({
    content: value,
    extensions: [StarterKit, MergeFieldNode, ItemsTableBlockNode, SignatureBlockNode, NoticeConsentClauseNode],
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      lastSyncedValue.current = json
      onChange(json)
    },
  })

  useEffect(() => {
    if (!editor) return
    if (value === lastSyncedValue.current) return
    lastSyncedValue.current = value
    editor.commands.setContent(value)
  }, [value, editor])

  if (!editor) return null

  const fields = MERGE_FIELDS[documentType]

  return (
    <div className="flex flex-col gap-3">
      {documentType === 'contract' && <NoticeConsentHelp editor={editor} included={hasNoticeConsentClause(value)} />}
      <div className="flex flex-col gap-2 rounded-card border border-border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          <ToolbarButton label="Negrita" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Cursiva" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Título grande" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Título pequeño" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="size-4" />
          </ToolbarButton>

          <div className="mx-1 h-6 w-px bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <PlusCircle className="size-4" /> Insertar campo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              {fields.map((field) => (
                <DropdownMenuItem
                  key={field.key}
                  onSelect={() =>
                    editor
                      .chain()
                      .focus()
                      // El campo es un nodo atómico — insertarlo SOLO deja el
                      // cursor como una NodeSelection sobre él (sin caret
                      // visible), así que insertar otro campo justo después
                      // reemplaza el anterior en vez de agregarlo al lado. El
                      // espacio de texto que sigue fuerza un cursor normal
                      // colapsado DESPUÉS del campo, para poder seguir
                      // escribiendo o insertar otro campo a continuación.
                      .insertContent([{ type: 'mergeField', attrs: { key: field.key } }, { type: 'text', text: ' ' }])
                      .run()
                  }
                >
                  {field.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {documentType === 'contract' && (
            <Button type="button" variant="outline" size="sm" onClick={() => editor.chain().focus().insertContent({ type: 'itemsTableBlock' }).run()}>
              <Table2 className="size-4" /> Tabla de prendas
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <PenLine className="size-4" /> Firma
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => editor.chain().focus().insertContent({ type: 'signatureBlock', attrs: { variant: 'cliente' } }).run()}>
                Firma del cliente
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.chain().focus().insertContent({ type: 'signatureBlock', attrs: { variant: 'empresa' } }).run()}>
                Firma de la empresa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <EditorContent
          editor={editor}
          className="prose prose-sm min-h-64 max-w-none px-4 py-3 [&_section[data-notice-consent]]:border-l-2 [&_section[data-notice-consent]]:border-brand-100 [&_section[data-notice-consent]]:pl-3"
        />
      </div>
    </div>
  )
}

/**
 * Recuadro de la cláusula de autorización de avisos (solo Contrato). Las
 * compraventas no saben que la necesitan, así que se les explica y se les da
 * lista para insertar. La detección es por el nodo (`hasNoticeConsentClause`),
 * no por el texto: si la reescriben, sigue contando. `included` sale de
 * `value`, que el editor mantiene al día en cada cambio.
 */
function NoticeConsentHelp({ editor, included }: { editor: Editor; included: boolean }) {
  const lawyerNote = <p className="text-xs text-muted-foreground">Es un ejemplo; revísalo con tu abogado.</p>

  if (included) {
    return (
      <Callout tone="success" icon={FileCheck2} title="Esta plantilla ya incluye la cláusula de autorización de avisos.">
        <p>En el editor la marca una línea a la izquierda. Puedes cambiarle el texto: sigue contando como la cláusula.</p>
        {lawyerNote}
      </Callout>
    )
  }

  function insert() {
    // Antes de la primera firma y no en el cursor: ver `clauseInsertIndex`.
    if (editor.commands.insertNoticeConsentClause()) toast.success('Cláusula agregada antes de las firmas.')
  }

  return (
    <Callout
      tone="info"
      icon={FileSignature}
      title="Agrega la cláusula de autorización de avisos"
      action={
        <Button type="button" size="sm" className="rounded-pill" onClick={insert}>
          Insertar cláusula de avisos
        </Button>
      }
    >
      <p>
        La plataforma le manda a tu cliente comprobantes y recordatorios de pago por correo, y más adelante por WhatsApp. Si el contrato que
        firma dice que autoriza esos avisos, esa autorización queda por escrito y firmada, junto con tu política de tratamiento de datos (Ley
        1581 de 2012).
      </p>
      <p>Se agrega antes de las firmas y la puedes editar como cualquier texto.</p>
      {lawyerNote}
    </Callout>
  )
}
