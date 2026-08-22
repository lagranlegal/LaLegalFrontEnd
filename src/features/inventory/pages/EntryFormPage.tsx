import { useRef, useState } from 'react'
import { useNavigate, useBlocker } from '@tanstack/react-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ChevronRight, ImageIcon, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { DatePicker } from '@/components/shared/DatePicker'
import { SearchInput } from '@/components/shared/SearchInput'
import { useProductSearch, type Product } from '@/lib/inventory/productSearch'
import { PhotoUploader } from '@/components/shared/PhotoUploader'
import { Money } from '@/components/shared/Money'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { useCategories } from '@/lib/catalogs/categories'
import { useSuppliers } from '@/lib/catalogs/suppliers'
import { sumMoney, multiplyMoney } from '@/lib/money'
import { todayBogota } from '@/lib/dates'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'
import { useCreateEntry } from '@/features/inventory/api'
import { entryOriginLabel, ENTRY_ORIGIN_HINTS, SELECTABLE_ENTRY_ORIGINS, entryOriginTouchesCash } from '@/lib/inventory/entryTypes'


const entryLineSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  cat1_id: z.string().min(1, 'Selecciona una categoría'),
  cat2_id: z.string().min(1, 'Selecciona una subcategoría'),
  cat3_id: z.string().min(1, 'Selecciona la categoría final'),
  description: z.string().optional(),
  unit_cost: z.string().refine((v) => Number(v) > 0, 'El costo debe ser mayor a cero'),
  quantity: z.number().int().min(1),
  // Opcionales: sin ellos el lote entra en borrador, que sigue siendo válido.
  // Con los dos, el backend lo publica solo y queda listo para vender.
  sale_price: z.string().optional(),
  photos: z.array(z.string()).optional(),
})

const entrySchema = z
  .object({
    origin_type: z.enum(SELECTABLE_ENTRY_ORIGINS),
    supplier_id: z.string().optional(),
    supplier_invoice: z.string().optional(),
    // '' = pendiente de pago. No es lo mismo que "sin elegir": es una
    // decisión explícita del usuario, así que tiene su propia opción visible.
    payment_method: z.enum(['cash', 'transfer', 'other', '']).optional(),
    account_id: z.string().nullable().optional(),
    entry_date: z.string().min(1, 'Indica cuándo entró la mercancía'),
    notes: z.string().optional(),
    lines: z.array(entryLineSchema).min(1, 'Agrega al menos un artículo'),
  })
  // Hallazgo real probando en navegador: el backend rechaza con 400
  // BAD_REQUEST un ingreso "Compra" sin proveedor — el schema generado no
  // lo marca como obligatorio (es opcional en general, solo condicional a
  // origin_type), así que se valida acá para no depender del roundtrip.
  .refine((data) => data.origin_type !== 'purchase' || !!data.supplier_id, {
    message: 'Un ingreso de tipo "Compra" necesita un proveedor',
    path: ['supplier_id'],
  })
  // El medio de pago YA NO es obligatorio en una compra: dejarlo vacío la
  // registra como pendiente de pago, que es el camino para cargar facturas de
  // días anteriores o de noche con la caja cerrada.
  .refine((data) => data.entry_date <= todayBogota(), {
    message: 'La mercancía no puede haber entrado en una fecha futura',
    path: ['entry_date'],
  })
  // "Otro" es un cajón de sastre, así que el backend le exige motivo (00033).
  // Se valida acá también para señalar el campo en vez de mostrar un banner
  // después del roundtrip — mismo criterio que el proveedor en las compras.
  .refine((data) => data.origin_type !== 'other' || !!data.notes?.trim(), {
    message: 'Explica de dónde salió esta mercancía',
    path: ['notes'],
  })

type EntryFormValues = z.infer<typeof entrySchema>

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:bg-muted disabled:text-muted-foreground'

function emptyLine(): EntryFormValues['lines'][number] {
  return { name: '', cat1_id: '', cat2_id: '', cat3_id: '', description: '', unit_cost: '0.00', quantity: 1, sale_price: '', photos: [] }
}

/**
 * ¿Esta línea nace vendible o queda en borrador? Espeja la regla del backend.
 *
 * Solo el PRECIO decide. La foto dejó de ser obligatoria (00034): lo es
 * únicamente en piezas únicas, y un ingreso nunca crea productos únicos —eso
 * solo lo hace el remate—. Así el borrador significa exactamente una cosa: no
 * se sabe en cuánto se vende. Y eso sí tiene que bloquear, porque publicar con
 * un precio inventado sería peor que esperar.
 */
function lineIsReady(line: EntryFormValues['lines'][number] | undefined): boolean {
  return !!line && Number(line.sale_price || 0) > 0
}

/**
 * Buscador que ARMA la compra: se busca un producto y entra como línea nueva,
 * ya con nombre, categorías y precio.
 *
 * Reemplaza al `RestockPicker` que vivía DENTRO de cada línea. Comprar varios
 * artículos siempre se pudo —el backend recibe una lista— pero reponer diez
 * productos conocidos obligaba a crear diez bloques y buscar diez veces, una
 * por bloque. Un solo buscador arriba convierte eso en diez clics.
 *
 * BUSCA PRODUCTOS, NO LOTES, y el cambio no es cosmético: el producto trae el
 * precio de venta, que es lo que permite que la línea entre completa. Un lote
 * trae además su costo puntual — información de ESA compra, no del producto —
 * y sugerirlo invitaba a repetir un costo de hace seis meses. El costo se
 * escribe siempre, porque siempre cambia.
 *
 * POR QUÉ AGREGA UNA LÍNEA Y NO SUMA CANTIDAD a un lote existente: el sistema
 * costea por IDENTIFICACIÓN ESPECÍFICA (CONTEXTO.md §3, estándar joyero/NIIF).
 * Cada lote conserva su costo real y NUNCA se promedia; fusionar dos compras a
 * costos distintos obligaría a promediar y falsearía la utilidad de cada venta.
 */
function ProductSearchAdd({
  supplierId,
  onPickProduct,
  onCreateNew,
}: {
  supplierId?: string
  onPickProduct: (product: Product) => void
  onCreateNew: () => void
}) {
  const [q, setQ] = useState('')
  const { data, isFetching } = useProductSearch(q, { supplierId })

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchInput value={q} onChange={setQ} placeholder="Busca un producto que ya vendes para agregarlo…" />
        {q.trim() && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-input border border-border bg-card shadow-card">
            {isFetching && <p className="px-3 py-2 text-sm text-muted-foreground">Buscando…</p>}
            {!isFetching && data?.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Sin coincidencias{supplierId ? ' con este proveedor' : ''}. Usa “Artículo nuevo”.
              </p>
            )}
            {!isFetching &&
              data?.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onPickProduct(product)
                    setQ('')
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{product.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {product.code ? `${product.code} · ` : ''}
                      {product.sale_price ? (
                        <>
                          precio <Money value={product.sale_price} />
                        </>
                      ) : (
                        'sin precio todavía'
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{product.available_quantity} disp.</span>
                </button>
              ))}
          </div>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" className="self-start" onClick={onCreateNew}>
        <Plus className="size-4" /> Artículo nuevo
      </Button>
    </div>
  )
}

/**
 * Una línea ya resuelta, colapsada a una fila. Con todos los bloques abiertos
 * a la vez, una compra de diez artículos era una pantalla interminable y no se
 * podía revisar de un vistazo antes de confirmar.
 *
 * Muestra si la línea nace vendible o en borrador: es la consecuencia real de
 * lo que se acaba de escribir, y verla ANTES de guardar es lo que evita
 * descubrir después que media compra quedó invisible en borradores.
 */
function LineRow({
  line,
  index,
  onExpand,
  onRemove,
}: {
  line: EntryFormValues['lines'][number] | undefined
  index: number
  onExpand: () => void
  onRemove?: () => void
}) {
  const lista = lineIsReady(line)
  const subtotal = multiplyMoney(line?.unit_cost || '0.00', line?.quantity || 0)

  return (
    <div className="flex items-center gap-2 rounded-input border border-border bg-background px-3 py-2">
      <button type="button" onClick={onExpand} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{line?.name || `Artículo ${index + 1}`}</span>
          <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>
              {line?.quantity ?? 1} × <Money value={line?.unit_cost || '0.00'} />
            </span>
            {(line?.photos?.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <ImageIcon className="size-3" aria-hidden /> {line?.photos?.length}
              </span>
            )}
            <span className={lista ? 'text-success' : 'text-warning'}>{lista ? 'listo para vender' : 'quedará en borrador'}</span>
          </span>
        </span>
        <Money value={subtotal} className="shrink-0 text-sm font-medium text-foreground" />
      </button>
      {onRemove && (
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar artículo" onClick={onRemove}>
          <Trash2 className="size-4 text-danger" />
        </Button>
      )}
    </div>
  )
}

/**
 * Dice, mientras se escribe, si el artículo va a quedar publicado o en
 * borrador — y qué le falta para lo primero.
 *
 * Existe porque el borrador es un estado silencioso: un artículo sin publicar
 * no está en la vitrina y nadie se entera hasta que alguien lo busca para
 * vender. Decirlo en el momento de la compra convierte un descubrimiento
 * tardío en una decisión consciente.
 */
function LineReadiness({ line }: { line: EntryFormValues['lines'][number] | undefined }) {
  if (lineIsReady(line)) {
    return (
      <p className="text-xs text-success">
        Queda <strong>listo para vender</strong> apenas se registre el ingreso: se le asigna el código y entra a la vitrina.
      </p>
    )
  }
  return (
    <p className="text-xs text-muted-foreground">
      Sin precio de venta queda en <strong className="text-warning">borrador</strong>: entra al inventario pero no se puede vender hasta
      que se le ponga precio.
    </p>
  )
}

export function EntryFormPage() {
  const navigate = useNavigate()
  // `isPending` de los DOS catálogos: sin esto la pantalla se pintaba
  // completa y "lista" mientras las categorías y los proveedores seguían
  // viajando, así que los desplegables salían vacíos y parecía que la app
  // estuviera rota. Con el backend arrancando en frío eso son varios
  // segundos — reportado probando.
  const { data: categories, isPending: categoriesPending } = useCategories()
  const { data: suppliers, isPending: suppliersPending } = useSuppliers()
  const catalogsPending = categoriesPending || suppliersPending
  const [formError, setFormError] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const submittedRef = useRef(false)
  // Qué línea está abierta. Las demás se colapsan a una fila compacta: con el
  // bloque completo desplegado en todas, diez artículos eran una pantalla
  // interminable y no se podía revisar la compra de un vistazo.
  const [expanded, setExpanded] = useState<number | null>(0)
  const createEntry = useCreateEntry()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      origin_type: 'purchase',
      supplier_id: '',
      supplier_invoice: '',
      payment_method: 'cash',
      account_id: null,
      entry_date: todayBogota(),
      notes: '',
      lines: [emptyLine()],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  const lines = watch('lines')
  const originType = watch('origin_type')
  // `useWatch` para lo nuevo: `watch()` devuelve una función que el React
  // Compiler no puede memoizar (ya hay un warning por eso en este archivo).
  const paymentMethod = useWatch({ control, name: 'payment_method' })
  const isPurchase = originType === 'purchase'
  // Solo la compra entrega plata. Los demás orígenes (inventario inicial,
  // sobrante de conteo, otro) registran mercancía que ya está: no tocan la
  // caja y por eso no muestran medio de pago ni cuenta.
  const muevePlata = entryOriginTouchesCash(originType)

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !submittedRef.current,
    enableBeforeUnload: true,
    withResolver: true,
  })

  const totalCost = sumMoney(...lines.map((line) => multiplyMoney(line.unit_cost || '0.00', line.quantity || 0)))
  const listasCount = lines.filter(lineIsReady).length

  async function onSubmit(values: EntryFormValues) {
    setFormError(null)
    try {
      const entry = await createEntry.mutateAsync({
        origin_type: values.origin_type,
        supplier_id: values.supplier_id || null,
        supplier_invoice: values.supplier_invoice || null,
        // Solo la compra lo lleva — el backend rechaza un 'other' con medio
        // de pago (CHECK de la migración 00014).
        payment_method: values.origin_type === 'purchase' && values.payment_method ? values.payment_method : null,
        // Sin medio de pago la compra queda "por pagar": no hay movimiento
        // todavía, así que tampoco hay cuenta de la cual salga.
        account_id: values.origin_type === 'purchase' && values.payment_method ? (values.account_id ?? null) : null,
        entry_date: values.entry_date,
        notes: values.notes || null,
        lines: values.lines.map((line) => ({
          name: line.name,
          cat1_id: line.cat1_id,
          cat2_id: line.cat2_id,
          cat3_id: line.cat3_id,
          description: line.description || null,
          unit_cost: line.unit_cost,
          quantity: line.quantity,
          // Vacío = no se decidió todavía; el backend lo deja en borrador en
          // vez de publicar con un precio inventado.
          sale_price: Number(line.sale_price || 0) > 0 ? line.sale_price! : null,
          photos: line.photos ?? [],
        })),
      })
      submittedRef.current = true
      const publicados = entry.items.filter((item) => item.status === 'available').length
      const borradores = entry.items.length - publicados
      toast.success(`Ingreso #${entry.number} registrado`, {
        description:
          borradores === 0
            ? `${publicados} artículo(s) listos para vender`
            : `${publicados} listo(s) · ${borradores} en borrador, les falta precio o foto`,
      })
      await navigate({ to: '/inventario' })
    } catch (error) {
      // Mismo manejo que la venta: una compra ahora exige caja abierta, así
      // que el 409 se resuelve ofreciendo abrirla, no con un error seco.
      if (error instanceof ApiError && error.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      const banner = applyServerErrors(error, setError)
      if (banner) setFormError(banner)
    }
  }

  if (catalogsPending) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nuevo ingreso" description="Registra la mercancía que entra al inventario." />
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Cargando el formulario…">
          {/* Con la forma de las tres secciones reales (origen, artículos,
              notas) para que no salte el layout al aterrizar. */}
          <div className="h-44 animate-pulse rounded-card border border-border bg-muted/30" />
          <div className="h-64 animate-pulse rounded-card border border-border bg-muted/30" />
          <div className="h-20 animate-pulse rounded-card border border-border bg-muted/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nuevo ingreso"
        description="Registra la mercancía que entra al inventario. Con precio queda lista para vender; sin precio, en borrador."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Origen</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="origin_type" className="text-sm font-medium text-foreground">
                Tipo
              </label>
              <Controller
                control={control}
                name="origin_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="origin_type" className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SELECTABLE_ENTRY_ORIGINS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {entryOriginLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="mt-1 text-xs text-muted-foreground">{ENTRY_ORIGIN_HINTS[originType]}</p>
            </div>
            <div>
              <label htmlFor="supplier_id" className="text-sm font-medium text-foreground">
                Proveedor {isPurchase ? '' : '(opcional)'}
              </label>
              <Controller
                control={control}
                name="supplier_id"
                render={({ field }) => (
                  <Select value={field.value || '__none__'} onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}>
                    <SelectTrigger id="supplier_id" className="mt-1 w-full">
                      <SelectValue placeholder="Sin proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin proveedor</SelectItem>
                      {suppliers
                        ?.filter((s) => s.active)
                        .map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.supplier_id && <p className="mt-1 text-sm text-danger">{errors.supplier_id.message}</p>}
            </div>
            <div>
              <label htmlFor="supplier_invoice" className="text-sm font-medium text-foreground">
                Factura del proveedor (opcional)
              </label>
              <input id="supplier_invoice" className={inputClass} {...register('supplier_invoice')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="entry_date" className="text-sm font-medium text-foreground">
                Fecha de entrada
              </label>
              <Controller
                control={control}
                name="entry_date"
                render={({ field }) => <DatePicker id="entry_date" value={field.value} onChange={field.onChange} maxDate={todayBogota()} />}
              />
              <p className="mt-1 text-xs text-muted-foreground">Cuándo llegó la mercancía, no cuándo la registras.</p>
              {errors.entry_date && <p className="mt-1 text-sm text-danger">{errors.entry_date.message}</p>}
            </div>

            {/* El medio de pago es OPCIONAL: vacío = pendiente de pago. Ese es
                el camino para cargar facturas de días anteriores o de noche
                con la caja cerrada, sin inventarle un movimiento a la caja. */}
            {muevePlata && (
              <div className="sm:col-span-2">
                <label htmlFor="payment_method" className="text-sm font-medium text-foreground">
                  Pago
                </label>
                <Controller
                  control={control}
                  name="payment_method"
                  render={({ field }) => (
                    <Select value={field.value || '__pending__'} onValueChange={(v) => field.onChange(v === '__pending__' ? '' : v)}>
                      <SelectTrigger id="payment_method" className="mt-1 w-full">
                        <SelectValue>
                          {field.value ? `Pagado — ${PAYMENT_METHOD_LABELS[field.value as 'cash' | 'transfer' | 'other']}` : 'Pendiente de pago'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__pending__">Pendiente de pago</SelectItem>
                        {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            Pagado — {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {watch('payment_method')
                    ? 'Sale de la caja ahora, así que requiere la caja abierta. Registra las compras en efectivo el mismo día: la caja se cuadra contra el conteo físico.'
                    : 'No toca la caja. Queda en “por pagar” y la saldas cuando entregues la plata — sirve para cargar facturas de días anteriores o con la caja cerrada.'}
                </p>
              </div>
            )}
            {/* Solo si se paga ahora: una compra "por pagar" todavía no mueve
                plata, así que no hay cuenta de la cual salga. */}
            {muevePlata && paymentMethod && (
              <div className="sm:col-span-2">
                <label htmlFor="entry-account" className="text-sm font-medium text-foreground">
                  ¿De dónde sale?
                </label>
                <Controller
                  control={control}
                  name="account_id"
                  render={({ field }) => (
                    <AccountPicker
                      id="entry-account"
                      paymentMethod={paymentMethod}
                      direction="out"
                      value={field.value ?? null}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-foreground">Artículos</h2>
            <span className="text-xs text-muted-foreground">
              {fields.length} {fields.length === 1 ? 'línea' : 'líneas'}
            </span>
          </div>

          {/* UN buscador arriba, no uno dentro de cada línea. Ese era el
              problema real del punto 3: comprar varios artículos SIEMPRE se
              pudo (el backend recibe una lista), pero reponer diez productos
              conocidos obligaba a crear diez bloques enormes y buscar diez
              veces dentro de cada uno. */}
          <ProductSearchAdd
            supplierId={watch('supplier_id')}
            onPickProduct={(product) => {
              append({
                ...emptyLine(),
                name: product.name,
                description: product.description ?? '',
                cat1_id: product.cat1_id,
                cat2_id: product.cat2_id,
                cat3_id: product.cat3_id,
                // El precio ya está en el producto: no se vuelve a pedir. Si
                // el usuario lo cambia acá, cambia para todos sus lotes.
                sale_price: product.sale_price ?? '',
              })
              // El costo es lo único que SIEMPRE hay que revisar (cambia en
              // cada compra), así que la línea nueva se abre en ese campo.
              setExpanded(fields.length)
            }}
            onCreateNew={() => {
              append(emptyLine())
              setExpanded(fields.length)
            }}
          />

          {errors.lines?.message && <p className="text-sm text-danger">{errors.lines.message}</p>}

          <div className="flex flex-col gap-2">
            {fields.map((field, index) => {
              const linea = lines[index]
              const cat1 = linea?.cat1_id
              const cat2 = linea?.cat2_id
              const level1Options = (categories ?? []).filter((c) => c.level === 1 && c.active)
              const level2Options = (categories ?? []).filter((c) => c.level === 2 && c.active && c.parent_id === cat1)
              const level3Options = (categories ?? []).filter((c) => c.level === 3 && c.active && c.parent_id === cat2)
              const conError = !!errors.lines?.[index]

              // Colapsada: una fila compacta. Diez artículos caben en pantalla
              // en vez de ocupar diez bloques de media pantalla cada uno.
              if (expanded !== index && !conError) {
                return (
                  <LineRow
                    key={field.id}
                    line={linea}
                    index={index}
                    onExpand={() => setExpanded(index)}
                    onRemove={fields.length > 1 ? () => remove(index) : undefined}
                  />
                )
              }

              return (
                <div key={field.id} className="flex flex-col gap-3 rounded-input border border-primary/40 bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Artículo {index + 1}</span>
                    <div className="flex items-center gap-1">
                      {!conError && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(null)}>
                          Listo
                        </Button>
                      )}
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar artículo" onClick={() => remove(index)}>
                          <Trash2 className="size-4 text-danger" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground">Nombre</label>
                      <input className={inputClass} {...register(`lines.${index}.name`)} />
                      {errors.lines?.[index]?.name && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.name?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Categoría</label>
                      <Controller
                        control={control}
                        name={`lines.${index}.cat1_id`}
                        render={({ field: cat1Field }) => (
                          <Select
                            value={cat1Field.value}
                            onValueChange={(v) => {
                              cat1Field.onChange(v)
                              setValue(`lines.${index}.cat2_id`, '')
                              setValue(`lines.${index}.cat3_id`, '')
                            }}
                          >
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue placeholder="Selecciona…" />
                            </SelectTrigger>
                            <SelectContent>
                              {level1Options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.lines?.[index]?.cat1_id && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.cat1_id?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Subcategoría</label>
                      <Controller
                        control={control}
                        name={`lines.${index}.cat2_id`}
                        render={({ field: cat2Field }) => (
                          <Select
                            value={cat2Field.value}
                            onValueChange={(v) => {
                              cat2Field.onChange(v)
                              setValue(`lines.${index}.cat3_id`, '')
                            }}
                            disabled={!cat1}
                          >
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue placeholder={cat1 ? 'Selecciona…' : 'Elige categoría primero'} />
                            </SelectTrigger>
                            <SelectContent>
                              {level2Options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.lines?.[index]?.cat2_id && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.cat2_id?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Categoría final</label>
                      <Controller
                        control={control}
                        name={`lines.${index}.cat3_id`}
                        render={({ field: cat3Field }) => (
                          <Select value={cat3Field.value} onValueChange={cat3Field.onChange} disabled={!cat2}>
                            <SelectTrigger className="mt-1 w-full">
                              <SelectValue placeholder={cat2 ? 'Selecciona…' : 'Elige subcategoría primero'} />
                            </SelectTrigger>
                            <SelectContent>
                              {level3Options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.lines?.[index]?.cat3_id && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.cat3_id?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Costo unitario</label>
                      <Controller
                        control={control}
                        name={`lines.${index}.unit_cost`}
                        render={({ field: costField }) => <MoneyInput className="mt-1" value={costField.value} onChange={costField.onChange} />}
                      />
                      {errors.lines?.[index]?.unit_cost && <p className="mt-1 text-sm text-danger">{errors.lines[index]?.unit_cost?.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Cantidad</label>
                      <input type="number" min={1} className={inputClass} {...register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground">Descripción (opcional)</label>
                      <input className={inputClass} {...register(`lines.${index}.description`)} />
                    </div>
                  </div>

                  {/* PRECIO Y FOTOS ACÁ, no en otra pantalla después.
                      Este es el momento en que la mercancía está en la mano de
                      quien la registra: es cuando se sabe en cuánto se va a
                      vender y cuando se le puede tomar la foto. Pedirlo
                      después obligaba a volver artículo por artículo, y por eso
                      TODA compra nacía incompleta. */}
                  <div className="flex flex-col gap-3 rounded-input bg-muted/40 p-3">
                    <p className="text-xs font-medium text-foreground">Para dejarlo listo para vender</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-foreground">Precio de venta</label>
                        <Controller
                          control={control}
                          name={`lines.${index}.sale_price`}
                          render={({ field: priceField }) => (
                            <MoneyInput className="mt-1" value={priceField.value || '0.00'} onChange={priceField.onChange} />
                          )}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Aplica a todos los lotes de este producto.</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">
                          Fotos <span className="text-muted-foreground">(opcional)</span>
                        </label>
                        <div className="mt-1">
                          <Controller
                            control={control}
                            name={`lines.${index}.photos`}
                            render={({ field: photoField }) => (
                              <PhotoUploader
                                value={photoField.value ?? []}
                                onChange={photoField.onChange}
                                folder={`inventory/nuevo/${field.id}`}
                                maxPhotos={3}
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Las fotos son del <strong className="text-foreground">producto</strong>: se toman una vez y las heredan todos sus
                      lotes, así que reponer no obliga a volver a fotografiar.
                    </p>
                    <LineReadiness line={linea} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-card border border-border bg-card p-card shadow-card">
          <label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notas {originType === 'other' ? '' : '(opcional)'}
          </label>
          <textarea
            id="notes"
            rows={2}
            className={inputClass}
            placeholder={originType === 'other' ? '¿De dónde salió esta mercancía?' : undefined}
            {...register('notes')}
          />
          {errors.notes && <p className="mt-1 text-sm text-danger">{errors.notes.message}</p>}
        </section>

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <p>
              Costo total estimado <Money value={totalCost} className="font-medium text-foreground" />
            </p>
            {/* Lo que va a pasar, dicho ANTES de guardar. Un borrador es un
                estado silencioso —no está en la vitrina y nadie se entera—,
                así que el momento de enterarse es este y no cuando alguien lo
                busque para vender. */}
            <p className="mt-0.5 text-xs">
              {listasCount === fields.length ? (
                <span className="text-success">
                  {fields.length === 1 ? 'El artículo queda listo para vender' : `Los ${fields.length} artículos quedan listos para vender`}
                </span>
              ) : (
                <>
                  {listasCount > 0 && <span className="text-success">{listasCount} listo(s) para vender</span>}
                  {listasCount > 0 && ' · '}
                  <span className="text-warning">{fields.length - listasCount} en borrador</span>
                  <span className="text-muted-foreground"> (les falta precio o foto)</span>
                </>
              )}
            </p>
          </div>
          <Button type="submit" disabled={createEntry.isPending} className="w-full rounded-pill sm:w-auto">
            {createEntry.isPending ? 'Registrando…' : 'Registrar ingreso'}
          </Button>
        </div>
      </form>

      <AppDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="¿Descartar el ingreso?"
        description="Vas a perder los datos que ya escribiste."
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
