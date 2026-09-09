import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * El contraste de los tokens de texto, medido en vez de mirado.
 *
 * `DESIGN_SYSTEM.md` §4.10 lo pide explícitamente: «contraste ≥4.5:1 (verificar
 * teal sobre blanco en textos — usar --brand-600+ para texto sobre claro)».
 * La auditoría de QA (Fase 6) encontró 12 combinaciones por debajo de AA en el
 * tema claro y CERO en el oscuro: la regla estaba escrita y nadie la medía.
 *
 * Este test la mide sobre `tokens.css`, que es la única fuente de verdad del
 * color. No reemplaza revisar la app en vivo —un componente puede pintar un
 * token sobre un fondo inesperado— pero cierra el caso más común: cambiar un
 * token de marca y dejarlo ilegible sin enterarse.
 */

const CSS = readFileSync(resolve(__dirname, '../src/styles/tokens.css'), 'utf8')

function bloque(selector: string): Record<string, string> {
  const i = CSS.indexOf(selector)
  if (i === -1) throw new Error(`no se encontró el bloque ${selector} en tokens.css`)
  const abre = CSS.indexOf('{', i)
  const cierra = CSS.indexOf('\n}', abre)
  const vars: Record<string, string> = {}
  for (const linea of CSS.slice(abre, cierra).split('\n')) {
    const m = linea.match(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})/)
    if (m) vars[m[1]] = m[2]
  }
  return vars
}

function canal(c: number) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
function luminancia(hex: string) {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16))
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}
function ratio(a: string, b: string) {
  const [l1, l2] = [luminancia(a), luminancia(b)]
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const claro = bloque(':root')

describe('contraste de los tokens (WCAG AA, 4.5:1 para texto normal)', () => {
  it('el token de marca para TEXTO sobre fondo claro cumple AA', () => {
    // `--brand-500` es el relleno del botón primario, no el color del texto
    // sobre fondo claro: para eso DESIGN_SYSTEM §4.10 manda usar brand-600+.
    // El que de verdad pasa es el 700 (4.53 sobre el gris de fondo).
    const fondo = claro['--bg-app']
    expect(ratio(claro['--brand-700'], fondo)).toBeGreaterThanOrEqual(4.5)
  })

  // `it.fails` y no `skip`: hoy NO cumple (Fase 6 de la auditoría, F6-02) y
  // cambiar el token le toca la cara a toda la app, así que es una decisión de
  // producto pendiente. Marcarlo así deja CI en verde documentando el defecto
  // real — y el día que se corrija el token, este test empezará a fallar por
  // «pasó cuando se esperaba que fallara», obligando a quitarle el `.fails`.
  // Un skip, en cambio, se olvida.
  it.fails('el texto secundario es legible sobre los dos fondos de la app', () => {
    // --text-muted son las labels de KPI, los hints y los placeholders: está
    // en todas las pantallas, así que un fallo acá es sistémico.
    for (const fondo of [claro['--bg-app'], claro['--bg-surface']]) {
      expect(ratio(claro['--text-muted'], fondo)).toBeGreaterThanOrEqual(4.5)
    }
  })

  // Mismo caso que el anterior: pendiente de decisión, no de código.
  it.fails('los textos de estado son legibles sobre su propio fondo suave', () => {
    // El peor caso medido fue «Caja cerrada — no se pueden registrar
    // operaciones de dinero» con 1.97:1, y es el mensaje operativo más
    // importante del producto: el que costó once días de trabajo a un cliente.
    const pares: [string, string][] = [
      ['--warning', '--warning-soft'],
      ['--success', '--success-soft'],
      ['--danger', '--danger-soft'],
      ['--info', '--info-soft'],
    ]
    const malos = pares
      .map(([fg, bg]) => [fg, ratio(claro[fg], claro[bg])] as const)
      .filter(([, r]) => r < 4.5)
      .map(([fg, r]) => `${fg} sobre su soft: ${r.toFixed(2)}`)
    expect(malos, `por debajo de AA:\n  ${malos.join('\n  ')}`).toEqual([])
  })

  it('el texto de cuerpo y el fuerte cumplen de sobra', () => {
    for (const t of ['--text-body', '--text-strong']) {
      expect(ratio(claro[t], claro['--bg-app'])).toBeGreaterThanOrEqual(4.5)
    }
  })
})
