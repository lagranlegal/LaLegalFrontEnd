import { Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react'
import { useSignedPhotoUrl } from '@/lib/storage/photos'

export interface SignatureBlockOptions {
  companySignatureUrl: string | null
  companyLegalName: string | null
}

/**
 * Bloque atómico, variante `cliente`/`empresa`. En edición, placeholder. En
 * impresión: `cliente` siempre es la línea en blanco (fase 1, sin firma en
 * pantalla — CONTEXTO.md); `empresa` reusa la lógica que ya vivía en
 * `ContractPrintView::CompanySignature` — imagen si hay firma cargada en
 * /configuracion, si no, línea en blanco igual (el documento nunca queda
 * peor que antes de que existiera esa función).
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
  return (
    <NodeViewWrapper as="div" className="inline-block w-full text-sm">
      {variant === 'empresa' ? <EmpresaSignature signaturePath={companySignatureUrl} legalName={companyLegalName} /> : <ClienteSignature />}
    </NodeViewWrapper>
  )
}

function ClienteSignature() {
  return (
    <div>
      <div className="h-16" />
      <div className="border-t border-black/40 pt-2 text-center">Firma del cliente</div>
    </div>
  )
}

function EmpresaSignature({ signaturePath, legalName }: { signaturePath: string | null; legalName: string | null }) {
  const { data: signatureUrl } = useSignedPhotoUrl(signaturePath)
  return (
    <div>
      <div className="flex h-16 items-end justify-center">
        {signatureUrl && <img src={signatureUrl} alt="" className="max-h-16 object-contain" />}
      </div>
      <div className="border-t border-black/40 pt-2 text-center">
        Firma de la empresa
        {legalName && <span className="block text-xs text-black/60">{legalName}</span>}
      </div>
    </div>
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
