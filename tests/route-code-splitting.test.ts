import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

/**
 * Issue #7 (F9-64): la app se servía en un bundle único de 1,9 MB y el login
 * o la landing bajaban también Reportes, Inventario y la plataforma. Cada
 * pantalla de la app va en su chunk (`lazyRouteComponent`); en el bundle
 * inicial quedan solo las de entrada.
 */
vi.mock('@/lib/auth/supabase', () => ({
  initialUrl: '',
  supabase: { auth: { getSession: vi.fn(), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } },
}))

const { createAppRouter } = await import('@/app/router')
const router = createAppRouter(new QueryClient())

function componente(path: string): { preload?: unknown } {
  const ruta = (router.routesByPath as Record<string, { options: { component?: { preload?: unknown } } }>)[path]
  if (!ruta) throw new Error(`no existe la ruta ${path}`)
  return ruta.options.component ?? {}
}

describe('división de código por ruta', () => {
  it.each(['/inicio', '/reportes', '/inventario', '/inventario/ingresos/nuevo', '/configuracion/documentos', '/platform', '/contratos/$contractId', '/ventas/nueva'])(
    '%s se carga aparte',
    (path) => {
      expect(typeof componente(path).preload).toBe('function')
    },
  )

  it.each(['/', '/auth/login', '/auth/callback'])('%s (entrada) va en el bundle inicial', (path) => {
    expect(componente(path).preload).toBeUndefined()
  })
})

describe('vercel.json', () => {
  const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] }

  it('lo que lleva hash en /assets/ se cachea un año como inmutable', () => {
    const assets = config.headers.find((h) => h.source === '/assets/(.*)')
    expect(assets?.headers).toContainEqual({ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' })
  })

  it('las cabeceras de seguridad siguen en todas las rutas', () => {
    const todas = config.headers.find((h) => h.source === '/(.*)')
    const claves = todas?.headers.map((h) => h.key)
    expect(claves).toEqual(expect.arrayContaining(['Strict-Transport-Security', 'Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']))
  })
})
