import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

/** Los tamaños de texto propios no son colores: `cn` conserva los dos (rediseño P2). */
describe('cn con los tamaños de texto de globals.css', () => {
  it.each(['text-md', 'text-button-sm', 'text-button-lg', 'text-headline'])('%s convive con un color de texto', (size) => {
    expect(cn(size, 'text-foreground').split(' ')).toEqual([size, 'text-foreground'])
    expect(cn('text-primary-foreground', size).split(' ')).toEqual(['text-primary-foreground', size])
  })

  it('dos tamaños siguen resolviéndose al último', () => {
    expect(cn('text-sm', 'text-md')).toBe('text-md')
  })
})
