import { Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { PrintSignature } from '@/components/shared/PrintBlocks'

export interface SignatureBlockOptions {
  companySignatureUrl: string | null
  companyLegalName: string | null
}

/**
 * Bloque atómico, variante `cliente`/`empresa`. En edición, placeholder. En
 * impresión: `cliente` siempre es la línea en blanco (fase 1, sin firma en
 * pantalla — CONTEXTO.md); `empresa` reusa la lógica que ya vivía en
 * `ContractPrintView` — imagen si hay firma cargada en /configuracion, si
 * no, línea en blanco igual (el documento nunca queda peor que antes de que
 * existiera esa función). Los dos usan `PrintSignature`, así que la firma se
 * ve igual con plantilla propia y con el formato de siempre; dos bloques
 * seguidos van lado a lado (`.node-signatureBlock`, globals.css).
 */
function SignatureBlockView({ node, editor, extension }: ReactNodeViewProps) {
  const variant = node.attrs.variant as 'cliente' | 'empresa'

  if (editor.isEditable) {
    return (
      <NodeViewWrapper className="my-2 inline-block rounded-input border border-dashed border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        [Firma {variant === 'cliente' ? 'del cliente' : 'de la empresa'}]
      </NodeViewWrapper>
    )
  }

  const { companySignatureUrl, companyLegalName } = extension.options as SignatureBlockOptions
  // `not-prose` (en `PrintSignature`): `prose` le pone márgenes de 2em a toda
  // `<img>`, y eso despegaba la firma de su línea.
  return (
    <NodeViewWrapper as="div" className="w-full">
      {variant === 'empresa' ? (
        <PrintSignature label="Firma de la empresa" detail={companyLegalName} imagePath={companySignatureUrl} />
      ) : (
        <PrintSignature label="Firma del cliente" />
      )}
    </NodeViewWrapper>
  )
}

export const SignatureBlockNode = Node.create<SignatureBlockOptions>({
  name: 'signatureBlock',
  group: 'block',
  atom: true,

  addOptions() {
    return { companySignatureUrl: null, companyLegalName: null }
  },

  addAttributes() {
    return {
      variant: { default: 'cliente' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-signature-block]', getAttrs: (el) => ({ variant: (el as HTMLElement).getAttribute('data-signature-block') }) }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { 'data-signature-block': HTMLAttributes.variant }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureBlockView)
  },
})
