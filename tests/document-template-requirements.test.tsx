import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { JSONContent } from '@tiptap/core'
import fixtures from './fixtures/backend-g2.json'
import { parseApiError, userMessage } from '@/lib/api/errors'
import { editorDocOrEmpty, missingContractRequirements, templateProblem } from '@/lib/documents/templateRequirements'
import { STARTING_TEMPLATES } from '@/lib/documents/startingTemplates'

/**
 * Plantillas (backend 93f95e0, F8-01/02/03/11): el cuerpo se valida
 * (TEMPLATE_BODY_INVALID), la ACTIVA no se vacía por PATCH
 * (TEMPLATE_IS_EMPTY también al guardar) y un contrato necesita nombre del
 * cliente, tabla de prendas y firma del cliente para activarse
 * (TEMPLATE_MISSING_REQUIRED_FIELDS, `details.missing`). Los sobres de error
 * son reales (backend-g2.json).
 *
 * El editor avisa ANTES de mandar con la misma regla: con el backend que hoy
 * está desplegado, que acepta todo eso con 200, es la única defensa.
 */

const SOLO_TEXTO: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contrato' }] }],
}
const SIN_FIRMA_CLIENTE: JSONContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'mergeField', attrs: { key: 'cliente.nombre' } }] },
    { type: 'itemsTableBlock' },
    { type: 'signatureBlock', attrs: { variant: 'empresa' } },
  ],
}

describe('mínimos de una plantilla de contrato', () => {
  it('la plantilla de partida del editor los cumple', () => {
    expect(missingContractRequirements(STARTING_TEMPLATES.contract)).toEqual([])
    expect(templateProblem('contract', STARTING_TEMPLATES.contract)).toBeNull()
    expect(templateProblem('settlement', STARTING_TEMPLATES.settlement)).toBeNull()
  })

  it('las mismas claves y el mismo orden que details.missing del backend', () => {
    expect(missingContractRequirements(SOLO_TEXTO)).toEqual(fixtures.plantilla_sin_minimos.body.details.missing)
    expect(missingContractRequirements(SIN_FIRMA_CLIENTE)).toEqual(fixtures.plantilla_activa_sin_firma.body.details.missing)
  })

  it('un bloque de firma sin variante es la del cliente (default del nodo)', () => {
    const body: JSONContent = { ...SIN_FIRMA_CLIENTE, content: [...SIN_FIRMA_CLIENTE.content!, { type: 'signatureBlock' }] }
    expect(missingContractRequirements(body)).toEqual([])
  })

  it('dice qué falta en palabras', () => {
    expect(templateProblem('contract', SOLO_TEXTO)).toMatch(/el nombre del cliente, la tabla de prendas y la firma del cliente/)
  })

  it('vacía o solo espacios: está vacía, en los dos tipos', () => {
    const blanco: JSONContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '   ' }] }] }
    for (const body of [{ type: 'doc', content: [{ type: 'paragraph' }] }, blanco]) {
      expect(templateProblem('contract', body)).toMatch(/vacía/)
      expect(templateProblem('settlement', body)).toMatch(/vacía/)
    }
  })

  it('el paz y salvo no tiene mínimos de contrato', () => {
    expect(templateProblem('settlement', SOLO_TEXTO)).toBeNull()
  })

  it('un cuerpo que no es un documento del editor se reemplaza por el vacío del editor, nunca {}', () => {
    expect(editorDocOrEmpty({})).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(editorDocOrEmpty(undefined)).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(editorDocOrEmpty(SOLO_TEXTO)).toBe(SOLO_TEXTO)
  })
})

describe('códigos de plantillas', () => {
  it.each([
    ['TEMPLATE_IS_EMPTY', fixtures.plantilla_vacia_al_activar],
    ['TEMPLATE_IS_EMPTY', fixtures.plantilla_activa_vaciada],
    ['TEMPLATE_BODY_INVALID', fixtures.plantilla_cuerpo_invalido],
    ['TEMPLATE_MISSING_REQUIRED_FIELDS', fixtures.plantilla_sin_minimos],
  ])('%s se reconoce (no cae en UNKNOWN)', (code, sobre) => {
    expect(parseApiError(sobre.status, sobre.body).code).toBe(code)
  })

  it('faltan mínimos: el mensaje lista lo que falta con las palabras del editor', () => {
    const msg = userMessage(parseApiError(409, fixtures.plantilla_sin_minimos.body))
    expect(msg).toContain('el nombre del cliente, la tabla de prendas y la firma del cliente')
    expect(userMessage(parseApiError(409, fixtures.plantilla_activa_sin_firma.body))).toContain('la firma del cliente')
    expect(userMessage(parseApiError(409, fixtures.plantilla_activa_sin_firma.body))).not.toContain('la tabla de prendas')
  })
})

// ---------------------------------------------------------------------------
// La pantalla del editor

const mutations = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  activate: vi.fn(),
  templates: [] as unknown[],
}))
const toastError = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError } }))
vi.mock('@/components/shared/BackLink', () => ({ BackLink: () => null }))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { company: { name: 'ZZ QA', legal_name: null, signature_url: null } } }) }))
vi.mock('@/components/shared/documentTemplate/lazy', () => ({
  LazyTemplateEditor: () => null,
  LazyTemplateRenderer: () => null,
  preloadTemplateRenderer: () => Promise.resolve(),
}))
vi.mock('@/features/settings/documentTemplates/api', () => ({
  useDocumentTemplates: () => ({ data: mutations.templates, isPending: false, isError: false, refetch: vi.fn() }),
  useCreateDocumentTemplate: () => ({ mutateAsync: mutations.create, isPending: false }),
  useUpdateDocumentTemplate: () => ({ mutateAsync: mutations.update, isPending: false }),
  useDeleteDocumentTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useActivateDocumentTemplate: () => ({ mutateAsync: mutations.activate, isPending: false }),
  useDeactivateDocumentTemplate: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const { DocumentTemplatesPage } = await import('@/features/settings/documentTemplates/pages/DocumentTemplatesPage')

function plantilla(overrides: Record<string, unknown>) {
  return { id: 't1', document_type: 'contract', name: 'Propia', layout: 'classic', is_active: false, body: SOLO_TEXTO, ...overrides }
}

beforeEach(() => {
  mutations.create.mockReset().mockResolvedValue({ id: 'nueva' })
  mutations.update.mockReset().mockResolvedValue({})
  mutations.activate.mockReset().mockResolvedValue({})
  toastError.mockReset()
})
afterEach(cleanup)

describe('editor de plantillas — avisa antes de mandar', () => {
  it('crear manda el documento vacío del editor, nunca {}', async () => {
    mutations.templates = []
    render(<DocumentTemplatesPage />)
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva plantilla' }))
    fireEvent.change(screen.getByLabelText('Nombre de la plantilla'), { target: { value: 'Borrador' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(mutations.create).toHaveBeenCalledTimes(1))
    expect(mutations.create.mock.calls[0]![0].body).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('una plantilla guardada con cuerpo {} se edita desde el documento vacío del editor', async () => {
    mutations.templates = [plantilla({ body: {} })]
    render(<DocumentTemplatesPage />)
    fireEvent.click(screen.getByRole('button', { name: /Propia/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(mutations.update).toHaveBeenCalledTimes(1))
    expect(mutations.update.mock.calls[0]![0].body.body).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('activar un contrato sin los mínimos: avisa qué falta y no manda', async () => {
    mutations.templates = [plantilla({})]
    render(<DocumentTemplatesPage />)
    fireEvent.click(screen.getByRole('button', { name: /Propia/ }))

    expect(screen.getByText(/para activarla le falta/i)).toHaveTextContent('el nombre del cliente, la tabla de prendas y la firma del cliente')
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(String(toastError.mock.calls[0]![0])).toContain('la firma del cliente')
    expect(mutations.activate).not.toHaveBeenCalled()
  })

  it('guardar la ACTIVA sin los mínimos: avisa y no manda', async () => {
    mutations.templates = [plantilla({ is_active: true })]
    render(<DocumentTemplatesPage />)
    fireEvent.click(screen.getByRole('button', { name: /Propia/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(mutations.update).not.toHaveBeenCalled()
  })

  it('si el backend rechaza igual, se muestra su motivo (no «no se pudo»)', async () => {
    mutations.templates = [plantilla({ body: STARTING_TEMPLATES.contract })]
    mutations.activate.mockRejectedValue(parseApiError(409, fixtures.plantilla_sin_minimos.body))
    render(<DocumentTemplatesPage />)
    fireEvent.click(screen.getByRole('button', { name: /Propia/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(String(toastError.mock.calls[0]![0])).toContain('la tabla de prendas')
  })
})
