import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useMoneyMutation', () => {
  it('reusa la misma Idempotency-Key entre un intento fallido y el reintento', async () => {
    const mutationFn = vi.fn().mockRejectedValueOnce(new Error('red caída')).mockResolvedValueOnce({ ok: true })

    const { result } = renderHook(() => useMoneyMutation({ mutationFn }), { wrapper })

    result.current.mutate({})
    await waitFor(() => expect(result.current.isError).toBe(true))
    result.current.mutate({})
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [, firstKey] = mutationFn.mock.calls[0]!
    const [, secondKey] = mutationFn.mock.calls[1]!
    expect(secondKey).toBe(firstKey)
  })

  it('genera una key distinta tras un éxito (acción nueva)', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ ok: true })
    const { result, rerender } = renderHook(() => useMoneyMutation({ mutationFn }), { wrapper })

    result.current.mutate({})
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender()
    result.current.mutate({})
    await waitFor(() => expect(mutationFn).toHaveBeenCalledTimes(2))

    const [, firstKey] = mutationFn.mock.calls[0]!
    const [, secondKey] = mutationFn.mock.calls[1]!
    expect(secondKey).not.toBe(firstKey)
  })
})
