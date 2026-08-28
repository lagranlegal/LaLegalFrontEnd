import { describe, expect, it } from 'vitest'
import {
  LAYOUT_CONTENT_CLASSES,
  LAYOUT_FONT_CLASS,
  LAYOUT_HEADER_DIVIDER_CLASS,
  LAYOUT_LABELS,
  LAYOUT_OPTIONS,
} from '@/lib/documents/layouts'

describe('formatos visuales de documentos', () => {
  it('cada formato del catálogo tiene label y clases de contenido/encabezado', () => {
    for (const layout of LAYOUT_OPTIONS) {
      expect(LAYOUT_LABELS[layout]).toBeTruthy()
      expect(LAYOUT_CONTENT_CLASSES[layout]).toBeTruthy()
      expect(LAYOUT_FONT_CLASS[layout]).toBeTruthy()
      expect(LAYOUT_HEADER_DIVIDER_CLASS[layout]).toBeTruthy()
    }
  })

  it('"classic" es el default — el más parecido al look de siempre', () => {
    expect(LAYOUT_OPTIONS[0]).toBe('classic')
  })
})
