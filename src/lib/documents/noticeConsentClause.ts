import type { JSONContent } from '@tiptap/core'
import { resolveMergeField, type MergeFieldContext } from '@/lib/documents/mergeFields'

/**
 * Cláusula de AUTORIZACIÓN DE AVISOS al cliente — el único lugar donde vive su
 * texto. La usan el formato de arranque del contrato (`startingTemplates.ts`),
 * el botón «Insertar cláusula de avisos» del editor, y el contrato que se
 * imprime con el formato de siempre (`ContractPrintView`, sin plantilla propia).
 *
 * Por qué existe: la plataforma le manda al cliente comprobantes y, pronto,
 * recordatorios de cuota. La base legal que usa el backend para escribirle es
 * «contrato» (`email_basis = 'contract'`, NOTIFICACIONES.md §17); que el
 * contrato FIRMADO diga que el cliente autoriza esos avisos es lo que deja esa
 * base por escrito. Las compraventas no lo saben y no lo van a redactar solas.
 *
 * ⚠ BORRADOR PARA REVISIÓN LEGAL (25/09/2026). Redactado en lenguaje llano por
 * el equipo de producto, NO por un abogado. La pantalla lo dice («Es un
 * ejemplo; revísalo con tu abogado»). Si un abogado lo corrige: cambiar el
 * texto acá y subir `NOTICE_CONSENT_CLAUSE_VERSION`, que queda guardado en
 * cada plantilla y permitirá saber cuáles tienen la versión vieja.
 *
 * Se detecta por su NODO (`noticeConsentClause`, ver
 * `nodes/NoticeConsentClauseNode.ts`), nunca por el texto: la empresa puede
 * reescribirla entera con su abogado y sigue contando como la cláusula.
 */

export const NOTICE_CONSENT_NODE = 'noticeConsentClause'
export const NOTICE_CONSENT_CLAUSE_VERSION = 1

export const NOTICE_CONSENT_CLAUSE_TITLE = 'Autorización para recibir avisos'

type Piece = string | { field: string }

/**
 * El texto, pieza por pieza: una cadena es texto literal, `{field}` es un
 * campo dinámico del catálogo de Contrato (`MERGE_FIELDS.contract`). De acá
 * salen las dos formas — el JSON de TipTap y el texto plano del formato de
 * siempre —, así que no pueden decir cosas distintas.
 */
const PARAGRAPHS: Piece[][] = [
  [
    'El cliente, ',
    { field: 'cliente.nombre' },
    ', autoriza a ',
    { field: 'empresa.razon_social' },
    ' a enviarle comprobantes de sus operaciones, recordatorios de pago y avisos sobre el estado de este contrato, al correo electrónico (',
    { field: 'cliente.correo' },
    ') y al número de celular (',
    { field: 'cliente.telefono' },
    ') que registró. Hoy los avisos llegan por correo electrónico; más adelante podrán llegar también por mensaje al celular, incluido WhatsApp.',
  ],
  [
    'Estos avisos son solo informativos: no reemplazan ni modifican lo pactado en este contrato, ni las formas de notificación previstas en él.',
  ],
  ['Los recordatorios de pago se envían dentro de los horarios y con la frecuencia que permite la Ley 2300 de 2023.'],
  [
    'El cliente puede dejar de recibir estos avisos en cualquier momento, con el enlace que trae cada correo o pidiéndolo en el establecimiento.',
  ],
  [
    { field: 'empresa.razon_social' },
    ' trata los datos personales del cliente según su política de tratamiento de datos personales, conforme a la Ley 1581 de 2012.',
  ],
]

function toInline(piece: Piece): JSONContent {
  return typeof piece === 'string' ? { type: 'text', text: piece } : { type: 'mergeField', attrs: { key: piece.field } }
}

/** El nodo listo para insertar. Copia nueva en cada llamada: TipTap no debe compartir objetos entre documentos. */
export function noticeConsentClause(): JSONContent {
  return {
    type: NOTICE_CONSENT_NODE,
    attrs: { version: NOTICE_CONSENT_CLAUSE_VERSION },
    content: [
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: NOTICE_CONSENT_CLAUSE_TITLE }] },
      ...PARAGRAPHS.map((pieces) => ({ type: 'paragraph', content: pieces.map(toInline) })),
    ],
  }
}

/**
 * ¿El documento tiene la cláusula? Busca el nodo en todo el árbol. Recibe
 * `unknown` a propósito: el `body` de una plantilla llega del backend como un
 * `dict` libre, y una forma rara no puede tumbar la pantalla de Notificaciones.
 */
export function hasNoticeConsentClause(doc: unknown): boolean {
  if (!doc || typeof doc !== 'object') return false
  const node = doc as { type?: unknown; content?: unknown }
  if (node.type === NOTICE_CONSENT_NODE) return true
  return Array.isArray(node.content) && node.content.some(hasNoticeConsentClause)
}

/**
 * Dónde insertarla, dado el tipo de cada bloque de primer nivel: justo antes
 * de la primera firma, o al final si todavía no hay firmas. No en el cursor:
 * lo último que tocó el usuario puede ser el título o la mitad de un párrafo,
 * y una autorización que queda DEBAJO de las firmas es una autorización que
 * nadie firmó.
 */
export function clauseInsertIndex(topLevelTypes: string[]): number {
  const firstSignature = topLevelTypes.indexOf('signatureBlock')
  return firstSignature === -1 ? topLevelTypes.length : firstSignature
}

/**
 * Estado para Configuración → Notificaciones, a partir de la plantilla ACTIVA
 * de contrato (`useActiveDocumentTemplate('contract')`). `null` = no hay
 * plantilla propia y se imprime el formato de siempre, que trae la cláusula
 * (`ContractPrintView`).
 */
export type NoticeConsentStatus = 'factory' | 'included' | 'missing'

export function noticeConsentStatus(active: { body: unknown } | null): NoticeConsentStatus {
  if (active === null) return 'factory'
  return hasNoticeConsentClause(active.body) ? 'included' : 'missing'
}

export interface ClauseBlock {
  kind: 'heading' | 'paragraph'
  text: string
}

/**
 * La cláusula como texto plano con los campos ya resueltos — para el contrato
 * que se imprime con el formato de siempre, que es JSX y no carga TipTap.
 */
export function noticeConsentClauseBlocks(context: MergeFieldContext): ClauseBlock[] {
  return [
    { kind: 'heading', text: NOTICE_CONSENT_CLAUSE_TITLE },
    ...PARAGRAPHS.map((pieces) => ({
      kind: 'paragraph' as const,
      text: pieces.map((p) => (typeof p === 'string' ? p : resolveMergeField(p.field, context))).join(''),
    })),
  ]
}
