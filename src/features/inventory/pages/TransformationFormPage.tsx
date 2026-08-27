import { useRef, useState } from 'react'
import { useNavigate, useBlocker } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ArrowDown, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { BackLink } from '@/components/shared/BackLink'
import { AppDialog } from '@/components/shared/AppDialog'
import { ItemPicker } from '@/components/shared/ItemPicker'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { confirm } from '@/components/shared/confirmStore'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ApiError } from '@/lib/api/client'
import { useCategories } from '@/lib/catalogs/categories'
import { sumMoney, multiplyMoney } from '@/lib/money'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { SELECTABLE_UNITS, formatQuantity, unitAbbr, unitLabel, type ProductUnit } from '@/lib/inventory/units'
import { useCreateTransformation } from '@/features/inventory/api'
import type { Item } from '@/lib/inventory/items'

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

interface Entrada {
  item: Item
  quantity: string
}

interface Salida {
  key: string
  name: string
  cat1_id: string
  cat2_id: string
  cat3_id: string
  quantity: string
  unit: ProductUnit
  sale_price: string
  estimated_value: string
}

function nuevaSalida(): Salida {
  return {
    key: crypto.randomUUID(),
    name: '',
    cat1_id: '',
    cat2_id: '',
    cat3_id: '',
    quantity: '1',
    unit: 'unit',
    sale_price: '',
    estimated_value: '',
  }
}

/**
 * Fundir, despiezar o armar.
 *
 * TODA la pantalla existe para responder una pregunta antes de confirmar:
 * **¿en cuánto queda cada unidad de lo que sale?** Registrar la operación es
 * lo fácil; saber si convenía es lo que la hace útil. Por eso el panel de
 * resultado no es un resumen decorativo al pie — es el motivo del formulario,
 * y se calcula en vivo mientras se escribe.
 *
 * En una fundición ese número es el costo por gramo: contra el precio del oro
 * del día dice si se ganó o se perdió, y eso hay que verlo ANTES, cuando
 * todavía se puede decidir no fundir.
 *
 * La operación es IRREVERSIBLE —de una barra no salen las tres cadenas otra
 * vez— así que pide confirmación explícita con los números a la vista.
 */
export function TransformationFormPage() {
  const navigate = useNavigate()
  const { data: categories, isPending: categoriesPending } = useCategories()
  const createTransformation = useCreateTransformation()

  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [salidas, setSalidas] = useState<Salida[]>([nuevaSalida()])
  const [extraCost, setExtraCost] = useState('0.00')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [accountId, setAccountId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const submittedRef = useRef(false)

  // Sin este resguardo, salir por el sidebar/atrás perdía la operación
  // armada sin ningún aviso — a diferencia de contratos/ingreso, que sí lo
  // tenían (docs/PENDIENTES_FRONTEND.md #10).
  const blocker = useBlocker({
    shouldBlockFn: () =>
      (entradas.length > 0 || reason.trim().length > 0 || salidas.some((s) => s.name.trim().length > 0)) &&
      !submittedRef.current,
    enableBeforeUnload: true,
    withResolver: true,
  })

  const level1 = (categories ?? []).filter((c) => c.level === 1 && c.active)

  // --- Los números que dan sentido a la pantalla -----------------------
  const costoConsumido = sumMoney(
    ...entradas.map((e) => multiplyMoney(e.item.cost, Number(e.quantity || 0))),
  )
  const costoTotal = sumMoney(costoConsumido, extraCost || '0.00')

  // El reparto espeja `split_cost_by_appraisal` del backend: proporcional al
  // valor estimado, o en partes iguales si nadie lo declaró. Se recalcula acá
  // para poder MOSTRARLO antes de confirmar; el número que queda registrado
  // es siempre el que calcula el backend.
  const valores = salidas.map((s) => Number(s.estimated_value || 0))
  const sumaValores = valores.reduce((a, b) => a + b, 0)
  const repartos = salidas.map((_, i) =>
    sumaValores > 0 ? (Number(costoTotal) * (valores[i] ?? 0)) / sumaValores : Number(costoTotal) / (salidas.length || 1),
  )

  const hayEntradas = entradas.length > 0
  const salidasCompletas = salidas.every((s) => s.name.trim() && s.cat3_id && Number(s.quantity) > 0)
  const puedeGuardar = hayEntradas && salidasCompletas && reason.trim().length > 0

  function agregarEntrada(item: Item) {
    setEntradas((prev) =>
      prev.some((e) => e.item.id === item.id) ? prev : [...prev, { item, quantity: '1' }],
    )
  }

  function actualizarSalida(key: string, cambios: Partial<Salida>) {
    setSalidas((prev) => prev.map((s) => (s.key === key ? { ...s, ...cambios } : s)))
  }

  async function handleSubmit() {
    setFormError(null)
    // Irreversible: se confirma con los números a la vista, no con un "¿estás
    // seguro?" genérico que nadie lee.
    const resultado = await confirm({
      title: '¿Confirmar la transformación?',
      description:
        `Se consumen ${entradas.length} artículo(s) y se crean ${salidas.length}. ` +
        `El costo que viaja es ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(costoTotal))}. ` +
        'Esto no se puede deshacer.',
      tone: 'danger',
      confirmLabel: 'Transformar',
    })
    if (!resultado.confirmed) return

    try {
      const creada = await createTransformation.mutateAsync({
        reason: reason.trim(),
        extra_cost: extraCost || '0.00',
        payment_method: Number(extraCost) > 0 ? paymentMethod : null,
        account_id: Number(extraCost) > 0 ? accountId : null,
        inputs: entradas.map((e) => ({ item_id: e.item.id, quantity: e.quantity })),
        outputs: salidas.map((s) => ({
          name: s.name.trim(),
          cat1_id: s.cat1_id,
          cat2_id: s.cat2_id,
          cat3_id: s.cat3_id,
          quantity: s.quantity,
          unit: s.unit,
          sale_price: Number(s.sale_price) > 0 ? s.sale_price : null,
          estimated_value: Number(s.estimated_value) > 0 ? s.estimated_value : null,
        })),
      })
      submittedRef.current = true
      toast.success(`Transformación #${creada.number} registrada`, {
        description: `${creada.consumed.length} artículo(s) consumidos · ${creada.produced.length} creado(s)`,
      })
      await navigate({ to: '/inventario' })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      setFormError(error instanceof ApiError ? error.message : 'No se pudo registrar la transformación.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/inventario" label="Inventario" />
      <PageHeader
        title="Transformar inventario"
        description="Fundir, despiezar o armar. Lo que costó lo que entra es lo que cuesta lo que sale — el costo no se pierde ni se inventa."
      />

      {/* ---- QUÉ ENTRA ---- */}
      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-card shadow-card">
        <div>
          <h2 className="text-sm font-medium text-foreground">Qué entra</h2>
          <p className="text-xs text-muted-foreground">
            Estos artículos dejan de existir. Se pueden usar borradores: una prenda sin publicar también se funde.
          </p>
        </div>

        <ItemPicker scope="transformable" onSelect={agregarEntrada} placeholder="Buscar artículo a consumir…" />

        {entradas.length === 0 && (
          <p className="rounded-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Agrega al menos un artículo.
          </p>
        )}

        {entradas.map(({ item, quantity }) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-input border border-border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.code && <span className="font-mono">{item.code}</span>}
                <StatusBadge status={item.status} />
                <span>
                  costo <Money value={item.cost} /> / {unitAbbr(item.unit)}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                aria-label={`Cantidad de ${item.name}`}
                className="w-24 rounded-input border border-border bg-background px-2 py-1 text-right text-sm tnum outline-none focus:border-primary"
                value={quantity}
                onChange={(e) =>
                  setEntradas((prev) => prev.map((x) => (x.item.id === item.id ? { ...x, quantity: e.target.value } : x)))
                }
              />
              <span className="w-8 text-xs text-muted-foreground">{unitAbbr(item.unit)}</span>
              <Money value={multiplyMoney(item.cost, Number(quantity || 0))} className="w-28 text-right text-sm font-medium" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Quitar"
                onClick={() => setEntradas((prev) => prev.filter((x) => x.item.id !== item.id))}
              >
                <Trash2 className="size-4 text-danger" />
              </Button>
            </div>
          </div>
        ))}

        {hayEntradas && (
          <p className="text-right text-sm text-muted-foreground">
            Costo que entra <Money value={costoConsumido} className="font-medium text-foreground" />
          </p>
        )}
      </section>

      {/* ---- COSTO DEL PROCESO ---- */}
      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-card shadow-card">
        <div>
          <h2 className="text-sm font-medium text-foreground">Costo del proceso (opcional)</h2>
          <p className="text-xs text-muted-foreground">
            Lo que cobra el fundidor o el técnico. <strong className="text-foreground">Se suma al costo</strong> de lo que sale, no es
            un gasto del mes — igual que el flete de una compra.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-foreground">Cuánto</label>
            <MoneyInput className="mt-1" value={extraCost} onChange={setExtraCost} />
          </div>
          {Number(extraCost) > 0 && (
            <>
              <div>
                <label className="text-sm font-medium text-foreground">Medio de pago</label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue>{PAYMENT_METHOD_LABELS[paymentMethod]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">¿De dónde sale?</label>
                <AccountPicker paymentMethod={paymentMethod} direction="out" value={accountId} onChange={setAccountId} />
              </div>
            </>
          )}
        </div>
      </section>

      <div className="flex justify-center">
        <ArrowDown className="size-5 text-muted-foreground" aria-hidden />
      </div>

      {/* ---- QUÉ SALE ---- */}
      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-foreground">Qué sale</h2>
            <p className="text-xs text-muted-foreground">
              El costo se hereda: no se digita. {salidas.length > 1 && 'Con varias salidas se reparte según el valor estimado de cada una.'}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setSalidas((p) => [...p, nuevaSalida()])}>
            <Plus className="size-4" /> Otra salida
          </Button>
        </div>

        {salidas.map((salida, index) => {
          const level2 = (categories ?? []).filter((c) => c.level === 2 && c.active && c.parent_id === salida.cat1_id)
          const level3 = (categories ?? []).filter((c) => c.level === 3 && c.active && c.parent_id === salida.cat2_id)
          const parte = repartos[index] ?? 0
          const cantidad = Number(salida.quantity || 0)
          const costoUnitario = cantidad > 0 ? parte / cantidad : 0

          return (
            <div key={salida.key} className="flex flex-col gap-3 rounded-input border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Salida {index + 1}</span>
                {salidas.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Quitar salida"
                    onClick={() => setSalidas((p) => p.filter((s) => s.key !== salida.key))}
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-foreground">Nombre</label>
                  <input
                    className={inputClass}
                    value={salida.name}
                    onChange={(e) => actualizarSalida(salida.key, { name: e.target.value })}
                    placeholder="Oro 18k"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Categoría</label>
                  <Select
                    value={salida.cat1_id}
                    onValueChange={(v) => actualizarSalida(salida.key, { cat1_id: v, cat2_id: '', cat3_id: '' })}
                    disabled={categoriesPending}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder={categoriesPending ? 'Cargando…' : 'Selecciona…'} />
                    </SelectTrigger>
                    <SelectContent>
                      {level1.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Subcategoría</label>
                  <Select
                    value={salida.cat2_id}
                    onValueChange={(v) => actualizarSalida(salida.key, { cat2_id: v, cat3_id: '' })}
                    disabled={!salida.cat1_id}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder={salida.cat1_id ? 'Selecciona…' : 'Elige categoría'} />
                    </SelectTrigger>
                    <SelectContent>
                      {level2.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Categoría final</label>
                  <Select
                    value={salida.cat3_id}
                    onValueChange={(v) => actualizarSalida(salida.key, { cat3_id: v })}
                    disabled={!salida.cat2_id}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue placeholder={salida.cat2_id ? 'Selecciona…' : 'Elige subcategoría'} />
                    </SelectTrigger>
                    <SelectContent>
                      {level3.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Cantidad</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      inputMode="decimal"
                      className={`${inputClass} mt-0 flex-1`}
                      value={salida.quantity}
                      onChange={(e) => actualizarSalida(salida.key, { quantity: e.target.value })}
                    />
                    <Select value={salida.unit} onValueChange={(v) => actualizarSalida(salida.key, { unit: v as ProductUnit })}>
                      <SelectTrigger className="w-32">
                        <SelectValue>{unitLabel(salida.unit)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SELECTABLE_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {unitLabel(u)} ({unitAbbr(u)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* La merma no se digita: sale de la diferencia entre lo que
                      entró y lo que se declara acá. */}
                  <p className="mt-1 text-xs text-muted-foreground">Lo que realmente recuperaste. La merma se absorbe sola.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Precio de venta (opcional)</label>
                  <MoneyInput className="mt-1" value={salida.sale_price || '0.00'} onChange={(v) => actualizarSalida(salida.key, { sale_price: v })} />
                </div>

                {salidas.length > 1 && (
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground">Valor estimado (para repartir el costo)</label>
                    <MoneyInput
                      className="mt-1"
                      value={salida.estimated_value || '0.00'}
                      onChange={(v) => actualizarSalida(salida.key, { estimated_value: v })}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cuánto vale esta parte respecto de las otras. Si no lo pones en ninguna, el costo se reparte en partes iguales — y
                      una carcasa costaría lo mismo que una pantalla.
                    </p>
                  </div>
                )}
              </div>

              {/* EL NÚMERO. Es la razón de ser de esta pantalla. */}
              {cantidad > 0 && Number(costoTotal) > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-input bg-primary/5 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Quedaría en</span>
                  <span className="text-sm font-semibold text-foreground">
                    <Money value={costoUnitario.toFixed(2)} /> por {unitAbbr(salida.unit)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* ---- MOTIVO Y RESULTADO ---- */}
      <section className="flex flex-col gap-3 rounded-card border border-border bg-card p-card shadow-card">
        <div>
          <label htmlFor="reason" className="text-sm font-medium text-foreground">
            Motivo
          </label>
          <input
            id="reason"
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Fundición de prendas rematadas sin rotación"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Queda en el egreso y en la auditoría. Dentro de un año es lo único que va a explicar por qué esas piezas ya no están.
          </p>
        </div>
      </section>

      {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p className="text-muted-foreground">
            Costo que viaja <Money value={costoTotal} className="font-medium text-foreground" />
          </p>
          <p className="text-xs text-muted-foreground">
            {formatQuantity(String(entradas.reduce((a, e) => a + Number(e.quantity || 0), 0)))} de entrada ·{' '}
            {salidas.length} salida(s)
          </p>
        </div>
        <Button
          type="button"
          className="w-full rounded-pill sm:w-auto"
          disabled={!puedeGuardar || createTransformation.isPending}
          onClick={handleSubmit}
        >
          {createTransformation.isPending ? 'Transformando…' : 'Transformar'}
        </Button>
      </div>

      <AppDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="¿Descartar la transformación?"
        description="Vas a perder los artículos y salidas que ya armaste."
        size="sm"
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button className="w-full rounded-pill bg-danger hover:bg-danger/90" onClick={() => blocker.proceed?.()}>
              Descartar cambios
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => blocker.reset?.()}>
              Seguir editando
            </Button>
          </div>
        }
      />

      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </div>
  )
}
