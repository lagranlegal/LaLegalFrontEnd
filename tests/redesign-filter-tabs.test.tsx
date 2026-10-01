import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { FilterChip } from '@/components/shared/FilterChip'

/**
 * Rediseño P1, F9-13: la pestaña de filtro activa usaba el mismo oro relleno
 * que el botón primario «+ Nuevo contrato» y competía con él. Un solo primario
 * dorado por pantalla: el filtro activo va en neutro.
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

describe('pestañas de filtro neutras', () => {
  it('la activa va en tinta invertida, no en oro, y lo dice con aria-pressed', () => {
    render(
      <>
        <FilterChip active>Todos</FilterChip>
        <FilterChip active={false}>En mora</FilterChip>
      </>,
    )
    const activa = screen.getByRole('button', { name: 'Todos' })
    expect(activa).toHaveAttribute('aria-pressed', 'true')
    expect(activa).toHaveClass('bg-foreground', 'text-background', 'rounded-pill')
    expect(activa.className).not.toMatch(/bg-primary/)
    const otra = screen.getByRole('button', { name: 'En mora' })
    expect(otra).toHaveAttribute('aria-pressed', 'false')
    expect(otra.className).not.toMatch(/bg-primary|hover:bg-accent/)
  })

  it('ninguna pestaña o segmentado de la app marca la opción activa con el oro del primario', () => {
    const malos = archivos(resolve(__dirname, '../src'))
      .filter((f) => !f.includes('/features/landing/'))
      .filter((f) => /===[^?\n]+\?\s*'[^']*\bbg-primary text-primary-foreground/.test(readFileSync(f, 'utf8')))
    expect(malos).toEqual([])
  })

  it('las pestañas de filtro de Contratos, Inventario, Reportes y Plantillas usan la pieza compartida', () => {
    for (const ruta of [
      'src/features/contracts/pages/ContractsListPage.tsx',
      'src/features/inventory/pages/InventoryPage.tsx',
      'src/features/reports/pages/ReportesPage.tsx',
      'src/features/reports/components/ContablesSection.tsx',
      'src/features/settings/documentTemplates/pages/DocumentTemplatesPage.tsx',
    ]) {
      expect(readFileSync(resolve(__dirname, '..', ruta), 'utf8'), ruta).toMatch(/<FilterChip /)
    }
  })
})
