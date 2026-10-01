import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMe } from '@/lib/auth/me'
import { usePermission } from '@/lib/permissions/usePermission'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { formatLongDate, greetingNow, todayBogota } from '@/lib/dates'

/** «Laura» de «Laura Martínez»: el saludo va con el nombre de pila. */
function firstName(fullName: string | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? ''
}

/**
 * Encabezado del Inicio (rediseño P2-c): saludo según la hora de la empresa,
 * la fecha larga y las dos puertas del mostrador, cada una con su permiso. Un
 * solo primario dorado: «Nuevo contrato»; la venta va de secundario.
 */
export function InicioHeader() {
  const { data: me } = useMe()
  const canSell = usePermission('sales.create')
  const canLend = usePermission('contracts.create')
  const name = firstName(me?.user.full_name)

  return (
    <PageHeader
      title={name ? `${greetingNow()}, ${name}` : greetingNow()}
      description={formatLongDate(todayBogota())}
      actions={
        canSell || canLend ? (
          <>
            {canSell && (
              <Button variant="outline" asChild>
                <Link to="/ventas/nueva">Nueva venta</Link>
              </Button>
            )}
            {canLend && (
              <Button asChild>
                <Link to="/contratos/nuevo">
                  <Plus aria-hidden />
                  Nuevo contrato
                </Link>
              </Button>
            )}
          </>
        ) : undefined
      }
    />
  )
}
