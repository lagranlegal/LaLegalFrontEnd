import { useMe } from '@/lib/auth/me'
import { usePermission } from '@/lib/permissions/usePermission'
import { joinSpanish, missingCompanyFields } from '@/lib/documents/companyData'
import { cn } from '@/lib/utils'

/**
 * Aviso junto a un botón de imprimir cuando faltan datos de la empresa
 * (F8-10). No bloquea la impresión —el documento sirve igual—, pero lo dice
 * ANTES de imprimir en vez de dejar el hueco en silencio en el papel.
 */
export function CompanyDataNotice({ className }: { className?: string }) {
  const { data: me } = useMe()
  // F9-36: solo a quien lo puede arreglar. Para el asesor era ruido en cada
  // comprobante, sobre algo que no puede cambiar.
  const canConfigure = usePermission('company.configure')
  const faltan = missingCompanyFields(me?.company)
  if (!canConfigure || faltan.length === 0) return null
  return (
    <p role="status" className={cn('rounded-input bg-warning-soft px-3 py-2 text-xs text-foreground', className)}>
      Al documento le {faltan.length === 1 ? 'falta' : 'faltan'} {joinSpanish(faltan)} de la empresa: {faltan.length === 1 ? 'saldrá' : 'saldrán'} en
      blanco. Completa los datos de la empresa en Configuración.
    </p>
  )
}
