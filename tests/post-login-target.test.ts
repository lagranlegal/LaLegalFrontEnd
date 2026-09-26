import { describe, expect, it } from 'vitest'
import { postLoginTarget } from '@/features/auth/postLoginTarget'

/** `/` es la landing: después de entrar nadie debe terminar ahí. */
describe('postLoginTarget', () => {
  it('sin redirect va a /inicio', () => {
    expect(postLoginTarget(undefined)).toBe('/inicio')
    expect(postLoginTarget('')).toBe('/inicio')
  })

  it('un redirect a la raíz (con o sin query/hash) va a /inicio, no a la landing', () => {
    expect(postLoginTarget('/')).toBe('/inicio')
    expect(postLoginTarget('/?x=1')).toBe('/inicio')
    expect(postLoginTarget('/#algo')).toBe('/inicio')
  })

  it('respeta un redirect interno a otra pantalla', () => {
    expect(postLoginTarget('/contratos?estado=activo')).toBe('/contratos?estado=activo')
    expect(postLoginTarget('/platform')).toBe('/platform')
  })

  it('no acepta destinos fuera de la app', () => {
    expect(postLoginTarget('https://evil.example')).toBe('/inicio')
    expect(postLoginTarget('//evil.example')).toBe('/inicio')
  })
})
