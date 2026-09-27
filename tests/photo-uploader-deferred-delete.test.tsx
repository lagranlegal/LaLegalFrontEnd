import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

/**
 * QA 03 H-04: quitar una foto con la X la borraba de Storage al instante.
 * En una edición, quitar + Cancelar dejaba la ficha (cédula, logo, firma,
 * contrato firmado) apuntando a un archivo inexistente. El borrado físico va
 * SOLO después de guardar, y solo de lo que vive en la carpeta de la entidad.
 */

const deleteCompanyPhoto = vi.fn(() => Promise.resolve())

vi.mock('@/lib/storage/photos', () => ({
  deleteCompanyPhoto: (path: string) => deleteCompanyPhoto(path),
  uploadCompanyPhoto: vi.fn(),
  useSignedPhotoUrl: () => ({ data: undefined, isPending: false, isError: false }),
}))
vi.mock('@/lib/auth/me', () => ({ useMe: () => ({ data: { company: { id: 'emp' } } }) }))

const { PhotoUploader } = await import('@/components/shared/PhotoUploader')
const { detachedPhotos, deleteDetachedPhotos } = await import('@/lib/storage/detachedPhotos')

beforeEach(() => deleteCompanyPhoto.mockClear())
afterEach(cleanup)

describe('PhotoUploader — la X no borra de Storage', () => {
  it('quitar una foto solo la saca del valor del formulario', () => {
    const onChange = vi.fn()
    render(<PhotoUploader value={['emp/customers/c1/cedula.webp']} onChange={onChange} folder="customers/c1" />)

    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }))

    expect(onChange).toHaveBeenCalledWith([])
    expect(deleteCompanyPhoto).not.toHaveBeenCalled()
  })
})

describe('detachedPhotos — qué se borra al guardar', () => {
  it('solo lo que el guardado soltó y vive en la carpeta de la entidad', () => {
    const antes = [
      'emp/inventory/lote1/propia.webp',
      'emp/contract-items/prenda9/del-contrato.webp', // copiada por el remate
      'emp/inventory/lote1/sigue.webp',
    ]
    const despues = ['emp/inventory/lote1/sigue.webp']

    expect(detachedPhotos(antes, despues, 'inventory/lote1')).toEqual(['emp/inventory/lote1/propia.webp'])
  })

  it('una carpeta que empieza igual no es la misma carpeta', () => {
    expect(detachedPhotos(['emp/inventory/lote10/x.webp'], [], 'inventory/lote1')).toEqual([])
  })

  it('acepta los campos de una sola foto (null cuando no hay)', () => {
    expect(detachedPhotos(['emp/company/logo/viejo.webp'], [null], 'company/logo')).toEqual(['emp/company/logo/viejo.webp'])
    expect(detachedPhotos([null], ['emp/company/logo/nuevo.webp'], 'company/logo')).toEqual([])
  })

  it('deleteDetachedPhotos borra exactamente esas', () => {
    deleteDetachedPhotos(['emp/perfil/vieja.webp', 'emp/perfil/nueva.webp'], ['emp/perfil/nueva.webp'], 'perfil')
    expect(deleteCompanyPhoto).toHaveBeenCalledTimes(1)
    expect(deleteCompanyPhoto).toHaveBeenCalledWith('emp/perfil/vieja.webp')
  })
})
