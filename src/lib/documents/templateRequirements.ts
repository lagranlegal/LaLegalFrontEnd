import type { JSONContent } from '@tiptap/core'
import type { DocumentType } from '@/lib/documents/mergeFields'

/**
 * Qué necesita el cuerpo de una plantilla para poder ser la ACTIVA.
 *
 * Es el espejo de `app/modules/company/template_body.py` del backend
 * (93f95e0, auditoría de QA F8-01/03/11), que es la autoridad: responde
 * `TEMPLATE_IS_EMPTY` y `TEMPLATE_MISSING_REQUIRED_FIELDS` al activar y al
 * guardar la que ya está activa. Se repite acá por dos razones: el editor
 * avisa ANTES de mandar, con palabras, en vez de esperar el rechazo; y el
 * backend desplegado antes de ese commit acepta todo con 200 — ahí esta es
 * la única defensa contra un contrato impreso sin cliente, sin prendas y sin
 * firma. Si el backend cambia la regla, se cambia acá también: las claves de
 * `missingContractRequirements` son las de `details.missing`.
 */

export type ContractRequirement = 'cliente.nombre' | 'itemsTableBlock' | 'signatureBlock:cliente'

/** En el orden en que el backend los lista en `details.missing`. */
const CONTRACT_REQUIREMENTS: readonly ContractRequirement[] = ['cliente.nombre', 'itemsTableBlock', 'signatureBlock:cliente']

/** Con las palabras de lo que la persona ve en el editor. */
export const CONTRACT_REQUIREMENT_LABELS: Record<ContractRequirement, string> = {
  'cliente.nombre': 'el nombre del cliente',
  itemsTableBlock: 'la tabla de prendas',
  'signatureBlock:cliente': 'la firma del cliente',
}

/** Nodos que imprimen algo sin texto propio (nombres de `lib/documents/nodes`). */
const PRINTING_NODES = new Set(['mergeField', 'itemsTableBlock', 'signatureBlock', 'noticeConsentClause'])

/** El documento vacío del editor: lo que se manda cuando no hay otra cosa, nunca `{}`. */
export function emptyEditorDoc(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/**
 * ¿Es un documento que el editor pudo haber producido? Tiptap siempre
 * entrega `{type: 'doc', …}`. Un `{}` —lo que quedaba guardado en
 * plantillas viejas— el backend nuevo lo rechaza con `TEMPLATE_BODY_INVALID`.
 */
export function isEditorDoc(body: unknown): body is JSONContent {
  return typeof body === 'object' && body !== null && (body as JSONContent).type === 'doc'
}

export function editorDocOrEmpty(body: unknown): JSONContent {
  return isEditorDoc(body) ? body : emptyEditorDoc()
}

function walk(node: JSONContent, visit: (n: JSONContent) => void): void {
  visit(node)
  for (const child of node.content ?? []) {
    if (typeof child === 'object' && child !== null) walk(child, visit)
  }
}

function mergeFieldKey(node: JSONContent): string {
  const key = node.attrs?.key
  return typeof key === 'string' ? key.trim() : ''
}

/** ¿Imprimiría algo? Un párrafo vacío o solo espacios cuenta como vacío. */
export function hasPrintableContent(body: unknown): boolean {
  if (!isEditorDoc(body)) return false
  let found = false
  walk(body, (node) => {
    if (found) return
    if (node.type === 'text' && (node.text ?? '').trim()) found = true
    else if (node.type === 'mergeField') found = mergeFieldKey(node) !== ''
    else if (node.type && PRINTING_NODES.has(node.type)) found = true
  })
  return found
}

export function missingContractRequirements(body: unknown): ContractRequirement[] {
  if (!isEditorDoc(body)) return [...CONTRACT_REQUIREMENTS]
  const present = new Set<string>()
  walk(body, (node) => {
    if (node.type === 'mergeField') present.add(mergeFieldKey(node))
    else if (node.type === 'itemsTableBlock') present.add('itemsTableBlock')
    // `cliente` es el default del nodo (`SignatureBlockNode`): sin `attrs`,
    // es la firma del cliente — igual que en el backend.
    else if (node.type === 'signatureBlock') present.add(`signatureBlock:${(node.attrs?.variant as string | undefined) ?? 'cliente'}`)
  })
  return CONTRACT_REQUIREMENTS.filter((r) => !present.has(r))
}

/** «a, b y c» */
export function joinSpanish(parts: readonly string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}

/** Las etiquetas de las claves que se conocen; las que no, se omiten. */
export function describeMissing(keys: readonly unknown[]): string {
  const labels = keys
    .filter((k): k is ContractRequirement => typeof k === 'string' && k in CONTRACT_REQUIREMENT_LABELS)
    .map((k) => CONTRACT_REQUIREMENT_LABELS[k])
  return joinSpanish(labels)
}

/**
 * Por qué esta plantilla no puede quedar ACTIVA, o `null` si puede. El paz
 * y salvo solo necesita no estar vacío: es una constancia de la empresa y
 * su plantilla de partida no lleva firma del cliente.
 */
export function templateProblem(documentType: DocumentType, body: unknown): string | null {
  if (!hasPrintableContent(body)) {
    return 'La plantilla está vacía: activa, imprimiría los documentos sin su contenido.'
  }
  if (documentType !== 'contract') return null
  const missing = missingContractRequirements(body)
  if (missing.length === 0) return null
  return `Le falta ${describeMissing(missing)}. Un contrato de empeño tiene que decir a quién se le prestó, sobre qué prendas y llevar la firma del cliente — se insertan con «Insertar campo», «Tabla de prendas» y «Firma» → «Firma del cliente».`
}
