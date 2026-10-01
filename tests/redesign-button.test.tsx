import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

/**
 * Rediseño P1, botones: rectángulo de radio 10 (la pastilla queda para estados
 * y filtros), 44 px de alto, variantes de la propuesta. Destructivo con
 * contorno rojo; relleno rojo solo dentro de la confirmación.
 */

afterEach(cleanup)

function archivos(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n)
    if (statSync(ruta).isDirectory()) archivos(ruta, out)
    else if (n.endsWith('.tsx')) out.push(ruta)
  }
  return out
}

/** Las etiquetas `<Button …>` de un archivo, con sus props (cuenta llaves, no corta en `=>`). */
function etiquetasButton(src: string): string[] {
  const out: string[] = []
  let i = src.indexOf('<Button')
  while (i !== -1) {
    if (!/[A-Za-z]/.test(src[i + 7] ?? '')) {
      let k = i + 7
      let depth = 0
      let q: string | null = null
      for (; k < src.length; k++) {
        const ch = src[k]
        if (q) {
          if (ch === q) q = null
        } else if (`"'\``.includes(ch)) q = ch
        else if (ch === '{') depth++
        else if (ch === '}') depth--
        else if (ch === '>' && depth === 0) break
      }
      out.push(src.slice(i, k + 1))
    }
    i = src.indexOf('<Button', i + 7)
  }
  return out
}

describe('Button del rediseño P1', () => {
  it('es un rectángulo de radio 10 y 44 px de alto, nunca una pastilla', () => {
    render(<Button>Registrar abono</Button>)
    const b = screen.getByRole('button', { name: 'Registrar abono' })
    expect(b).toHaveClass('rounded-input', 'h-11', 'font-semibold', 'bg-primary', 'text-primary-foreground')
    expect(b.className).not.toMatch(/rounded-pill/)
  })

  it('secundario con el borde de controles, fantasma sin fondo', () => {
    render(
      <>
        <Button variant="outline">Imprimir</Button>
        <Button variant="ghost">Cancelar</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Imprimir' })).toHaveClass('border-border-strong', 'bg-card')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveClass('bg-transparent')
  })

  it('destructivo es contorno rojo; el relleno rojo es otra variante', () => {
    render(
      <>
        <Button variant="destructive">Anular venta</Button>
        <Button variant="danger-solid">Rematar contrato</Button>
      </>,
    )
    const anular = screen.getByRole('button', { name: 'Anular venta' })
    expect(anular).toHaveClass('border-danger', 'text-danger', 'bg-card')
    expect(anular.className).not.toMatch(/bg-danger-solid/)
    expect(screen.getByRole('button', { name: 'Rematar contrato' })).toHaveClass('bg-danger-solid', 'text-on-danger-solid')
  })

  it('deshabilitado va en beige con texto atenuado, no a media opacidad', () => {
    render(<Button disabled>Registrar abono</Button>)
    const b = screen.getByRole('button', { name: 'Registrar abono' })
    expect(b).toHaveClass('disabled:bg-muted', 'disabled:text-muted-foreground')
    expect(b.className).not.toMatch(/disabled:opacity-50/)
  })

  it('el foco es un contorno sólido de 2 px en el token de foco', () => {
    render(<Button>Ok</Button>)
    expect(screen.getByRole('button', { name: 'Ok' })).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-ring')
  })

  it('chico 36 px y de bloque 52 px', () => {
    render(
      <>
        <Button size="sm">Abrir caja</Button>
        <Button size="lg">Vender</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Abrir caja' })).toHaveClass('h-9')
    expect(screen.getByRole('button', { name: 'Vender' })).toHaveClass('h-13', 'w-full')
  })

  it('ningún botón de acción de la app se vuelve pastilla por className (salvo el panel de plataforma)', () => {
    const malos: string[] = []
    for (const f of archivos(resolve(__dirname, '../src'))) {
      if (f.includes('/features/landing/') || f.includes('/features/platform/') || f.includes('/components/ui/')) continue
      for (const tag of etiquetasButton(readFileSync(f, 'utf8'))) if (/rounded-pill/.test(tag)) malos.push(`${f}: ${tag.slice(0, 80)}`)
    }
    expect(malos).toEqual([])
  })

  it('ningún botón pinta el rojo a mano: va por variante', () => {
    const malos: string[] = []
    for (const f of archivos(resolve(__dirname, '../src'))) {
      if (f.includes('/features/platform/')) continue
      for (const tag of etiquetasButton(readFileSync(f, 'utf8'))) {
        if (/bg-danger hover:bg-danger|text-danger hover:text-danger|border-danger text-danger/.test(tag)) malos.push(`${f}: ${tag.slice(0, 80)}`)
      }
    }
    expect(malos).toEqual([])
  })
})
