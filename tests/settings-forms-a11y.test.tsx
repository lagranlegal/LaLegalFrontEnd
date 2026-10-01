import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import fixtures from './fixtures/backend-g2.json'
import type { NotificationSettings } from '@/features/settings/notifications/api'

/**
 * Issue #4: Configuración, Mi perfil, Notificaciones y Plantillas usan el
 * campo compartido. El error de cada campo queda enlazado por
 * `aria-describedby` (en Mi perfil y Notificaciones solo se pintaba debajo), y
 * en Configuración la ayuda sigue siendo la descripción mientras no haya error.
 */
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/shared/BackLink', () => ({ BackLink: () => null }))
vi.mock('@/components/shared/PhotoUploader', () => ({ PhotoUploader: () => null }))
vi.mock('@/components/shared/PrintLayout', () => ({ PrintLayout: () => null }))
vi.mock('@/components/shared/documentTemplate/lazy', () => ({ LazyTemplateEditor: () => null, LazyTemplateRenderer: () => null }))
vi.mock('@/lib/storage/photos', () => ({ useSignedPhotoUrl: () => ({ data: undefined, isPending: false, isError: false }) }))
vi.mock('@/lib/auth/me', () => ({
  useMe: () => ({ data: { user: { id: 'u1', full_name: 'Ana', email: 'ana@example.test', photo_url: null }, company: { id: 'emp' }, role: { name: 'Asesor' } } }),
  useUpdateMe: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/features/auth/api', () => ({
  useChangeOwnPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
  WrongCurrentPasswordError: class extends Error {},
  setPasswordErrorMessage: () => '',
}))
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
vi.mock('@/features/settings/notifications/components/ContractClauseNotice', () => ({ ContractClauseNotice: () => null }))
vi.mock('@/features/settings/notifications/api', () => ({
  useNotificationSettings: () => ({ data: fixtures.avisos_mas_estricto.body as unknown as NotificationSettings, isPending: false, isError: false, refetch: vi.fn() }),
  useUpdateNotificationSettings: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useNotificationDeliveries: () => ({ data: { pages: [] }, isPending: false, isError: false, hasNextPage: false, fetchNextPage: vi.fn() }),
}))
vi.mock('@/features/settings/documentTemplates/api', () => {
  const idle = () => ({ mutateAsync: vi.fn(), isPending: false })
  return {
    useDocumentTemplates: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
    useCreateDocumentTemplate: idle,
    useUpdateDocumentTemplate: idle,
    useDeleteDocumentTemplate: idle,
    useActivateDocumentTemplate: idle,
    useDeactivateDocumentTemplate: idle,
  }
})

const { SettingsPage } = await import('@/features/settings/pages/SettingsPage')
const { ProfilePage } = await import('@/features/settings/pages/ProfilePage')
const { NotificationSettingsPage } = await import('@/features/settings/notifications/pages/NotificationSettingsPage')
const { DocumentTemplatesPage } = await import('@/features/settings/documentTemplates/pages/DocumentTemplatesPage')

afterEach(cleanup)

describe('Configuración', () => {
  it('sin error la ayuda describe el campo; con error, el motivo', async () => {
    render(<SettingsPage />)
    expect(screen.getByRole('textbox', { name: 'Razón social', description: 'Nombre legal, si es distinto del comercial.' })).toBeInTheDocument()

    const nombre = screen.getByRole('textbox', { name: 'Nombre comercial' })
    fireEvent.change(nombre, { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }))
    await waitFor(() => expect(nombre.getAttribute('aria-invalid')).toBe('true'))
    expect(screen.getByRole('textbox', { name: 'Nombre comercial', description: 'El nombre es obligatorio' })).toBe(nombre)
    expect(screen.getByRole('textbox', { name: 'Aviso legal' }).tagName).toBe('TEXTAREA')
  })
})

describe('Mi perfil', () => {
  it('el nombre vacío y la contraseña corta se anuncian con su motivo', () => {
    render(<ProfilePage />)
    fireEvent.change(screen.getByRole('textbox', { name: 'Nombre' }), { target: { value: '' } })
    expect(screen.getByRole('textbox', { name: 'Nombre', description: 'El nombre no puede quedar vacío.' }).getAttribute('aria-invalid')).toBe('true')

    const nueva = screen.getByLabelText('Contraseña nueva')
    fireEvent.change(nueva, { target: { value: 'corta' } })
    expect(nueva.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(nueva.getAttribute('aria-describedby') ?? '')?.textContent).toBe('Mínimo 8 caracteres.')
  })
})

describe('Notificaciones', () => {
  it('un número fuera de rango y una franja al revés se anuncian con su motivo', async () => {
    render(<NotificationSettingsPage />)
    fireEvent.change(screen.getByLabelText('Máximo por día'), { target: { value: '99' } })
    fireEvent.change(screen.getByLabelText('Sábados, hasta'), { target: { value: '08:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar parámetros' }))

    expect(await screen.findByRole('textbox', { name: 'Máximo por día', description: 'Un número entero entre 0 y 20.' })).toBeInTheDocument()
    for (const etiqueta of ['Sábados, desde', 'Sábados, hasta']) {
      const campo = screen.getByLabelText(etiqueta)
      expect(campo.getAttribute('aria-invalid')).toBe('true')
      expect(document.getElementById(campo.getAttribute('aria-describedby') ?? '')?.textContent).toMatch(/después de la hora de inicio|07:00|08:00/)
    }
  })
})

describe('Plantillas', () => {
  it('el nombre de la plantilla tiene su etiqueta', () => {
    render(<DocumentTemplatesPage />)
    fireEvent.click(screen.getByRole('button', { name: '+ Nueva plantilla' }))
    expect(screen.getByRole('textbox', { name: 'Nombre de la plantilla' })).toBeInTheDocument()
  })
})
