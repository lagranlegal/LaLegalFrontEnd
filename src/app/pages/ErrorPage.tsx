import type { ErrorComponentProps } from '@tanstack/react-router'
import { CloudOff } from 'lucide-react'
import { ExitPage } from '@/components/shared/ExitPage'
import { Button } from '@/components/ui/button'

/**
 * Red de seguridad para errores no capturados por una ruta específica
 * (CLAUDE.md regla 12: toda vista con datos tiene error con reintento) —
 * típicamente `NetworkError` durante el bootstrap de `/me`. El mensaje técnico
 * va chico al pie, para soporte; el titular dice qué hacer.
 */
export function ErrorPage({ error, reset }: ErrorComponentProps) {
  return (
    <ExitPage
      icon={CloudOff}
      tone="danger"
      title="No se pudo cargar Prendo"
      detail={error.message ? `Detalle: ${error.message}` : undefined}
      actions={
        <>
          <Button size="lg" className="w-full" onClick={() => reset()}>
            Reintentar
          </Button>
          {/* Recarga completa a propósito: si el error vino del router, un
              `Link` dentro del mismo router puede volver a caer en él. */}
          <Button asChild variant="ghost" className="w-full">
            <a href="/inicio">Ir al inicio</a>
          </Button>
        </>
      }
    >
      Puede ser la conexión o el servidor, que tardó en responder. Revisa tu internet y vuelve a intentar; lo que ya registraste no se pierde.
    </ExitPage>
  )
}
