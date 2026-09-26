import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * «Volver al documento de fábrica» (F21-05).
 *
 * El endpoint `POST /company/document-templates/{id}/deactivate` existe desde
 * F8-02, pero ningún botón lo llamaba: en cuanto una empresa activaba su
 * primera plantilla, el documento de fábrica quedaba inalcanzable desde la
 * UI. Lo que se fija acá: el botón aparece SOLO si hay una activa de ese
 * tipo, pregunta antes (y la pregunta dice que la plantilla no se borra), y
 * cancelar no llama al backend.
 */

type Template = { id: string; name: string; is_active: boolean; document_type: string }

let templates: Template[] = []
const deactivate = vi.fn()
const confirmMock = vi.fn()

vi.mock('@/components/shared/BackLink', () => ({ BackLink: () => null }))
vi.mock('@/components/shared/PrintLayout', () => ({ PrintLayout: () => null }))
vi.mock('@/components/shared/documentTemplate/lazy', () => ({ LazyTemplateEditor: () => null, LazyTemplateRenderer: () => null }))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: undefined }) }))
vi.mock('@/components/shared/confirmStore', () => ({ confirm: (...args: unknown[]) => confirmMock(...args) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/settings/documentTemplates/api', () => {
  const idle = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    useDocumentTemplates: () => ({ data: templates, isPending: false, isError: false, refetch: vi.fn() }),
    useCreateDocumentTemplate: idle,
    useUpdateDocumentTemplate: idle,
    useDeleteDocumentTemplate: idle,
    useActivateDocumentTemplate: idle,
    useDeactivateDocumentTemplate: () => ({ mutateAsync: deactivate, isPending: false }),
  }
})

const { DocumentTemplatesPage } = await import('@/features/settings/documentTemplates/pages/DocumentTemplatesPage')

beforeEach(() => {
  deactivate.mockReset().mockResolvedValue(undefined)
  confirmMock.mockReset()
})
afterEach(cleanup)

const BOTON = { name: 'Volver al documento de fábrica' }

describe('DocumentTemplatesPage — volver al documento de fábrica', () => {
  it('sin plantilla activa no ofrece el botón y dice con qué se imprime', () => {
    templates = [{ id: 't1', name: 'Borrador', is_active: false, document_type: 'contract' }]
    render(<DocumentTemplatesPage />)

    expect(screen.queryByRole('button', BOTON)).not.toBeInTheDocument()
    expect(screen.getByText(/se imprime con el documento de fábrica/)).toBeInTheDocument()
  })

  it('con una activa, confirma diciendo que queda guardada y desactiva ESA', async () => {
    templates = [
      { id: 't1', name: 'Borrador', is_active: false, document_type: 'contract' },
      { id: 't2', name: 'Contrato 2026', is_active: true, document_type: 'contract' },
    ]
    confirmMock.mockResolvedValue({ confirmed: true })
    render(<DocumentTemplatesPage />)

    fireEvent.click(screen.getByRole('button', BOTON))

    await waitFor(() => expect(deactivate).toHaveBeenCalledWith('t2'))
    const opciones = confirmMock.mock.calls[0][0] as { description: string }
    expect(opciones.description).toContain('«Contrato 2026»')
    expect(opciones.description).toContain('queda guardada')
    expect(opciones.description).toContain('formato de siempre')
  })

  it('cancelar la confirmación no llama al backend', async () => {
    templates = [{ id: 't2', name: 'Contrato 2026', is_active: true, document_type: 'contract' }]
    confirmMock.mockResolvedValue({ confirmed: false })
    render(<DocumentTemplatesPage />)

    fireEvent.click(screen.getByRole('button', BOTON))

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1))
    expect(deactivate).not.toHaveBeenCalled()
  })
})
