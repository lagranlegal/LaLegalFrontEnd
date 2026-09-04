import { useState } from 'react'
import { toast } from 'sonner'
import { BackLink } from '@/components/shared/BackLink'
import { PageHeader } from '@/components/shared/PageHeader'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { useMe, useUpdateMe } from '@/lib/auth/me'
import { useChangeOwnPassword, WrongCurrentPasswordError, setPasswordErrorMessage } from '@/features/auth/api'

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * Perfil del usuario — `PATCH /me` (backend 02/09/2026). Solo lo que uno
 * puede cambiar de sí mismo: nombre y foto.
 *
 * El correo se muestra pero NO se edita: es la identidad de Supabase Auth y
 * cambiarlo es otro flujo (con verificación). El rol tampoco: cambiarlo es
 * gestión de identidad y vive en `/identidad`, con su permiso — mostrarlo
 * acá como campo editable prometería algo que el backend rechaza.
 */
export function ProfilePage() {
  const { data: me } = useMe()
  const updateMe = useUpdateMe()

  const [fullName, setFullName] = useState(me?.user.full_name ?? '')
  const [photos, setPhotos] = useState<string[]>(me?.user.photo_url ? [me.user.photo_url] : [])
  const [formError, setFormError] = useState<string | null>(null)

  const nameMissing = !fullName.trim()
  const dirty = fullName.trim() !== (me?.user.full_name ?? '') || (photos[0] ?? null) !== (me?.user.photo_url ?? null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (nameMissing) return
    try {
      await updateMe.mutateAsync({ full_name: fullName.trim(), photo_url: photos[0] ?? null })
      toast.success('Perfil actualizado.')
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'No se pudo guardar. Intenta de nuevo.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/configuracion" label="Configuración" />
      <PageHeader title="Mi perfil" description="Tu nombre y tu foto — lo que ve el resto del equipo." />

      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card" noValidate>
        <div>
          <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
            Nombre
          </label>
          <input id="profile-name" className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          {nameMissing && <p className="mt-1 text-sm text-danger">El nombre no puede quedar vacío.</p>}
        </div>

        <div>
          <span className="text-sm font-medium text-foreground">Foto</span>
          <div className="mt-1">
            <PhotoUploader value={photos} onChange={setPhotos} folder="perfil" maxPhotos={1} />
          </div>
        </div>

        {/* Solo lectura, con el porqué a la vista: sin esto, "¿y mi correo?"
            se convierte en un ticket. */}
        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <span className="text-xs text-muted-foreground">Correo</span>
            <p className="text-sm text-foreground">{me?.user.email}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Se cambia desde el correo de acceso, no desde acá.</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Rol</span>
            <p className="text-sm text-foreground">{me?.role.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Lo asigna un administrador desde Identidad.</p>
          </div>
        </div>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

        <div className="flex justify-end">
          <Button type="submit" className="rounded-pill" disabled={updateMe.isPending || nameMissing || !dirty}>
            {updateMe.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </form>

      <ChangePasswordCard />
    </div>
  )
}

/**
 * Cambiar la propia contraseña. No existía en ninguna parte de la app: quien
 * quería cambiarla dependía del correo de recuperación (limitado a unos pocos
 * envíos por hora) o de pedirle un enlace al administrador — que es una
 * credencial que el administrador también ve.
 *
 * Va en una tarjeta aparte y no dentro del formulario del perfil a propósito:
 * son dos guardados distintos, con dos consecuencias distintas, y mezclarlos
 * haría que "Guardar cambios" a veces te cambie la contraseña.
 */
function ChangePasswordCard() {
  const cambiar = useChangeOwnPassword()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [error, setError] = useState<string | null>(null)

  const cortaDeMas = nueva.length > 0 && nueva.length < 8
  const noCoinciden = confirmacion.length > 0 && nueva !== confirmacion
  const listo = actual.length > 0 && nueva.length >= 8 && nueva === confirmacion

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!listo) return
    try {
      await cambiar.mutateAsync({ currentPassword: actual, newPassword: nueva })
      setActual('')
      setNueva('')
      setConfirmacion('')
      toast.success('Tu contraseña quedó cambiada.')
    } catch (err) {
      setError(err instanceof WrongCurrentPasswordError ? err.message : setPasswordErrorMessage(err))
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card" noValidate>
      <div>
        <h2 className="text-sm font-medium text-foreground">Cambiar mi contraseña</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Se te pide la actual para que nadie pueda cambiarla desde tu pantalla si la dejas abierta.
        </p>
      </div>

      <div>
        <label htmlFor="pwd-actual" className="text-sm font-medium text-foreground">
          Contraseña actual
        </label>
        <input id="pwd-actual" type="password" autoComplete="current-password" className={inputClass} value={actual} onChange={(e) => setActual(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pwd-nueva" className="text-sm font-medium text-foreground">
            Contraseña nueva
          </label>
          <input id="pwd-nueva" type="password" autoComplete="new-password" className={inputClass} value={nueva} onChange={(e) => setNueva(e.target.value)} />
          {cortaDeMas && <p className="mt-1 text-sm text-danger">Mínimo 8 caracteres.</p>}
        </div>
        <div>
          <label htmlFor="pwd-confirmar" className="text-sm font-medium text-foreground">
            Confirmar contraseña nueva
          </label>
          <input id="pwd-confirmar" type="password" autoComplete="new-password" className={inputClass} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
          {noCoinciden && <p className="mt-1 text-sm text-danger">Las contraseñas no coinciden.</p>}
        </div>
      </div>

      {error && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="flex justify-end">
        <Button type="submit" className="rounded-pill" disabled={cambiar.isPending || !listo}>
          {cambiar.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  )
}
