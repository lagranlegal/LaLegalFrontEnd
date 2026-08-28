import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, PenLine, PlusCircle, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MergeFieldNode } from '@/lib/documents/nodes/MergeFieldNode'
import { ItemsTableBlockNode } from '@/lib/documents/nodes/ItemsTableBlockNode'
import { SignatureBlockNode } from '@/lib/documents/nodes/SignatureBlockNode'
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
  const editor = useEditor({
    content: value,
    extensions: [StarterKit, MergeFieldNode, ItemsTableBlockNode, SignatureBlockNode],
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  })

  // Si el `value` cambia por fuera (ej. "Empezar desde la plantilla
  // actual"), sincronizar el editor — sin esto, `useEditor` solo lee
  // `content` en el primer render.
  useEffect(() => {
    if (!editor) return
    const current = JSON.stringify(editor.getJSON())
    const next = JSON.stringify(value)
    if (current !== next) editor.commands.setContent(value)
  }, [value, editor])

  if (!editor) return null

  const fields = MERGE_FIELDS[documentType]

  return (
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
              <DropdownMenuItem key={field.key} onSelect={() => editor.chain().focus().insertContent({ type: 'mergeField', attrs: { key: field.key } }).run()}>
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

      <EditorContent editor={editor} className="prose prose-sm min-h-64 max-w-none px-4 py-3" />
    </div>
  )
}
