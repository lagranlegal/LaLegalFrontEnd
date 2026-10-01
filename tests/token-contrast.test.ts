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
const oscuro = bloque("[data-theme='dark']")

describe('contraste de los tokens (WCAG AA, 4.5:1 para texto normal)', () => {
  it('el token de marca para TEXTO sobre fondo claro cumple AA', () => {
    // `--brand-500` es el relleno del botón primario, no el color del texto
    // sobre fondo claro: para eso DESIGN_SYSTEM §4.10 manda usar brand-600+.
    // El que de verdad pasa es el 700 (4.53 sobre el gris de fondo).
    const fondo = claro['--bg-app']
    expect(ratio(claro['--brand-700'], fondo)).toBeGreaterThanOrEqual(4.5)
  })

  // Estuvo marcado con `it.fails` mientras el token no cumplía, y el día que se
  // corrigió el test empezó a fallar por «pasó cuando se esperaba que fallara»
  // — que es exactamente para lo que servía la marca. Ahora vigila de verdad.
  it('el texto secundario es legible sobre los dos fondos de la app', () => {
    // --text-muted son las labels de KPI, los hints y los placeholders: está
    // en todas las pantallas, así que un fallo acá es sistémico.
    for (const fondo of [claro['--bg-app'], claro['--bg-surface']]) {
      expect(ratio(claro['--text-muted'], fondo)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('los textos de estado son legibles sobre su propio fondo suave', () => {
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

  // El agujero que costó meses: este test medía los tokens de TEXTO y nunca el
  // relleno del botón primario, que es el control más pulsado de toda la app.
  // Por eso el teal en 2.70 vivió sin que nada fallara, y por eso el oro
  // #c99a3d —que con texto blanco da 2.57, todavía peor— habría entrado igual.
  // Se mide en los DOS temas: `--brand-contrast` es el color del texto que va
  // encima del primario, así que el par correcto es contrast↔500, no 500↔fondo.
  it('el RELLENO del botón primario es legible, en los dos temas', () => {
    for (const [tema, vars] of [
      ['claro', claro],
      ['oscuro', oscuro],
    ] as const) {
      for (const relleno of ['--brand-500', '--brand-600']) {
        const r = ratio(vars['--brand-contrast'], vars[relleno])
        expect(r, `${tema}: --brand-contrast sobre ${relleno} da ${r.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('el texto de cuerpo y el fuerte cumplen de sobra', () => {
    for (const t of ['--text-body', '--text-strong']) {
      expect(ratio(claro[t], claro['--bg-app'])).toBeGreaterThanOrEqual(4.5)
    }
  })

  // La landing pública (26/09/2026) pinta secciones enteras sobre el carbón del
  // sidebar —hero, «Para quién», CTA final— en los DOS temas, y la sección de
  // la cadena sobre `--bg-muted`. Se miden los pares que usa de verdad.
  it('la landing: texto sobre el carbón y sobre el beige, en los dos temas', () => {
    const malos: string[] = []
    for (const [tema, vars] of [
      ['claro', claro],
      ['oscuro', { ...claro, ...oscuro }],
    ] as const) {
      const pares: [string, string][] = [
        ['--sidebar-fg-strong', '--sidebar-bg'],
        ['--sidebar-fg', '--sidebar-bg'],
        ['--sidebar-fg-muted', '--sidebar-bg'],
        ['--brand-500', '--sidebar-bg'], // text-brand-on-dark
        ['--sidebar-fg', '--sidebar-bg-hover'], // tarjetas de «Para quién»
        ['--sidebar-fg-muted', '--sidebar-bg-hover'], // chip de caja del hero
        ['--brand-500', '--sidebar-bg-hover'],
        ['--text-body', '--bg-muted'], // la cadena
        ['--brand-700', '--bg-muted'],
        ['--brand-700', '--brand-50'], // chips «Gana por…», tarjeta «celular»
        ['--text-body', '--brand-50'],
      ]
      for (const [fg, bg] of pares) {
        const r = ratio(vars[fg], vars[bg])
        if (r < 4.5) malos.push(`${tema}: ${fg} sobre ${bg} da ${r.toFixed(2)}`)
      }
      // Punto de «Caja cuadrada»: no es texto, pide 3:1 (WCAG 1.4.11).
      const punto = ratio(vars['--sidebar-success'], vars['--sidebar-bg-hover'])
      if (punto < 3) malos.push(`${tema}: --sidebar-success sobre --sidebar-bg-hover da ${punto.toFixed(2)}`)
    }
    expect(malos, `por debajo de AA:\n  ${malos.join('\n  ')}`).toEqual([])
  })

  // Issue #4 (WCAG 1.4.11): el anillo de foco es un indicador, pide 3:1 contra
  // el fondo donde se dibuja. Con `ring-ring/50` (el de shadcn) el oro a media
  // opacidad daba ≈ 2,2:1; por eso el anillo va sólido y se mide el token
  // (`--color-ring` = `--brand-700`, globals.css).
  it('el anillo de foco se ve (≥ 3:1) sobre los fondos de la app, en los dos temas', () => {
    const malos: string[] = []
    for (const [tema, vars] of [
      ['claro', claro],
      ['oscuro', { ...claro, ...oscuro }],
    ] as const) {
      for (const fondo of ['--bg-app', '--bg-surface', '--bg-muted']) {
        const r = ratio(vars['--brand-700'], vars[fondo])
        if (r < 3) malos.push(`${tema}: anillo sobre ${fondo} da ${r.toFixed(2)}`)
      }
    }
    expect(malos, malos.join('\n')).toEqual([])
  })
})

// Rediseño P1 (propuesta del 30/09/2026, §3 «Sistema visual»): cuatro valores
// cambian y entran tokens nuevos. Cada par se mide contra el fondo donde vive
// y se compara con el ratio que publicó la propuesta, a dos decimales: si
// alguien mueve un hex, el número aprobado deja de cuadrar y esto avisa.
describe('rediseño P1: los pares nuevos dan el ratio aprobado', () => {
  const oscuroCompleto = { ...claro, ...oscuro }
  const PARES: [tema: string, vars: Record<string, string>, fg: string, bg: string, esperado: number][] = [
    ['claro', claro, '--text-muted', '--bg-muted', 5.02], // F9-22: era 4.39
    ['claro', claro, '--text-muted', '--bg-app', 5.62],
    ['claro', claro, '--warning', '--warning-soft', 5.44], // prórroga
    ['claro', claro, '--danger', '--danger-soft', 5.53], // en mora
    ['claro', claro, '--on-danger-solid', '--danger-solid', 6.45], // listo para remate
    ['claro', claro, '--success', '--success-soft', 5.43],
    ['claro', claro, '--info', '--info-soft', 5.62],
    ['claro', claro, '--text-body', '--neutral-soft', 7.87], // rematado
    ['claro', claro, '--focus', '--bg-app', 5.98],
    ['oscuro', oscuroCompleto, '--warning', '--warning-soft', 7.29], // F9-14: la prórroga daba 3.57
    ['oscuro', oscuroCompleto, '--danger', '--danger-soft', 5.3],
    ['oscuro', oscuroCompleto, '--on-danger-solid', '--danger-solid', 6.32],
    ['oscuro', oscuroCompleto, '--success', '--success-soft', 6.86],
    ['oscuro', oscuroCompleto, '--info', '--info-soft', 6.69],
    ['oscuro', oscuroCompleto, '--text-body', '--neutral-soft', 10.09],
    ['oscuro', oscuroCompleto, '--focus', '--bg-surface', 11.67],
  ]

  it.each(PARES)('%s: %s sobre %s', (_tema, vars, fg, bg, esperado) => {
    expect(vars[fg], `${fg} no está definido`).toBeDefined()
    expect(vars[bg], `${bg} no está definido`).toBeDefined()
    const r = ratio(vars[fg], vars[bg])
    expect(r).toBeGreaterThanOrEqual(4.5)
    expect(Number(r.toFixed(2))).toBeCloseTo(esperado, 1)
  })

  it('cada token nuevo tiene su valor en el tema oscuro', () => {
    for (const t of ['--danger-solid', '--on-danger-solid', '--neutral-soft', '--border-strong', '--focus']) {
      expect(claro[t], `${t} en claro`).toBeDefined()
      expect(oscuro[t], `${t} en oscuro`).toBeDefined()
    }
  })

  it('los valores son los de la propuesta', () => {
    expect(claro['--text-muted']).toBe('#68635a')
    expect([claro['--warning'], claro['--warning-soft']]).toEqual(['#94500f', '#fcefe2'])
    expect([oscuro['--warning'], oscuro['--warning-soft']]).toEqual(['#f0a867', '#3a2410'])
    expect([claro['--border-strong'], oscuro['--border-strong']]).toEqual(['#c3baa6', '#544d3e'])
    expect([claro['--focus'], oscuro['--focus']]).toEqual(['#7a5a1c', '#f2d27a'])
  })

  it('el foco se ve (≥ 3:1) sobre los tres fondos, en los dos temas', () => {
    for (const vars of [claro, oscuroCompleto]) {
      for (const fondo of ['--bg-app', '--bg-surface', '--bg-muted']) {
        expect(ratio(vars['--focus'], vars[fondo]), fondo).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('el borde de un control es más fuerte que el de una card, en los dos temas', () => {
    for (const vars of [claro, oscuroCompleto]) {
      expect(ratio(vars['--border-strong'], vars['--bg-surface'])).toBeGreaterThan(ratio(vars['--border'], vars['--bg-surface']))
    }
  })

  it('la mora es roja y la prórroga ámbar (no dos marrones al lado del oro)', () => {
    const alias = (token: string) => CSS.match(new RegExp(`${token}:\\s*var\\((--[\\w-]+)\\)`))?.[1]
    expect(alias('--status-arrears')).toBe('--danger')
    expect(alias('--status-extension')).toBe('--warning')
  })
})

describe('el anillo de foco es sólido', () => {
  // Medido a mano en Chrome: `ring-ring/50` sobre marfil ≈ 2,2:1. Un anillo o
  // contorno de foco a media opacidad vuelve a quedar bajo 3:1 aunque el token
  // pase; el sufijo de opacidad sobre el token de foco no se usa.
  it('ningún componente ni la capa base usan el token de foco a media opacidad', async () => {
    const { readdirSync, statSync } = await import('node:fs')
    const { join } = await import('node:path')
    const archivos: string[] = []
    const recorrer = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const ruta = join(dir, n)
        if (statSync(ruta).isDirectory()) recorrer(ruta)
        else if (/\.(tsx?|css)$/.test(n)) archivos.push(ruta)
      }
    }
    recorrer(resolve(__dirname, '../src'))
    const conOpacidad = archivos.filter((f) => /(ring|outline)-ring\/\d+/.test(readFileSync(f, 'utf8')))
    expect(conOpacidad).toEqual([])
  })
})
