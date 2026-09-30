import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

/**
 * "Volver" arriba de una pantalla de detalle o de un formulario de página
 * completa (auditoría de UX del 27/08/2026, punto 9) — antes cada pantalla lo copiaba
 * a mano (o no lo tenía) con implementaciones ligeramente distintas. Un solo
 * componente para que todas se vean y se comporten igual.
 */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="size-4" /> {label}
    </Link>
  )
}
