import { useMe } from '@/lib/auth/me'

/**
 * Pie de página — discreto a propósito (29/08/2026, segunda vuelta: el
 * primer intento era un bloque oscuro de 3 columnas con ícono de marca;
 * feedback directo de Mateo: "muy invasivo, se ve raro"). Una sola línea,
 * mismo fondo que el resto del contenido (`bg-card`, no un tono oscuro
 * inventado), separada por un borde — cierra la página sin competir con
 * ella.
 *
 * Los datos de la empresa (`me.company`) se muestran solo si existen — nada
 * inventado. Sin ellos, la línea queda en solo nombre + copyright.
 */
export function AppFooter() {
  const { data: me } = useMe()
  const company = me?.company
  const year = new Date().getFullYear()
  const name = company?.legal_name ?? company?.name ?? 'Compraventa'

  return (
    <footer className="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1.5 sm:flex-row">
        <span>
          © {year} {name}
          {company?.tax_id && <span className="hidden sm:inline"> · NIT {company.tax_id}</span>}
        </span>
        {company?.contact_phone ? (
          <a href={`tel:${company.contact_phone}`} className="transition-colors hover:text-foreground">
            {company.contact_phone}
          </a>
        ) : (
          <span>Sistema de gestión para compraventas</span>
        )}
      </div>
    </footer>
  )
}
