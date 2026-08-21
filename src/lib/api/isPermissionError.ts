import { ApiError } from '@/lib/api/client'

/**
 * ¿Este error es "no tienes permiso" y no "algo se rompió"?
 *
 * Existe porque confundirlos produce mensajes que mandan al usuario a buscar
 * un problema inexistente. El caso real: un rol creado sin permisos hacía que
 * el banner de caja dijera **"Caja cerrada"** —cuando la caja estaba abierta—
 * y que el inventario dijera "no se pudieron cargar los productos". Ninguna de
 * las dos cosas era cierta: faltaba `cashbox.view` e `inventory.view`.
 *
 * La UI oculta según permisos (CLAUDE.md regla 7), pero el backend es la
 * autoridad y puede negar algo que la UI creyó permitido — sobre todo si el
 * rol cambió con la sesión abierta. Cuando eso pasa, hay que decirlo.
 */
export function isPermissionError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'PERMISSION_DENIED'
}
