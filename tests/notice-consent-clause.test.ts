import { describe, expect, it } from 'vitest'
import type { JSONContent } from '@tiptap/core'
import {
  NOTICE_CONSENT_NODE,
  clauseInsertIndex,
  hasNoticeConsentClause,
  noticeConsentClause,
  noticeConsentClauseBlocks,
  noticeConsentStatus,
} from '@/lib/documents/noticeConsentClause'
import { MERGE_FIELDS } from '@/lib/documents/mergeFields'
import { STARTING_TEMPLATES } from '@/lib/documents/startingTemplates'

/**
 * La cláusula de autorización de avisos: el cliente autoriza, en el contrato
 * que firma, recibir comprobantes y recordatorios por correo (y más adelante
 * WhatsApp). La detección es por el NODO propio, nunca por el texto: una
 * empresa puede reescribir la cláusula con su abogado y sigue siendo la suya.
 */

function paragraph(text: string): JSONContent {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

function collectFieldKeys(node: JSONContent, out: string[] = []): string[] {
  if (node.type === 'mergeField') out.push(String(node.attrs?.key))
  node.content?.forEach((child) => collectFieldKeys(child, out))
  return out
}

function allText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.content ?? []).map(allText).join(' ')
}

describe('cláusula de avisos — detección', () => {
  it('la encuentra por su nodo, aunque esté anidada o reescrita', () => {
    const reescrita: JSONContent = { type: NOTICE_CONSENT_NODE, attrs: { version: 1 }, content: [paragraph('Texto que escribió el abogado.')] }
    expect(hasNoticeConsentClause({ type: 'doc', content: [paragraph('Contrato'), reescrita] })).toBe(true)
    expect(hasNoticeConsentClause({ type: 'doc', content: [{ type: 'blockquote', content: [reescrita] }] })).toBe(true)
  })

  it('el mismo texto pegado como párrafos sueltos NO cuenta: no se detecta por texto', () => {
    const soloTexto: JSONContent = { type: 'doc', content: noticeConsentClause().content ?? [] }
    expect(hasNoticeConsentClause(soloTexto)).toBe(false)
  })

  it('un documento vacío, nulo o con forma rara no la tiene (y no explota)', () => {
    expect(hasNoticeConsentClause({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(false)
    expect(hasNoticeConsentClause(null)).toBe(false)
    expect(hasNoticeConsentClause({})).toBe(false)
    expect(hasNoticeConsentClause({ content: 'no es una lista' })).toBe(false)
  })
})

describe('cláusula de avisos — contenido', () => {
  const clause = noticeConsentClause()

  it('es un nodo propio con versión, y cada llamada devuelve una copia nueva', () => {
    expect(clause.type).toBe(NOTICE_CONSENT_NODE)
    expect(clause.attrs?.version).toBe(1)
    expect(noticeConsentClause()).not.toBe(clause)
    expect(noticeConsentClause()).toEqual(clause)
  })

  it('usa solo campos dinámicos que existen en el catálogo de Contrato (ninguno se imprimiría como «campo desconocido»)', () => {
    const contractKeys = new Set(MERGE_FIELDS.contract.map((f) => f.key))
    const keys = collectFieldKeys(clause)
    expect(keys).toEqual(expect.arrayContaining(['cliente.nombre', 'empresa.razon_social', 'cliente.correo', 'cliente.telefono']))
    for (const key of keys) expect(contractKeys.has(key)).toBe(true)
  })

  it('no lleva corchetes para rellenar a mano', () => {
    expect(allText(clause)).not.toMatch(/\[|\]/)
  })

  it('dice las cinco ideas: qué autoriza, que es informativo, Ley 2300, cómo darse de baja y Ley 1581', () => {
    const text = allText(clause)
    expect(text).toMatch(/comprobantes/)
    expect(text).toMatch(/recordatorios de pago/)
    expect(text).toMatch(/WhatsApp/)
    expect(text).toMatch(/no reemplazan ni modifican/)
    expect(text).toMatch(/Ley 2300 de 2023/)
    expect(text).toMatch(/enlace/)
    expect(text).toMatch(/en el establecimiento/)
    expect(text).toMatch(/Ley 1581 de 2012/)
  })

  it('en texto plano (el formato de siempre) resuelve los campos con los datos del contrato', () => {
    const blocks = noticeConsentClauseBlocks({
      'cliente.nombre': 'Ana Gómez',
      'cliente.correo': 'ana@example.com',
      'cliente.telefono': '3001234567',
      'empresa.razon_social': 'Compraventa El Sol S.A.S.',
    })
    expect(blocks[0].kind).toBe('heading')
    const joined = blocks.map((b) => b.text).join(' ')
    expect(joined).toContain('Ana Gómez')
    expect(joined).toContain('ana@example.com')
    expect(joined).toContain('3001234567')
    expect(joined).toContain('Compraventa El Sol S.A.S.')
  })
})

describe('cláusula de avisos — dónde se inserta', () => {
  it('antes de la primera firma, para que quede dentro de lo que el cliente firma', () => {
    expect(clauseInsertIndex(['heading', 'paragraph', 'signatureBlock', 'signatureBlock'])).toBe(2)
  })

  it('al final si la plantilla todavía no tiene firmas', () => {
    expect(clauseInsertIndex(['heading', 'paragraph'])).toBe(2)
    expect(clauseInsertIndex([])).toBe(0)
  })
})

describe('formato de arranque', () => {
  it('el contrato ya trae la cláusula, antes de las firmas', () => {
    const contract = STARTING_TEMPLATES.contract
    expect(hasNoticeConsentClause(contract)).toBe(true)
    const types = (contract.content ?? []).map((n) => n.type)
    expect(types.indexOf(NOTICE_CONSENT_NODE)).toBeLessThan(types.indexOf('signatureBlock'))
  })

  it('el paz y salvo no la necesita', () => {
    expect(hasNoticeConsentClause(STARTING_TEMPLATES.settlement)).toBe(false)
  })
})

describe('estado para Configuración → Notificaciones', () => {
  it('sin plantilla activa se imprime el formato de fábrica, que la trae', () => {
    expect(noticeConsentStatus(null)).toBe('factory')
  })

  it('con plantilla activa, depende de si la plantilla tiene el nodo', () => {
    expect(noticeConsentStatus({ body: STARTING_TEMPLATES.contract })).toBe('included')
    expect(noticeConsentStatus({ body: { type: 'doc', content: [paragraph('Contrato viejo')] } })).toBe('missing')
  })
})
