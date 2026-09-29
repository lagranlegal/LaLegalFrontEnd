import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * F8-14 (auditoría de QA, 00065 del backend): en `perfil/` cada usuario
 * escribe solo su carpeta — `{empresa}/perfil/{user_id}/{archivo}` — y solo
 * nombres de imagen (.webp/.jpg/.jpeg/.png). La ruta vieja de tres partes
 * (`{empresa}/perfil/{archivo}`) la política nueva la rechaza con 403.
 * La ruta con el id del usuario también la acepta la política vieja
 * (exigía `≥ 3` partes y membresía activa), así que sirve con los dos
 * backends.
 */

const uploadCompanyPhoto = vi.fn((companyId: string, folder: string) =>
  Promise.resolve(`${companyId}/${folder}/nueva.webp`),
)
const deleteCompanyPhoto = vi.fn(() => Promise.resolve())

vi.mock('@/lib/storage/photos', () => ({
  uploadCompanyPhoto: (companyId: string, folder: string) => uploadCompanyPhoto(companyId, folder),
  deleteCompanyPhoto: (path: string) => deleteCompanyPhoto(path),
  useSignedPhotoUrl: () => ({ data: undefined, isPending: false, isError: false }),
}))

const mutateAsync = vi.fn(() => Promise.resolve({}))
const me = {
  user: { id: 'u1', full_name: 'Ana', email: 'ana@example.test', photo_url: null as string | null },
  company: { id: 'emp' },
  role: { name: 'Asesor' },
}
vi.mock('@/lib/auth/me', () => ({
  useMe: () => ({ data: me }),
  useUpdateMe: () => ({ mutateAsync, isPending: false }),
}))
vi.mock('@/features/auth/api', () => ({
  useChangeOwnPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
  WrongCurrentPasswordError: class extends Error {},
  setPasswordErrorMessage: () => '',
}))
vi.mock('@/components/shared/BackLink', () => ({ BackLink: () => null }))
const storageUpload = vi.fn((_path: string, _file: Blob, _opts: { contentType: string }) => Promise.resolve({ error: null }))
vi.mock('@/lib/auth/supabase', () => ({
  supabase: { storage: { from: () => ({ upload: storageUpload }) } },
}))
vi.mock('@/lib/storage/compressImage', () => ({ compressImage: (f: File) => Promise.resolve(f) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const { ProfilePage } = await import('@/features/settings/pages/ProfilePage')

beforeEach(() => {
  uploadCompanyPhoto.mockClear()
  deleteCompanyPhoto.mockClear()
  mutateAsync.mockClear()
  me.user.photo_url = null
})
afterEach(cleanup)

describe('Mi perfil — la foto va a la carpeta del usuario', () => {
  it('sube a perfil/{user_id}, no a perfil/ (sin foto previa: el cupo es de una)', async () => {
    const { container } = render(<ProfilePage />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'yo.png', { type: 'image/png' })] } })

    await waitFor(() => expect(uploadCompanyPhoto).toHaveBeenCalledTimes(1))
    expect(uploadCompanyPhoto).toHaveBeenCalledWith('emp', 'perfil/u1')
  })

  it('al guardar borra la foto anterior de SU carpeta', async () => {
    me.user.photo_url = 'emp/perfil/u1/vieja.webp'
    const { container } = render(<ProfilePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }))
    fireEvent.submit(container.querySelector('form') as HTMLFormElement)

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ full_name: 'Ana', photo_url: null }))
    await waitFor(() => expect(deleteCompanyPhoto).toHaveBeenCalledWith('emp/perfil/u1/vieja.webp'))
  })
})

describe('uploadCompanyPhoto — el nombre que exige la política', () => {
  it('arma {empresa}/{carpeta}/{uuid}.webp con image/webp, venga el archivo en el formato que venga', async () => {
    const real = await vi.importActual<typeof import('@/lib/storage/photos')>('@/lib/storage/photos')
    const path = await real.uploadCompanyPhoto('emp', 'perfil/u1', new File(['x'], 'yo.PNG', { type: 'image/png' }))

    expect(path).toMatch(/^emp\/perfil\/u1\/[0-9a-f-]{36}\.webp$/)
    expect(storageUpload.mock.calls[0]?.[0]).toBe(path)
    expect(storageUpload.mock.calls[0]?.[2]).toEqual({ contentType: 'image/webp' })
  })
})
