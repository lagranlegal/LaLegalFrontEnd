import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import p2d from './fixtures/backend-p2d.json'
import type { Item } from '@/lib/inventory/items'
import { PageTabs, PageTabsContent } from '@/components/shared/PageTabs'

/**
 * Rediseño P3 — Inventario. Las pestañas son `PageTabs` y avisan cuando hay
 * más a un lado (F9-38); «Solo con stock» se ve como control (F9-37); los
 * filtros tienen nombre (F9-39); dinero y cantidad a la derecha.
 * Artículo: respuesta real del backend local (`backend-p2d.json`).
 */
const articulo = p2d.articulos_q.body.items[0] as unknown as Item

const state = vi.hoisted(() => ({ search: {} as Record<string, unknown>, fetchAllItems: (() => Promise.resolve([])) as () => Promise<unknown[]>, toastError: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: (...args: unknown[]) => state.toastError(...args), success: vi.fn() } }))
vi.mock('@/features/inventory/useInventorySearch', () => ({
  useInventorySearch: () => ({ search: state.search, setSearch: vi.fn() }),
}))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: () => false }))
vi.mock('@/components/shared/Can', () => ({ Can: () => null }))
vi.mock('@/lib/catalogs/categories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/lib/catalogs/suppliers', () => ({ useSuppliers: () => ({ data: [] }) }))
const page = (items: unknown[]) => ({
  data: { pages: [{ items, next_cursor: null }] },
  isPending: false,
  isFetching: false,
  isError: false,
  refetch: vi.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
})
vi.mock('@/features/inventory/api', () => ({
  fetchAllItems: () => state.fetchAllItems(),
  useProductsList: () => page([]),
  useItemsList: () => page([articulo]),
  useEntriesList: () => page([]),
  useExitsList: () => page([]),
}))
vi.mock('@/features/inventory/components/TransformationsTab', () => ({ TransformationsTab: () => null }))

const { InventoryPage } = await import('@/features/inventory/pages/InventoryPage')

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.scrollIntoView ??= () => {}
})

afterEach(() => {
  cleanup()
  state.search = {}
})

describe('Inventario', () => {
  it('las secciones son pestañas con nombre, de 44 px', () => {
    render(<InventoryPage />)
    const tablist = screen.getByRole('tablist', { name: 'Secciones del inventario' })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Productos', 'Lotes', 'Ingresos', 'Egresos', 'Transformaciones'])
    expect(tabs[0]).toHaveClass('min-h-11')
  })

  it('«Solo con stock» es un control con estado y su casilla dibujada (F9-37)', () => {
    render(<InventoryPage />)
    const toggle = screen.getByRole('button', { name: 'Solo con stock' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle.querySelector('svg')).not.toBeNull()
  })

  it('los filtros desplegables se nombran por lo que filtran (F9-39)', () => {
    render(<InventoryPage />)
    expect(screen.getByRole('combobox', { name: 'Filtrar por categoría' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filtrar por proveedor' })).toBeInTheDocument()
  })

  it('en Lotes, costo y cantidad van a la derecha y la cantidad con su unidad', () => {
    state.search = { tab: 'items' }
    render(<InventoryPage />)
    const table = screen.getByRole('table')
    for (const name of ['Costo', 'Precio', 'Cantidad']) {
      expect(within(table).getByRole('columnheader', { name })).toHaveClass('text-right')
    }
    expect(within(table).getByText('1 u')).toHaveClass('tnum')
  })
})

describe('Exportar inventario con más registros que el tope (issue #11)', () => {
  it('no descarga un archivo a medias: avisa «No se exportó el archivo» con el motivo', async () => {
    // El error real de `fetchAllPages` al llegar al tope (lib/api/pagination, P3-a).
    const { PageLimitError } = await import('@/lib/api/pagination')
    const tope = new PageLimitError(5000, 50)
    state.fetchAllItems = () => Promise.reject(tope)
    state.search = { tab: 'items' }
    render(<InventoryPage />)
    fireEvent.click(screen.getByRole('button', { name: /Exportar a Excel/ }))
    await waitFor(() => expect(state.toastError).toHaveBeenCalledWith('No se exportó el archivo', { description: tope.message }))
    expect(screen.getByRole('button', { name: /Exportar a Excel/ })).toBeEnabled()
  })
})

describe('PageTabs — señal de que hay más pestañas (F9-38)', () => {
  it('con la tira cortada a la derecha aparece «Ver más pestañas»; al llegar al final, «anteriores»', () => {
    const tabs = ['Uno', 'Dos', 'Tres'].map((label) => ({ value: label, label }))
    render(
      <PageTabs label="Secciones" value="Uno" onValueChange={() => {}} tabs={tabs}>
        <PageTabsContent value="Uno">u</PageTabsContent>
      </PageTabs>,
    )
    const list = screen.getByRole('tablist')
    expect(screen.queryByRole('button', { name: 'Ver más pestañas' })).toBeNull()
    Object.defineProperty(list, 'clientWidth', { configurable: true, value: 300 })
    Object.defineProperty(list, 'scrollWidth', { configurable: true, value: 520 })
    act(() => {
      list.dispatchEvent(new Event('scroll'))
    })
    const more = screen.getByRole('button', { name: 'Ver más pestañas' })
    expect(more).toHaveAttribute('tabindex', '-1')
    act(() => {
      list.scrollLeft = 220
      list.dispatchEvent(new Event('scroll'))
    })
    expect(screen.queryByRole('button', { name: 'Ver más pestañas' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Ver pestañas anteriores' })).toBeInTheDocument()
  })
})
