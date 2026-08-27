import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { KpiCard, KpiRow } from '@/components/shared/KpiCard'
import { Money } from '@/components/shared/Money'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/dates'
import { usePayables, useInventoryValuation, useStaleInventory } from '@/features/reports/api'

const STALE_THRESHOLDS = [60, 90, 180, 365]

function SectionSkeleton() {
  return <div className="h-32 animate-pulse rounded-card border border-border bg-border" />
}

/**
 * Cuentas por pagar — el primer reporte que pediría un contador.
 *
 * El dato vivía en cada compra desde 00020 (`paid_at`) y ninguna pantalla lo
 * sumaba: había que abrir los ingresos uno por uno para saber cuánto se debe.
 *
 * La antigüedad va en tramos porque una deuda de hace tres meses y una de
 * ayer no son el mismo problema, aunque sumen igual. El proveedor con la
 * deuda más vieja aparece primero en la lectura, no el que más debe.
 */
function PayablesCard() {
  const { data, isPending, isError, refetch } = usePayables()

  if (isPending) return <SectionSkeleton />
  if (isError || !data) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-card border border-border bg-card p-card">
        <p className="text-sm text-danger">No se pudieron cargar las cuentas por pagar.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (data.entry_count === 0) {
    return (
      <div className="rounded-card border border-border bg-card shadow-card">
        <EmptyState title="No le debes nada a ningún proveedor" description="Todas las compras registradas están pagadas." />
      </div>
    )
  }

  const vencido = Number(data.days_over_60) > 0

  return (
    <div className="flex flex-col gap-3">
      <KpiRow>
        <KpiCard
          label="Total por pagar"
          value={<Money value={data.total} />}
          tone="danger"
          hint={`${data.entry_count} compra(s) · al ${formatDate(data.as_of)}`}
        />
        <KpiCard label="0 a 30 días" value={<Money value={data.days_0_30} />} hint="Al día" />
        <KpiCard label="31 a 60 días" value={<Money value={data.days_31_60} />} hint="Vigilar" />
        <KpiCard
          label="Más de 60 días"
          value={<Money value={data.days_over_60} />}
          tone={vencido ? 'danger' : 'default'}
          hint={vencido ? 'Atender primero' : 'Nada vencido'}
        />
      </KpiRow>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Proveedor</th>
              <th className="px-3 py-2 text-right font-medium">Compras</th>
              <th className="px-3 py-2 text-left font-medium">Más antigua</th>
              <th className="px-3 py-2 text-right font-medium">+60 días</th>
              <th className="px-3 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.by_supplier.map((s) => (
              <tr key={s.supplier_id ?? 'sin-proveedor'} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2">
                  {/* Enlaza a la ficha: el siguiente paso natural después de
                      ver que se le debe es mirar qué se le compró. */}
                  {s.supplier_id ? (
                    <Link to="/proveedores/$supplierId" params={{ supplierId: s.supplier_id }} className="text-primary hover:underline">
                      {s.supplier_name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{s.supplier_name}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tnum text-muted-foreground">{s.entry_count}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.oldest_entry_date ? formatDate(s.oldest_entry_date) : '—'}</td>
                <td className="px-3 py-2 text-right">
                  <Money value={s.days_over_60} className={cn(Number(s.days_over_60) > 0 && 'font-medium text-danger')} />
                </td>
                <td className="px-3 py-2 text-right">
                  <Money value={s.total} className="font-medium text-foreground" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Valorización del inventario — el activo más grande del negocio.
 *
 * Se muestra el valor AL COSTO como cifra principal, que es la correcta
 * contablemente. El valor a precio de venta va al lado y etiquetado como
 * referencia: contar la utilidad antes de venderla es el error clásico, y
 * poner esa cifra primero invitaría a cometerlo.
 */
function ValuationCard() {
  const { data, isPending, isError, refetch } = useInventoryValuation()

  if (isPending) return <SectionSkeleton />
  if (isError || !data) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-card border border-border bg-card p-card">
        <p className="text-sm text-danger">No se pudo cargar la valorización del inventario.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }

  const enPerdida = Number(data.potential_profit) < 0

  return (
    <div className="flex flex-col gap-3">
      <KpiRow>
        <KpiCard
          label="Valor al costo"
          value={<Money value={data.cost_value} />}
          tone="brand"
          hint={`${data.units} unidad(es) en ${data.lot_count} lote(s)`}
        />
        <KpiCard label="A precio de venta" value={<Money value={data.retail_value} />} hint="Referencia, no valorización" />
        <KpiCard
          label="Utilidad potencial"
          value={<Money value={data.potential_profit} />}
          tone={enPerdida ? 'danger' : 'success'}
          // Negativa significa que hay mercancía por debajo del costo. Es
          // información, no un error, y por eso se muestra en vez de taparla.
          hint={enPerdida ? 'Hay mercancía por debajo del costo' : 'Si se vendiera todo hoy'}
        />
      </KpiRow>

      {data.by_category.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Categoría</th>
                <th className="px-3 py-2 text-right font-medium">Unidades</th>
                <th className="px-3 py-2 text-right font-medium">Al costo</th>
                <th className="px-3 py-2 text-right font-medium">A precio de venta</th>
              </tr>
            </thead>
            <tbody>
              {data.by_category.map((c) => (
                <tr key={c.cat1_id ?? 'sin-categoria'} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 text-foreground">{c.cat1_name}</td>
                  <td className="px-3 py-2 text-right tnum text-muted-foreground">{c.units}</td>
                  <td className="px-3 py-2 text-right">
                    <Money value={c.cost_value} className="font-medium text-foreground" />
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    <Money value={c.retail_value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Mercancía sin rotación — plata congelada en la vitrina.
 *
 * El umbral es ajustable porque "mucho tiempo" depende del negocio: una
 * cadena de oro que lleva seis meses es normal, un celular que lleva tres es
 * un problema. Fijarlo en el código habría hecho el reporte inútil para la
 * mitad del inventario.
 */
function StaleCard() {
  const [threshold, setThreshold] = useState(90)
  const { data, isPending, isError, refetch } = useStaleInventory(threshold)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Sin venderse hace más de</span>
        {STALE_THRESHOLDS.map((dias) => (
          <button
            key={dias}
            type="button"
            onClick={() => setThreshold(dias)}
            className={cn(
              'rounded-pill px-3 py-1 text-sm font-medium transition-colors',
              threshold === dias ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {dias} días
          </button>
        ))}
      </div>

      {isPending && <SectionSkeleton />}

      {isError && (
        <div className="flex flex-col items-start gap-2 rounded-card border border-border bg-card p-card">
          <p className="text-sm text-danger">No se pudo cargar la mercancía sin rotación.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {data && data.items.length === 0 && (
        <div className="rounded-card border border-border bg-card shadow-card">
          <EmptyState
            title={`Nada lleva más de ${threshold} días sin venderse`}
            description="Todo el inventario disponible tiene rotación reciente."
          />
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{data.product_count}</strong> producto(s) con{' '}
            <Money value={data.total_cost_value} className="font-medium text-foreground" /> en costo detenido.
          </p>
          <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Producto</th>
                  <th className="px-3 py-2 text-right font-medium">Unidades</th>
                  <th className="px-3 py-2 text-right font-medium">Días</th>
                  <th className="px-3 py-2 text-right font-medium">Costo detenido</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.product_id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <span className="text-foreground">{p.product_name}</span>
                      {p.product_code && <span className="ml-2 font-mono text-xs text-muted-foreground">{p.product_code}</span>}
                    </td>
                    <td className="px-3 py-2 text-right tnum text-muted-foreground">{p.units}</td>
                    <td className="px-3 py-2 text-right tnum font-medium text-warning">{p.days_in_stock}</td>
                    <td className="px-3 py-2 text-right">
                      <Money value={p.cost_value} className="font-medium text-foreground" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Los reportes que responden preguntas de contador, agrupados aparte del
 * resumen financiero del período.
 *
 * Van juntos y sin selector de fechas a propósito: los tres son una FOTO DE
 * HOY, no un resumen de un rango. "¿Cuánto debo?" y "¿cuánto tengo en
 * mercancía?" no tienen versión "en marzo" — o se debe hoy, o no se debe.
 */
export function ContablesSection() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Cuentas por pagar</h2>
          <p className="text-xs text-muted-foreground">Lo que le debes a proveedores, por antigüedad de la compra.</p>
        </div>
        <PayablesCard />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Valor del inventario</h2>
          <p className="text-xs text-muted-foreground">
            Al costo — es el activo, no lo que se cobraría por él. Solo cuenta la mercancía disponible para vender.
          </p>
        </div>
        <ValuationCard />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Mercancía sin rotación</h2>
          <p className="text-xs text-muted-foreground">Plata congelada en la vitrina — la base para decidir un descuento o un remate.</p>
        </div>
        <StaleCard />
      </section>
    </div>
  )
}
