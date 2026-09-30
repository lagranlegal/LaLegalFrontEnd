import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * F9-40: Escape (o clic afuera, o la X) en un diálogo con datos escritos
 * pregunta antes de descartar. Sin datos, cierra como siempre.
 */
const confirmMock = vi.hoisted(() => vi.fn(async (_o: unknown) => ({ confirmed: false })))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: confirmMock }))

const { AppDialog } = await import('@/components/shared/AppDialog')

afterEach(() => {
  cleanup()
  confirmMock.mockClear()
})

function escape() {
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
}

describe('AppDialog — descartar lo escrito', () => {
  it('con datos: Escape pregunta, y «Seguir editando» deja el diálogo abierto', async () => {
    const onOpenChange = vi.fn()
    render(
      <AppDialog open onOpenChange={onOpenChange} title="Nuevo cliente" confirmDiscard>
        <input aria-label="Nombre" />
      </AppDialog>,
    )
    escape()
    await waitFor(() => expect(confirmMock).toHaveBeenCalledOnce())
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('con datos: «Descartar» cierra', async () => {
    confirmMock.mockResolvedValueOnce({ confirmed: true })
    const onOpenChange = vi.fn()
    render(<AppDialog open onOpenChange={onOpenChange} title="Nuevo gasto" confirmDiscard />)
    escape()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('sin datos: cierra sin preguntar', async () => {
    const onOpenChange = vi.fn()
    render(<AppDialog open onOpenChange={onOpenChange} title="Nuevo gasto" />)
    escape()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(confirmMock).not.toHaveBeenCalled()
  })
})
