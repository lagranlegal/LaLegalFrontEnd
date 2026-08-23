import { AppDialog } from '@/components/shared/AppDialog'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/dates'
import { formatQuantity, unitAbbr } from '@/lib/inventory/units'
import { useTransformation, type Transformation } from '@/features/inventory/api'

type Pieza = Transformation['consumed'][number]

/** Cantidades en milésimas: el backend manda `numeric(14,3)`, así que la
 *  aritmética entera es exacta y no hace falta arrastrar floats. */
function enMilesimas(cantidad: string): number {
  return Math.round(Number(cantidad) * 1000)
}

/**
 * Merma del proceso: lo que entró menos lo que salió.
 *
 * SOLO se calcula cuando todo comparte una misma unidad. Fundir tres prendas
 * medidas en gramos y sacar gramos de oro es comparable; despiezar un celular
 * (1 unidad) en pantalla, batería y carcasa (3 unidades) no lo es — ahí "salió
 * más de lo que entró" sería una lectura sin sentido, y mostrar el número
 * igual invitaría a interpretarlo mal.
 */
function calcularMerma(consumidos: Pieza[], producidos: Pieza[]): { valor: number; unidad: string } | null {
  const piezas = [...consumidos, ...producidos]
  const primera = piezas[0]
  if (primera === undefined) return null
  const unidad = primera.unit
  if (unidad === 'unit' || piezas.some((p) => p.unit !== unidad)) return null

  const entra = consumidos.reduce((total, p) => total + enMilesimas(p.quantity), 0)
  const sale = producidos.reduce((total, p) => total + enMilesimas(p.quantity), 0)
  return { valor: (entra - sale) / 1000, unidad }
}

function TablaPiezas({ titulo, piezas, vacio }: { titulo: string; piezas: Pieza[]; vacio: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-foreground">{titulo}</h3>
      {piezas.length === 0 ? (
        <p className="text-xs text-muted-foreground">{vacio}</p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Código</th>
                <th className="px-3 py-2 text-left font-medium">Artículo</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Costo unitario</th>
              </tr>
            </thead>
            <tbody>
              {piezas.map((pieza) => (
                <tr key={pieza.id} className="border-b border-border/60 last:border-0">
                  {/* El código de lo consumido SIGUE EXISTIENDO: es inmutable
                      y esa pieza existió. Borrarlo borraría la historia. */}
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{pieza.code ?? '—'}</td>
                  <td className="px-3 py-2 text-foreground">{pieza.name}</td>
                  <td className="px-3 py-2 text-right tnum">{formatQuantity(pieza.quantity, pieza.unit)}</td>
                  <td className="px-3 py-2 text-right">
                    <Money value={pieza.cost} className="tnum" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/**
 * Detalle de una transformación: qué entró, qué salió y cómo viajó el costo.
 *
 * La pregunta que responde es "¿de dónde salió este oro?", y la contesta con
 * los códigos de las piezas consumidas — que es lo que permite seguir la
 * cadena hacia atrás hasta el contrato del cliente si la pieza vino de un
 * remate.
 *
 * OJO con las cantidades de lo consumido: son las del LOTE HOY, no las que se
 * consumieron ese día. Un lote transformado por completo quedó en cero, así
 * que la columna muestra cero. Es información honesta —ese lote ya no está—
 * pero no es "cuánto entró al crisol", y por eso la nota al pie lo dice en vez
 * de dejar que alguien lo lea mal.
 */
export function TransformationDetailDialog({
  open,
  onOpenChange,
  transformationId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  transformationId: string
}) {
  const { data, isPending, isError, refetch } = useTransformation(transformationId)
  const merma = data ? calcularMerma(data.consumed, data.produced) : null

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={data ? `Transformación #${data.number}` : 'Transformación'}
      description={data ? formatDate(data.transform_date) : undefined}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {isPending && <div className="h-48 animate-pulse rounded-card bg-muted/40" />}

        {isError && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-danger">No se pudo cargar la transformación.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-card bg-muted/40 px-3 py-2.5 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Costo que viajó</p>
                <Money value={data.total_cost} className="font-semibold text-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo del proceso</p>
                <Money value={data.extra_cost} className="font-medium text-foreground" />
              </div>
              {merma !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">Merma</p>
                  <p className="font-medium text-foreground tnum">
                    {formatQuantity(String(merma.valor))} {unitAbbr(merma.unidad)}
                  </p>
                </div>
              )}
            </div>

            {data.notes && <p className="text-sm text-muted-foreground">{data.notes}</p>}

            <TablaPiezas
              titulo="Entró al proceso"
              piezas={data.consumed}
              vacio="Sin artículos consumidos."
            />
            <TablaPiezas titulo="Salió del proceso" piezas={data.produced} vacio="Sin artículos producidos." />

            <p className="rounded-card bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              El costo de lo que salió es el de lo que entró más el del proceso:{' '}
              <strong className="text-foreground">ni se pierde ni se inventa</strong>. La merma no se registra como
              pérdida — al repartirse el mismo costo entre menos cantidad, el costo unitario sube, que es exactamente lo
              que pasó.
              <br />
              Las cantidades de lo consumido son las que ese lote tiene <strong className="text-foreground">hoy</strong>
              : un lote transformado por completo quedó en cero.
            </p>
          </>
        )}
      </div>
    </AppDialog>
  )
}
