import { Mail, MapPin, Phone } from 'lucide-react'
import { useMe } from '@/lib/auth/me'

/**
 * Pie de página real, no una línea de crédito (28/08/2026 — feedback directo:
 * "quiero que el footer sea de una página profesional, grande, que
 * contraste"). Reusa los tokens del sidebar (`bg-sidebar`) a propósito: cierra
 * visualmente cada pantalla igual que el costado la abre, en vez de inventar
 * un tercer tono oscuro.
 *
 * Los datos de la empresa (`me.company`) se muestran solo si existen — nada
 * inventado. Una empresa que todavía no cargó su NIT/dirección en
 * /configuracion sigue viendo un pie completo (marca + copyright), sin
 * columnas rotas ni "—" donde falta un dato.
 */
export function AppFooter() {
  const { data: me } = useMe()
  const company = me?.company
  const year = new Date().getFullYear()

  const hasLegalInfo = !!(company?.legal_name || company?.tax_id || company?.address || company?.contact_phone)

  return (
    <footer className="border-t border-sidebar-border bg-sidebar text-sidebar-foreground print:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {/* Marca */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-input bg-sidebar-primary text-base font-bold text-primary-foreground">
              {(company?.name ?? 'C').charAt(0).toUpperCase()}
            </span>
            <span className="text-base font-semibold text-sidebar-foreground/95">{company?.name ?? 'Compraventa'}</span>
          </div>
          <p className="max-w-xs text-sm text-sidebar-foreground/60">
            Sistema de gestión para casas de empeño y tiendas — cartera, inventario, caja y reportes en un solo lugar.
          </p>
        </div>

        {/* Datos de la empresa — solo lo que exista */}
        {hasLegalInfo && (
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-sidebar-foreground/50 uppercase">Datos de la empresa</h3>
            {company?.legal_name && <p className="text-sidebar-foreground/80">{company.legal_name}</p>}
            {company?.tax_id && <p className="text-sidebar-foreground/60">NIT {company.tax_id}</p>}
            {company?.address && (
              <p className="flex items-start gap-1.5 text-sidebar-foreground/60">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                {company.address}
              </p>
            )}
          </div>
        )}

        {/* Contacto */}
        {(company?.contact_phone || me?.user.email) && (
          <div className="flex flex-col gap-2 text-sm">
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-sidebar-foreground/50 uppercase">Contacto</h3>
            {company?.contact_phone && (
              <a href={`tel:${company.contact_phone}`} className="flex items-center gap-1.5 text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground">
                <Phone className="size-3.5 shrink-0" />
                {company.contact_phone}
              </a>
            )}
            {me?.user.email && (
              <a href={`mailto:${me.user.email}`} className="flex items-center gap-1.5 text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground">
                <Mail className="size-3.5 shrink-0" />
                {me.user.email}
              </a>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-sidebar-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-sidebar-foreground/45 sm:flex-row">
          <span>
            © {year} {company?.legal_name ?? company?.name ?? 'Compraventa'}. Todos los derechos reservados.
          </span>
          <span>{me?.role.name ? `Sesión: ${me.user.full_name} · ${me.role.name}` : null}</span>
        </div>
      </div>
    </footer>
  )
}
