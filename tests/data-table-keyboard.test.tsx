import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/shared/DataTable'

/** F9-11: una fila que abre su detalle se alcanza con Tab y se abre con Enter o Espacio. */
afterEach(cleanup)

type Row = { id: string; name: string }
const columns: ColumnDef<Row>[] = [
  { header: 'Nombre', accessorKey: 'name' },
  { id: 'accion', header: '', cell: () => <button type="button">Acción</button> },
]

describe('DataTable — filas con teclado', () => {
  it('Enter y Espacio abren la fila; un botón dentro no la abre', () => {
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} data={[{ id: '1', name: 'Contrato 6' }]} getRowId={(r) => r.id} onRowClick={onRowClick} />)
    const row = screen.getAllByText('Contrato 6')[0]!.closest('tr')!
    expect(row.tabIndex).toBe(0)
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })
    expect(onRowClick).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(screen.getAllByRole('button', { name: 'Acción' })[0]!, { key: 'Enter' })
    expect(onRowClick).toHaveBeenCalledTimes(2)
  })

  it('sin onRowClick la fila no entra al orden de Tab', () => {
    render(<DataTable columns={columns} data={[{ id: '1', name: 'Contrato 6' }]} getRowId={(r) => r.id} />)
    expect(screen.getAllByText('Contrato 6')[0]!.closest('tr')!.hasAttribute('tabindex')).toBe(false)
  })
})
