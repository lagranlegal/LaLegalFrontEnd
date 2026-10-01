import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

/** 404 con salida (F9-61): antes decía «vuelve al inicio» sin un enlace para hacerlo. */
export function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-page">
      <div className="w-full max-w-md rounded-card border border-border bg-card p-card text-center">
        <h1 className="text-xl font-semibold text-foreground">Página no encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">La dirección no existe o cambió. Revisa la URL o vuelve al inicio.</p>
        <Button asChild className="mt-4 rounded-pill">
          <Link to="/inicio">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  )
}
