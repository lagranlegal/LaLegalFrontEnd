import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'

/**
 * Una tabla más ancha que su columna se desplaza, no se corta: en la ficha del
 * cliente (P3-b) la columna «Estado» salía como «Vige…» a 1280 px.
 */
describe('DataTable no recorta columnas', () => {
  const columns: ColumnDef<{ id: string }>[] = [{ accessorKey: 'id', header: 'Id' }]

  it.each([false, true])('embedded=%s: el contenedor desplaza en horizontal', (embedded) => {
    const { container } = render(<DataTable columns={columns} data={[{ id: 'a' }]} getRowId={(r) => r.id} embedded={embedded} />)
    const wrapper = container.querySelector('[data-table-scroll]')
    expect(wrapper).toHaveClass('overflow-x-auto')
    expect(wrapper).not.toHaveClass('overflow-hidden')
  })

  it('la pastilla de estado no se parte en dos líneas', () => {
    expect(readFileSync('src/components/shared/StatusBadge.tsx', 'utf8')).toMatch(/whitespace-nowrap/)
  })
})
