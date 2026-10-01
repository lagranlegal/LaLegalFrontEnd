import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { ExitPage } from '@/components/shared/ExitPage'
import { Button } from '@/components/ui/button'

/** 404 con marca y salida (F9-61): antes decía «vuelve al inicio» sin un enlace para hacerlo, pegado arriba. */
export function NotFoundPage() {
  return (
    <ExitPage
      icon={Compass}
      eyebrow="Error 404"
      title="Esta página no existe"
      actions={
        <>
          <Button asChild size="lg" className="w-full">
            <Link to="/inicio">Ir al inicio</Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => window.history.back()}>
            Volver a la página anterior
          </Button>
        </>
      }
    >
      La dirección no existe o cambió. Si llegaste por un enlace, puede que esté incompleto.
    </ExitPage>
  )
}
