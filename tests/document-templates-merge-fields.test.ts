import { describe, expect, it } from 'vitest'
import { MERGE_FIELDS, MERGE_FIELD_LABELS, resolveMergeField } from '@/lib/documents/mergeFields'

describe('plantillas de documentos — campos dinámicos', () => {
  it('resuelve una key presente en el contexto', () => {
    expect(resolveMergeField('cliente.nombre', { 'cliente.nombre': 'Juan Pérez' })).toBe('Juan Pérez')
  })

  it('nunca devuelve vacío/undefined en silencio — una key ausente se ve, no desaparece', () => {
    // Plantilla vieja apuntando a un campo que ya no existe, o un typo —
    // el problema tiene que verse en la vista previa/impresión.
    expect(resolveMergeField('cliente.nombre', {})).toBe('[campo desconocido: cliente.nombre]')
  })

  it('cada key del catálogo de Contrato y de Paz y salvo tiene un label', () => {
    for (const field of [...MERGE_FIELDS.contract, ...MERGE_FIELDS.settlement]) {
      expect(MERGE_FIELD_LABELS[field.key]).toBe(field.label)
    }
  })

  it('las keys compartidas entre los dos documentos usan el mismo label', () => {
    const contractKeys = new Map(MERGE_FIELDS.contract.map((f) => [f.key, f.label]))
    for (const field of MERGE_FIELDS.settlement) {
      const contractLabel = contractKeys.get(field.key)
      if (contractLabel) expect(field.label).toBe(contractLabel)
    }
  })
})
