import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/dates'
import { formatQuantity } from '@/lib/inventory/units'
import { entryOriginLabel, exitTypeLabel } from '@/lib/inventory/entryTypes'
import { useProductKardex, type KardexLine } from '@/features/inventory/api'

/**
 * Qué causó el movimiento, en las palabras del negocio.
 *
 * `kind` dice de qué tabla salió y `kind_detail` el subtipo; juntos son lo que
 * alguien reconocería. "Ingreso" a secas no distingue una compra de un
 * sobrante de conteo, y esa diferencia es justo la que se viene a mirar.
 */
function tituloMovimiento(linea: KardexLine): string {
  switch (linea.kind) {
    case 'entry':
      return entryOriginLabel(linea.kind_detail)
    case 'exit':
      return exitTypeLabel(linea.kind_detail)
    case 'sale':
      return 'Venta'
    case 'sale_void':
      return 'Venta anulada'
    case 'sale_return':
      return 'Devolución de cliente'
  }
}

/** Verde lo que suma, rojo lo que resta — se recorre la columna sin leer. */
function toneOf(linea: KardexLine): 'in' | 'out' {
  return Number(linea.quantity_in) > 0 ? 'in' : 'out'
}

/**
 * Kardex de un producto — el libro auxiliar de inventario.
 *
 * Responde la pregunta que la app no podía responder: **"¿qué pasó con este
 * producto?"**. Los movimientos existían repartidos en tres tablas que solo se
 * consultaban hacia adelante (dado un ingreso, qué trajo); nadie los unía.
 *
 * DOS COLUMNAS DE SALDO, y no son redundantes. Las unidades dicen cuánto hay;
 * el costo dice cuánto vale lo que hay — y **no se deriva de las unidades**:
 * cada lote conserva su costo real (identificación específica, NIIF), así que
 * tres unidades pueden valer 360.000 o 300.000 según de qué lote salgan. Es la
 * misma razón por la que la lista de productos muestra un RANGO de costos y
 * nunca un promedio.
 *
 * Se muestra el LOTE en cada línea porque el producto es la agrupación, pero
 * el movimiento siempre es de un lote concreto: sin eso, dos salidas del mismo
 * producto a costos distintos parecerían un error de cálculo.
 */
export function KardexDialog({
  open,
  onOpenChange,
  productId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
}) {
  const { data, isPending, isError, refetch } = useProductKardex(productId)

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={data ? `Kardex — ${data.name}` : 'Kardex'}
      description="Todo lo que le pasó a este producto, en orden."
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {isPending && <div className="h-56 animate-pulse rounded-card bg-muted/40" />}

        {isError && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-danger">No se pudo cargar el kardex.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-card bg-muted/40 px-3 py-2.5 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Entró</p>
                <p className="font-medium text-success tnum">{formatQuantity(data.total_in, data.unit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Salió</p>
                <p className="font-medium text-danger tnum">{formatQuantity(data.total_out, data.unit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Existencia</p>
                <p className="font-semibold text-foreground tnum">
                  {formatQuantity(data.closing_quantity, data.unit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo de lo que queda</p>
                <Money value={data.closing_value} className="font-semibold text-foreground" />
              </div>
            </div>

            {data.lines.length === 0 ? (
              <EmptyState
                title="Este producto no tiene movimientos"
                description="Aparecerán acá en cuanto entre o salga mercancía."
              />
            ) : (
              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium">Movimiento</th>
                      <th className="px-3 py-2 text-left font-medium">Lote</th>
                      <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                      <th className="px-3 py-2 text-right font-medium">Costo unit.</th>
                      <th className="px-3 py-2 text-right font-medium">Saldo</th>
                      <th className="px-3 py-2 text-right font-medium">Costo del saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((linea) => {
                      const tono = toneOf(linea)
                      const cantidad = tono === 'in' ? linea.quantity_in : linea.quantity_out
                      return (
                        <tr
                          key={`${linea.kind}-${linea.reference_id}-${linea.item_id}`}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {formatDate(linea.date)}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-foreground">{tituloMovimiento(linea)}</span>
                            <span className="ml-1.5 text-xs text-muted-foreground">#{linea.reference_number}</span>
                            {linea.detail && (
                              <span className="block max-w-[28ch] truncate text-xs text-muted-foreground" title={linea.detail}>
                                {linea.detail}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {linea.item_code ?? (linea.lot_number ? `Lote ${linea.lot_number}` : '—')}
                          </td>
                          <td className={cn('px-3 py-2 text-right tnum', tono === 'in' ? 'text-success' : 'text-danger')}>
                            {tono === 'in' ? '+' : '−'}
                            {formatQuantity(cantidad)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Money value={linea.unit_cost} className="tnum text-muted-foreground" />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-foreground tnum">
                            {formatQuantity(linea.running_quantity, data.unit)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Money value={linea.running_value} className="tnum font-medium text-foreground" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p className="rounded-card bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              El <strong className="text-foreground">costo del saldo</strong> no es la existencia por un costo promedio:
              cada lote conserva el suyo, así que es la suma de lo que costó cada unidad que sigue en inventario. Por eso
              cada línea muestra de qué lote salió.
            </p>
          </>
        )}
      </div>
    </AppDialog>
  )
}
