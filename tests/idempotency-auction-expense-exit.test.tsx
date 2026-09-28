import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * El backend acepta `Idempotency-Key` OPCIONAL desde la auditoría 27/09/2026
 * en tres escrituras que el front mandaba sin ella: el remate (F4-04), el
 * gasto (F5-03) y el egreso de inventario (F6-11). Sin la clave, un doble
 * clic o un reintento tras una respuesta perdida registra el gasto dos veces
 * o da de baja dos veces. Mismo patrón que los abonos: una clave por intento
 * de envío, REUSADA en el reintento del mismo envío (`useMoneyMutation`).
 */
const post = vi.fn()

vi.mock('@/lib/api/client', async () => {
  const errors = await import('@/lib/api/errors')
  return {
    api: { POST: (...a: unknown[]) => post(...a), GET: vi.fn() },
    unwrap: async (p: Promise<unknown>) => {
      const r = (await p) as { data?: unknown; error?: unknown }
      if (r.error) throw r.error
      return r.data
    },
    ApiError: errors.ApiError,
    NetworkError: errors.NetworkError,
  }
})

const { useAuctionContract } = await import('@/features/contracts/api')
const { useCreateExpense } = await import('@/features/cashbox/api')
const { useCreateExit } = await import('@/features/inventory/api')

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

function claveDe(llamada: number): unknown {
  const opts = post.mock.calls[llamada]![1] as { params?: { header?: Record<string, string> } }
  return opts.params?.header?.['Idempotency-Key']
}

beforeEach(() => {
  post.mockReset()
  post.mockRejectedValueOnce(new Error('red caída')).mockResolvedValue({ data: { ok: true } })
})

describe.each([
  ['remate', () => useAuctionContract(), 'c1'],
  ['gasto', () => useCreateExpense(), { category_id: 'x', description: 'Papelería', amount: '1000.00', payment_method: 'cash' }],
  ['egreso', () => useCreateExit(), { exit_type: 'loss', reason: 'Robo', lines: [{ item_id: 'i1', quantity: '1' }] }],
] as const)('%s', (_nombre, hook, variables) => {
  it('manda Idempotency-Key y la reusa en el reintento del mismo envío', async () => {
    const { result } = renderHook(hook, { wrapper })
    // @ts-expect-error — cada hook tiene su tipo de variables; acá solo importa la cabecera.
    result.current.mutate(variables)
    await waitFor(() => expect(result.current.isError).toBe(true))
    // @ts-expect-error — ídem.
    result.current.mutate(variables)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(typeof claveDe(0)).toBe('string')
    expect(claveDe(1)).toBe(claveDe(0))
  })
})
