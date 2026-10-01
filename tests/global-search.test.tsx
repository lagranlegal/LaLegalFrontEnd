import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import fixtures from './fixtures/backend-p2d.json'

/**
 * Búsqueda global de la topbar (rediseño P2-d): «/» la enfoca, los resultados
 * salen agrupados y cada grupo solo existe —y solo se pide— con el permiso de
 * lectura de su módulo. Respuestas reales del backend local (`backend-p2d.json`).
 */
const state = vi.hoisted(() => ({
  perms: new Set<string>(),
  requests: [] as Array<{ path: string; query: Record<string, unknown> }>,
  navigations: [] as unknown[],
}))

vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (code: string) => state.perms.has(code) }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => (opts: unknown) => {
    state.navigations.push(opts)
  },
}))
vi.mock('@/lib/api/client', () => ({
  api: {
    GET: (path: string, opts: { params: { query: Record<string, unknown> } }) => {
      state.requests.push({ path, query: opts.params.query })
      const body =
        path === '/api/v1/contracts'
          ? fixtures.contratos_q.body
          : path === '/api/v1/customers'
            ? fixtures.clientes_q.body
            : fixtures.articulos_q.body
      return Promise.resolve({ data: body })
    },
  },
  unwrap: async (p: Promise<{ data: unknown }>) => (await p).data,
}))

const { GlobalSearch } = await import('@/components/shared/GlobalSearch')

const contrato = fixtures.contratos_q.body.items[0]!
const cliente = fixtures.clientes_q.body.items[0]!
const articulo = fixtures.articulos_q.body.items[0]!

function renderSearch(perms: string[]) {
  state.perms = new Set(perms)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <input aria-label="Otro campo" />
      <GlobalSearch />
    </QueryClientProvider>,
  )
}

function type(value: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value } })
}

afterEach(() => {
  cleanup()
  state.requests = []
  state.navigations = []
})

const ALL = ['contracts.view', 'customers.view', 'inventory.view']

describe('búsqueda global — atajo «/»', () => {
  it('«/» desde la página enfoca la búsqueda (en el celular, a pantalla completa)', () => {
    renderSearch(ALL)
    const evento = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    act(() => {
      document.body.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(true)
    expect(screen.getByRole('combobox')).toHaveFocus()
    // jsdom no mide: `matchMedia` responde «celular», así que abre la pantalla completa.
    expect(screen.getByRole('dialog', { name: 'Buscar' })).toBeInTheDocument()
  })

  it('«/» escribiendo en otro campo es un carácter, no el atajo', () => {
    renderSearch(ALL)
    const otro = screen.getByRole('textbox', { name: 'Otro campo' })
    otro.focus()
    const evento = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
    act(() => {
      otro.dispatchEvent(evento)
    })
    expect(evento.defaultPrevented).toBe(false)
    expect(otro).toHaveFocus()
  })

  it('el campo anuncia su atajo', () => {
    renderSearch(ALL)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-keyshortcuts', '/')
  })
})

describe('búsqueda global — grupos por permiso', () => {
  it('con los tres permisos, tres grupos con lo que trae cada `?q=`', async () => {
    renderSearch(ALL)
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Buscar cliente, contrato o código')
    type('mar')
    const listbox = await screen.findByRole('listbox')
    await waitFor(() => expect(within(listbox).getAllByRole('group')).toHaveLength(3))
    expect(within(listbox).getByRole('group', { name: 'Contratos' })).toHaveTextContent(`${contrato.customer_name} · ${contrato.customer_document}`)
    expect(within(listbox).getByRole('group', { name: 'Clientes' })).toHaveTextContent(cliente.full_name)
    expect(within(listbox).getByRole('group', { name: 'Artículos' })).toHaveTextContent(articulo.name)
  })

  it('sin inventory.view no pide artículos ni los nombra', async () => {
    renderSearch(['contracts.view', 'customers.view'])
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Buscar cliente o contrato')
    type('mar')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2))
    expect(state.requests.map((r) => r.path).sort()).toEqual(['/api/v1/contracts', '/api/v1/customers'])
    expect(screen.queryByRole('group', { name: 'Artículos' })).toBeNull()
  })

  it('solo con inventory.view (Bodega) busca solo artículos', async () => {
    renderSearch(['inventory.view'])
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Buscar código')
    type('cadena')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(state.requests.map((r) => r.path)).toEqual(['/api/v1/inventory/items'])
  })

  it('sin ningún permiso de búsqueda no hay campo ni pedidos', () => {
    renderSearch([])
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Buscar' })).toBeNull()
    expect(state.requests).toEqual([])
  })

  it('con menos de 3 letras no pide clientes (el piso del backend), sí contratos y artículos', async () => {
    renderSearch(ALL)
    type('2')
    await waitFor(() => expect(state.requests).toHaveLength(2))
    expect(state.requests.map((r) => r.path).sort()).toEqual(['/api/v1/contracts', '/api/v1/inventory/items'])
  })

  it('espera a que se deje de teclear: una consulta por término, no por tecla', async () => {
    renderSearch(['contracts.view'])
    type('1')
    type('12')
    type('123')
    await waitFor(() => expect(state.requests).toHaveLength(1))
    expect(state.requests[0]!.query).toMatchObject({ q: '123' })
  })
})

describe('búsqueda global — teclado', () => {
  it('flechas mueven la opción activa, Enter la abre y la búsqueda se limpia', async () => {
    renderSearch(ALL)
    const input = screen.getByRole('combobox')
    input.focus()
    type('mar')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    const [primera, segunda] = screen.getAllByRole('option')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant', primera!.id)
    expect(primera).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input).toHaveAttribute('aria-activedescendant', segunda!.id)
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    // Desde la primera, ↑ da la vuelta a la última (el artículo).
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(state.navigations.at(-1)).toEqual({ to: '/inventario', search: { tab: 'items', q: articulo.code ?? articulo.name } })
    expect(input).toHaveValue('')
  })

  it('Enter sin opción activa abre la primera (el contrato)', async () => {
    renderSearch(ALL)
    const input = screen.getByRole('combobox')
    type('mar')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3))
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(state.navigations.at(-1)).toEqual({ to: '/contratos/$contractId', params: { contractId: contrato.id } })
  })

  it('clic en un cliente abre su ficha', async () => {
    renderSearch(ALL)
    type('mar')
    const opcion = await screen.findByRole('option', { name: new RegExp(cliente.full_name) })
    fireEvent.click(opcion)
    expect(state.navigations.at(-1)).toEqual({ to: '/clientes/$customerId', params: { customerId: cliente.id } })
  })

  it('Escape cierra la lista sin borrar lo escrito', async () => {
    renderSearch(ALL)
    const input = screen.getByRole('combobox')
    input.focus()
    type('mar')
    await waitFor(() => expect(input).toHaveAttribute('aria-expanded', 'true'))
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(input).toHaveValue('mar')
  })
})

describe('búsqueda global — celular', () => {
  it('la lupa abre la búsqueda a pantalla completa y «Cerrar búsqueda» la cierra', () => {
    renderSearch(ALL)
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    expect(screen.getByRole('dialog', { name: 'Buscar' })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Escape en la pantalla completa la cierra', () => {
    renderSearch(ALL)
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
