import { describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import fixtures from './fixtures/backend-p2d.json'

/**
 * El cursor del listado lleva el orden: uno emitido con `number_desc` y
 * mandado con otro `sort` da 400. Cambiar de orden tiene que volver a la
 * primera página (sin cursor), nunca seguir con el de las páginas cargadas.
 * Páginas: respuesta real del backend local (`backend-p2d.json`).
 */
const calls = vi.hoisted(() => [] as Array<Record<string, unknown>>)
const conCursor = fixtures.contratos_orden_con_cursor.body

vi.mock('@/lib/api/client', () => ({
  api: {
    GET: (_path: string, opts: { params: { query: Record<string, unknown> } }) => {
      calls.push(opts.params.query)
      return Promise.resolve({ data: opts.params.query.cursor ? { ...conCursor, next_cursor: null } : conCursor })
    },
  },
  unwrap: async (p: Promise<{ data: unknown }>) => (await p).data,
}))

const { useContractsList } = await import('@/features/contracts/api')

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client }, children)
}

describe('useContractsList y el orden', () => {
  it('cambiar de orden pide la primera página, sin el cursor del orden anterior', async () => {
    const { result, rerender } = renderHook(({ sort }) => useContractsList('', sort), {
      wrapper,
      initialProps: { sort: 'number_desc' as 'number_desc' | 'customer_asc' },
    })
    await waitFor(() => expect(result.current.hasNextPage).toBe(true))
    expect(calls[0]).toMatchObject({ sort: 'number_desc', cursor: undefined })

    await act(() => result.current.fetchNextPage())
    expect(calls[1]).toMatchObject({ sort: 'number_desc', cursor: conCursor.next_cursor })

    rerender({ sort: 'customer_asc' })
    await waitFor(() => expect(calls).toHaveLength(3))
    expect(calls[2]).toMatchObject({ sort: 'customer_asc', cursor: undefined })
  })
})
