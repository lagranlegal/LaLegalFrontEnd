import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { JSONContent } from '@tiptap/core'

/**
 * La cláusula de autorización de avisos en las tres pantallas donde se ve:
 * el editor de plantillas de Contrato (recuadro + «Insertar»), la nota de
 * Configuración → Notificaciones (hecho / pendiente) y el contrato impreso
 * con el formato de siempre (sin plantilla propia).
 */

const activeTemplate = vi.hoisted(() => ({ current: { data: undefined as unknown, isPending: false, isError: false } }))

vi.mock('@/lib/auth/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}))
vi.mock('@/features/settings/documentTemplates/api', () => ({
  useActiveDocumentTemplate: () => activeTemplate.current,
}))
vi.mock('@/lib/auth/me', () => ({
  useMe: () => ({ data: { company: { name: 'ZZ QA', legal_name: 'ZZ QA S.A.S.', signature_url: null } } }),
}))
vi.mock('@/lib/storage/photos', () => ({ useSignedPhotoUrl: () => ({ data: undefined }) }))

const { TemplateEditor } = await import('@/components/shared/documentTemplate/TemplateEditor')
const { ContractClauseNotice } = await import('@/features/settings/notifications/components/ContractClauseNotice')
const { ContractPrintView } = await import('@/features/contracts/components/ContractPrintView')
const { NOTICE_CONSENT_NODE, noticeConsentClause } = await import('@/lib/documents/noticeConsentClause')

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

afterEach(() => {
  cleanup()
  activeTemplate.current = { data: undefined, isPending: false, isError: false }
})

const SIN_CLAUSULA: JSONContent = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Contrato de la casa.' }] },
    { type: 'signatureBlock', attrs: { variant: 'cliente' } },
    { type: 'signatureBlock', attrs: { variant: 'empresa' } },
  ],
}

const CON_CLAUSULA: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contrato de la casa.' }] }, noticeConsentClause()],
}

describe('editor de plantillas — recuadro de la cláusula', () => {
  it('en un contrato sin la cláusula explica por qué, avisa que es un ejemplo y ofrece insertarla', () => {
    wrap(<TemplateEditor documentType="contract" value={SIN_CLAUSULA} onChange={() => {}} />)
    expect(screen.getByText(/Es un ejemplo; revísalo con tu abogado/)).toBeInTheDocument()
    expect(screen.getByText(/Ley 1581 de 2012/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Insertar cláusula de avisos' })).toBeInTheDocument()
  })

  it('«Insertar» la agrega ANTES de la primera firma, y después el recuadro dice que ya está y no la ofrece otra vez', async () => {
    const onChange = vi.fn<(json: JSONContent) => void>()
    const { rerender } = wrap(<TemplateEditor documentType="contract" value={SIN_CLAUSULA} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Insertar cláusula de avisos' }))

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const doc = onChange.mock.calls.at(-1)![0]
    const types = (doc.content ?? []).map((n) => n.type)
    // Los cuatro primeros: el párrafo, la cláusula y las dos firmas. Después
    // puede venir un párrafo vacío que agrega el TrailingNode de StarterKit
    // cuando el documento termina en un bloque atómico (pasa igual sin la
    // cláusula).
    expect(types.slice(0, 4)).toEqual(['paragraph', NOTICE_CONSENT_NODE, 'signatureBlock', 'signatureBlock'])
    expect(types.filter((t) => t === NOTICE_CONSENT_NODE)).toHaveLength(1)

    const client = new QueryClient()
    rerender(
      <QueryClientProvider client={client}>
        <TemplateEditor documentType="contract" value={doc} onChange={onChange} />
      </QueryClientProvider>,
    )
    expect(screen.getByText(/ya incluye la cláusula de autorización de avisos/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Insertar cláusula de avisos' })).not.toBeInTheDocument()
    expect(screen.getByText(/Es un ejemplo; revísalo con tu abogado/)).toBeInTheDocument()
  })

  it('una plantilla que ya la trae no ofrece insertarla', () => {
    wrap(<TemplateEditor documentType="contract" value={CON_CLAUSULA} onChange={() => {}} />)
    expect(screen.getByText(/ya incluye la cláusula de autorización de avisos/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Insertar cláusula de avisos' })).not.toBeInTheDocument()
  })

  it('el paz y salvo no muestra el recuadro', () => {
    wrap(<TemplateEditor documentType="settlement" value={SIN_CLAUSULA} onChange={() => {}} />)
    expect(screen.queryByText(/cláusula de autorización de avisos/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Insertar cláusula de avisos' })).not.toBeInTheDocument()
  })
})

describe('Configuración → Notificaciones — nota de la cláusula', () => {
  const FRASE = /Para escribirle a tus clientes con respaldo, tu contrato debe incluir la cláusula de autorización de avisos/

  it('sin plantilla activa (formato de fábrica): hecho, porque el formato de fábrica la trae', () => {
    activeTemplate.current = { data: null, isPending: false, isError: false }
    wrap(<ContractClauseNotice />)
    expect(screen.getByText(FRASE)).toBeInTheDocument()
    expect(screen.getByText(/formato de fábrica, que ya la trae/)).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/configuracion/documentos')
  })

  it('con plantilla activa que la tiene: hecho, nombrando la plantilla', () => {
    activeTemplate.current = { data: { name: 'Contrato 2026', body: CON_CLAUSULA }, isPending: false, isError: false }
    wrap(<ContractClauseNotice />)
    expect(screen.getByText(/«Contrato 2026» ya la incluye/)).toBeInTheDocument()
  })

  it('con plantilla activa que NO la tiene: pendiente, con el enlace para agregarla', () => {
    activeTemplate.current = { data: { name: 'Contrato viejo', body: SIN_CLAUSULA }, isPending: false, isError: false }
    wrap(<ContractClauseNotice />)
    expect(screen.getByText(/«Contrato viejo» todavía no la tiene/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Agregarla en Documentos/ })).toHaveAttribute('href', '/configuracion/documentos')
  })

  it('si no se puede saber (error, sin permiso o cargando) no afirma nada: solo la frase y el enlace', () => {
    activeTemplate.current = { data: undefined, isPending: false, isError: true }
    wrap(<ContractClauseNotice />)
    expect(screen.getByText(FRASE)).toBeInTheDocument()
    expect(screen.queryByText(/ya la (incluye|trae)|todavía no la tiene/)).not.toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/configuracion/documentos')
  })
})

describe('contrato impreso con el formato de siempre (sin plantilla propia)', () => {
  it('trae la cláusula con los datos reales, antes de las firmas', () => {
    activeTemplate.current = { data: null, isPending: false, isError: false }
    const contract = {
      id: 'c1',
      number: 42,
      legacy_code: null,
      start_date: '2026-09-01',
      due_date: '2027-01-01',
      principal: '1000000.00',
      interest_rate_pct: '5',
      term_months: 4,
      arrears_window_months: 4,
      notes: null,
      items: [],
      extended_on: null,
      extension_amount: null,
    }
    const customer = { full_name: 'Ana Gómez', doc_type: 'cc', doc_number: '123', address: null, phone: '3001234567', email: 'ana@example.com' }
    // `baseElement` y no `container`: el documento impreso se monta en un
    // portal, hijo directo de <body> (ver `PrintLayout`).
    const { baseElement: container } = wrap(
      // @ts-expect-error — fixture parcial: solo los campos que lee la vista impresa.
      <ContractPrintView contract={contract} customer={customer} categories={[]} />,
    )
    const heading = screen.getByText('Autorización para recibir avisos')
    expect(container.textContent).toContain('ana@example.com')
    expect(container.textContent).toContain('ZZ QA S.A.S.')
    expect(container.textContent).toMatch(/Ley 1581 de 2012/)
    const firma = screen.getByText('Firma del cliente')
    // La cláusula va antes de las firmas en el documento.
    expect(heading.compareDocumentPosition(firma) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
