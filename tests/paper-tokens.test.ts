import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * El papel no tiene modo oscuro.
 *
 * Los documentos impresos (contrato, comprobante de venta, paz y salvo, acta
 * de cierre) se pintan con los tokens `--paper-*`, no con los del tema: si
 * usaran `--brand-700` o `--text-strong`, quien tenga la app en oscuro
 * imprimiría títulos en oro claro y texto casi blanco sobre la hoja blanca, y
 * la vista previa de `/configuracion/documentos` mostraría lo mismo. Pasó con
 * los encabezados del formato «Moderno», que usaban `--brand-600`.
 *
 * Por eso los `--paper-*` viven solo en `:root`, con el hex del tema claro, y
 * este test vigila las dos cosas que los podrían romper: que alguien los
 * redefina en `[data-theme='dark']`, y que la marca cambie y el papel se quede
 * con el oro viejo (el hex está repetido a propósito — ver `tokens.css`).
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
    if (m) vars[m[1]] = m[2].toLowerCase()
  }
  return vars
}

function canal(c: number) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
function luminancia(hex: string) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)
}
function ratio(a: string, b: string) {
  const [l1, l2] = [luminancia(a), luminancia(b)]
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const claro = bloque(':root')
const oscuro = bloque("[data-theme='dark']")

/** Cada token del papel y el token del tema claro del que es copia. */
const ESPEJO: Record<string, string> = {
  '--paper-ink': '--text-strong',
  '--paper-ink-soft': '--text-body',
  '--paper-muted': '--text-muted',
  '--paper-rule': '--border',
  '--paper-accent': '--brand-500',
  '--paper-accent-ink': '--brand-700',
  '--paper-accent-soft': '--brand-50',
  '--paper-danger': '--danger',
  '--paper-danger-soft': '--danger-soft',
}

describe('tokens del papel (documentos impresos)', () => {
  it('existen en :root y el papel es blanco', () => {
    expect(claro['--paper']).toBe('#ffffff')
    for (const token of Object.keys(ESPEJO)) expect(claro[token], token).toBeDefined()
  })

  it('NO se redefinen en el tema oscuro', () => {
    for (const token of ['--paper', ...Object.keys(ESPEJO)]) expect(oscuro[token], token).toBeUndefined()
  })

  it('son el mismo hex que su token del tema claro (si la marca cambia, el papel también)', () => {
    for (const [token, fuente] of Object.entries(ESPEJO)) expect(claro[token], `${token} ≠ ${fuente}`).toBe(claro[fuente])
  })

  it('el texto del papel cumple AA sobre la hoja y sobre el fondo de encabezado de tabla', () => {
    for (const texto of ['--paper-ink', '--paper-ink-soft', '--paper-muted', '--paper-accent-ink', '--paper-danger']) {
      expect(ratio(claro[texto], claro['--paper']), texto).toBeGreaterThanOrEqual(4.5)
    }
    expect(ratio(claro['--paper-accent-ink'], claro['--paper-accent-soft'])).toBeGreaterThanOrEqual(4.5)
    expect(ratio(claro['--paper-danger'], claro['--paper-danger-soft'])).toBeGreaterThanOrEqual(4.5)
  })
})
