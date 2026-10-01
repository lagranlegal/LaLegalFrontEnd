import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

/** F9-54: los campos de Configuración tienen label asociado (getByLabelText los encuentra). */
// `useBlocker`: la barra de guardar pregunta antes de salir con cambios (P3).
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a>, useBlocker: () => ({ status: 'idle' }) }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))
vi.mock('@/features/settings/api', () => ({
  useCompanySettings: () => ({
    data: {
      name: 'ZZ QA',
      legal_name: null,
      tax_id: null,
      contact_email: null,
      contact_phone: null,
      address: null,
      logo_url: null,
      signature_url: null,
      documents: { header_note: null, footer_note: null, legal_notice: null },
      timezone: 'America/Bogota',
      currency: 'COP',
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateCompanySettings: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

const { SettingsPage } = await import('@/features/settings/pages/SettingsPage')
afterEach(cleanup)

describe('Configuración — labels asociados', () => {
  it('cada campo de texto se encuentra por su etiqueta', () => {
    render(<SettingsPage />)
    for (const label of ['Nombre comercial', 'Razón social', 'NIT / documento', 'Teléfono', 'Correo de contacto', 'Dirección', 'Nota de encabezado', 'Pie de página', 'Aviso legal']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    // La ayuda queda enlazada al campo.
    expect(screen.getByLabelText('Razón social').getAttribute('aria-describedby')).toBeTruthy()
  })
})
