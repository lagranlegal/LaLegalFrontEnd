import { readFileSync } from 'node:fs'
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

describe('todo tamaño de texto de globals.css es conocido por cn', () => {
  // Leído del archivo: un `--text-*` nuevo sin registrar en `lib/utils.ts`
  // volvería a borrarse junto a un color (pasó con figure-lg y 2xs en P2-a).
  const css = readFileSync('src/styles/globals.css', 'utf8')
  const sizes = [...css.matchAll(/^\s*--text-([a-z0-9-]+):/gm)].map((m) => m[1]).filter((s) => !s.includes('--'))

  it('hay tamaños para revisar', () => {
    expect(sizes.length).toBeGreaterThan(5)
  })

  it.each(sizes)('text-%s convive con un color de texto', (size) => {
    expect(cn(`text-${size}`, 'text-foreground').split(' ')).toEqual([`text-${size}`, 'text-foreground'])
  })
})
