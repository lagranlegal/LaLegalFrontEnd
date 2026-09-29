import { useRef, useState } from 'react'
import { useNavigate, useBlocker } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { BackLink } from '@/components/shared/BackLink'
import { AppDialog } from '@/components/shared/AppDialog'
import { ItemPicker } from '@/components/shared/ItemPicker'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { Money } from '@/components/shared/Money'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { belowCostLines, userMessage } from '@/lib/api/errors'
import { compareMoney, formatCOP, multiplyMoney, subtractMoney, sumMoney } from '@/lib/money'
import { usePermission } from '@/lib/permissions/usePermission'
import { belowPriceDiscount } from '@/lib/sales/discount'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useCreateSale } from '@/features/sales/api'
import { QuantityInput } from '@/features/sales/components/QuantityInput'
import { allowsFractions, clampQuantity, unitAbbr } from '@/lib/inventory/units'
import { useCustomerCreditNotes } from '@/lib/sales/creditNotes'
import { minMoney } from '@/lib/money'
import type { Item } from '@/lib/inventory/items'
import type { Customer } from '@/lib/customers/search'
import { preventImplicitSubmit } from '@/lib/forms/preventImplicitSubmit'

interface CartLine {
  item: Item
  quantity: number
  /**
   * Lo que se cobra por unidad. Arranca en el precio publicado; solo quien
   * tiene `sales.apply_discount` lo puede cambiar, porque bajarlo es un
   * descuento (F6-05 del backend) y subirlo sin ese permiso no tiene caso de
   * uso en el mostrador.
   */
  unitPrice: string
}

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

export function SaleFormPage() {
  const navigate = useNavigate()
  const createSale = useCreateSale()
  const canDiscount = usePermission('sales.apply_discount')

  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'other'>('cash')
  const [discountAmount, setDiscountAmount] = useState('0.00')
  const [discountReason, setDiscountReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [cashDialogOpen, setCashDialogOpen] = useState(false)
  const [creditNoteId, setCreditNoteId] = useState<string | null>(null)
  const [creditNoteAmount, setCreditNoteAmount] = useState('0.00')
  /**
   * El backend pidió motivo por una rebaja que la pantalla no vio: el precio
   * publicado subió con el carrito ya armado, y lo cargado quedó por debajo
   * (400 con `details.price_discount`). Se muestra el campo del motivo; lo
   * que venda es decisión del cajero.
   */
  const [serverPriceDiscount, setServerPriceDiscount] = useState<string | null>(null)
  /**
   * Artículos que el backend rechazó por quedar bajo el COSTO del lote
   * (403 `SALE_BELOW_COST_REQUIRES_PERMISSION`). Cubre lo que la pantalla no
   * pudo prever: un costo que cambió con el carrito armado.
   */
  const [serverBelowCost, setServerBelowCost] = useState<ReadonlySet<string>>(new Set())
  /** Confirmación explícita de vender con pérdida en alguna pieza. */
  const [belowCostConfirmed, setBelowCostConfirmed] = useState(false)
  const submittedRef = useRef(false)

  // Perder un carrito armado sin aviso era el hueco más agudo de navegación
  // de todo el front (docs/PENDIENTES_FRONTEND.md #10): a diferencia de los
  // formularios de contratos/ingreso, esta pantalla no tenía NINGÚN resguardo.
  const blocker = useBlocker({
    shouldBlockFn: () => cart.length > 0 && !submittedRef.current,
    enableBeforeUnload: true,
    withResolver: true,
  })

  const { data: creditNotesData } = useCustomerCreditNotes(customer?.id ?? '')
  const availableCreditNotes = (creditNotesData?.pages.flatMap((page) => page.items) ?? []).filter((note) => Number(note.balance) > 0)

  function chooseCustomer(next: Customer | null) {
    setCustomer(next)
    setCreditNoteId(null)
    setCreditNoteAmount('0.00')
  }

  function addToCart(item: Item) {
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id)
      if (existing) {
        return prev.map((line) =>
          line.item.id === item.id ? { ...line, quantity: clampQuantity(item.unit, Number(item.quantity), line.quantity + 1) } : line,
        )
      }
      return [...prev, { item, quantity: 1, unitPrice: item.sale_price ?? '0.00' }]
    })
  }

  /** Se acota al stock disponible y a un mínimo positivo — la regla vive en `clampQuantity`. */
  function updateQuantity(itemId: string, quantity: number) {
    setCart((prev) =>
      prev.map((line) => {
        if (line.item.id !== itemId) return line
        if (!Number.isFinite(quantity)) return line
        return { ...line, quantity: clampQuantity(line.item.unit, Number(line.item.quantity), quantity) }
      }),
    )
  }

  function updateUnitPrice(itemId: string, unitPrice: string) {
    setCart((prev) => prev.map((line) => (line.item.id === itemId ? { ...line, unitPrice } : line)))
  }

  function removeLine(itemId: string) {
    setCart((prev) => prev.filter((line) => line.item.id !== itemId))
  }

  const subtotal = sumMoney(...cart.map((line) => multiplyMoney(line.unitPrice, line.quantity)))
  const hasDiscount = Number(discountAmount) > 0
  const priceDiscount = belowPriceDiscount(cart.map((line) => ({ publishedPrice: line.item.sale_price, unitPrice: line.unitPrice, quantity: line.quantity })))
  const hasPriceDiscount = compareMoney(priceDiscount, '0.00') > 0
  // Motivo: con descuento explícito, con una línea por debajo del precio
  // publicado, o cuando el backend lo pidió por una rebaja que acá no se veía.
  const needsReason = hasDiscount || hasPriceDiscount || serverPriceDiscount !== null
  const total = hasDiscount ? subtractMoney(subtotal, discountAmount) : subtotal
  const hasCreditNote = !!creditNoteId && Number(creditNoteAmount) > 0
  const cashAmount = hasCreditNote ? subtractMoney(total, creditNoteAmount) : total
  // Vender por debajo del costo del lote (decisión del dueño, auditoría fase
  // 7): el backend lo exige con `sales.apply_discount`. Acá se avisa en la
  // línea y se pide confirmarlo; `item.cost` es el mismo costo del lote con
  // el que compara el backend. Al costo exacto es libre.
  const isBelowCost = (line: CartLine) => compareMoney(line.unitPrice, line.item.cost) < 0 || serverBelowCost.has(line.item.id)
  const hasBelowCost = cart.some(isBelowCost)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (cart.length === 0) {
      setFormError('Agrega al menos un artículo al carrito.')
      return
    }
    if (needsReason && !discountReason.trim()) {
      setFormError(
        hasDiscount ? 'El descuento necesita un motivo.' : 'Vender por debajo del precio publicado es un descuento: necesita un motivo.',
      )
      return
    }
    if (hasBelowCost && !belowCostConfirmed) {
      setFormError('Hay artículos por debajo del costo: confirma que quieres venderlos con pérdida.')
      return
    }
    try {
      const sale = await createSale.mutateAsync({
        customer_id: customer?.id ?? null,
        payment_method: paymentMethod,
        account_id: accountId,
        lines: cart.map((line) => ({ item_id: line.item.id, quantity: String(line.quantity), unit_price: line.unitPrice })),
        discount_amount: hasDiscount ? discountAmount : null,
        discount_reason: needsReason ? discountReason.trim() : null,
        credit_note_id: hasCreditNote ? creditNoteId : null,
        credit_note_amount: hasCreditNote ? creditNoteAmount : null,
      })
      submittedRef.current = true
      toast.success(`Venta #${sale.number} registrada`)
      await navigate({ to: '/ventas' })
    } catch (error) {
      if (error instanceof ApiError && error.code === 'CASH_SESSION_NOT_OPEN') {
        setCashDialogOpen(true)
        return
      }
      if (error instanceof ApiError && error.code === 'SALE_BELOW_COST_REQUIRES_PERMISSION') {
        setServerBelowCost(new Set(belowCostLines(error).map((l) => l.item_id)))
      }
      if (error instanceof ApiError && typeof error.details?.price_discount === 'string') {
        setServerPriceDiscount(error.details.price_discount)
      }
      setFormError(error instanceof ApiError ? userMessage(error) : 'No se pudo registrar la venta. Intenta de nuevo.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/ventas" label="Ventas" />
      <PageHeader title="Nueva venta" description="Busca el artículo por código o nombre y agrégalo al carrito." />

      <form onKeyDown={preventImplicitSubmit} onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]" noValidate>
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-card p-card shadow-card">
            {/* El buscador vive DENTRO del <form>: Enter disparaba el submit
                y cobraba el carrito ya armado (QA F6-03, confirmado en vivo).
                Ahora Enter AGREGA el artículo de código exacto (lo que manda
                un lector de código de barras) y el formulario entero ignora
                el envío implícito: la venta se registra solo con "Vender". */}
            <ItemPicker onSelect={addToCart} placeholder="Buscar o escanear artículo por código o nombre…" />
          </div>

          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            {cart.length === 0 ? (
              <p className="p-card text-center text-sm text-muted-foreground">El carrito está vacío — busca un artículo arriba.</p>
            ) : (
              <div className="divide-y divide-border">
                {cart.map((line) => {
                  const { item, quantity, unitPrice } = line
                  const belowPublished = item.sale_price !== null && compareMoney(unitPrice, item.sale_price) < 0
                  const belowCost = isBelowCost(line)
                  return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.code && <span className="font-mono">{item.code}</span>} · <Money value={item.sale_price ?? '0.00'} />
                      </p>
                      {/* Cambiar el precio de la línea: solo con permiso de
                          descuentos. Bajarlo del publicado ES un descuento
                          (F6-05 del backend): pide motivo y queda auditado. */}
                      {canDiscount && (
                        <div className="mt-2 flex items-center gap-2">
                          <label htmlFor={`precio-${item.id}`} className="text-xs text-muted-foreground">
                            Precio
                          </label>
                          <MoneyInput id={`precio-${item.id}`} ariaLabel={`Precio de ${item.name}`} className="w-36" value={unitPrice} onChange={(v) => updateUnitPrice(item.id, v)} />
                        </div>
                      )}
                      {belowPublished && (
                        <p className="mt-1 text-xs text-warning">Por debajo del precio publicado: cuenta como descuento y necesita motivo.</p>
                      )}
                      {belowCost && (
                        <p className="mt-1 text-xs font-medium text-danger">
                          Por debajo del costo (<Money value={item.cost} />): esta pieza se vende con pérdida.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Contar y PESAR son gestos distintos. Los botones +/-
                          son correctos para cadenas y anillos; para gramos o
                          metros lo natural es escribir la cantidad, y sumar de
                          a 1 g sería absurdo. Por eso la interacción la decide
                          la unidad del producto. */}
                      {allowsFractions(item.unit) ? (
                        <div className="flex items-center gap-1">
                          <QuantityInput item={item} quantity={quantity} onChange={(q) => updateQuantity(item.id, q)} />
                          <span className="text-xs text-muted-foreground">{unitAbbr(item.unit)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 rounded-input border border-border">
                          <Button type="button" variant="ghost" size="icon-sm" aria-label="Restar" onClick={() => updateQuantity(item.id, quantity - 1)}>
                            <Minus className="size-3.5" />
                          </Button>
                          <span className="w-6 text-center text-sm tnum">{quantity}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Sumar"
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                            disabled={quantity >= Number(item.quantity)}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      )}
                      <Money value={multiplyMoney(unitPrice, quantity)} className="w-24 text-right font-medium" />
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => removeLine(item.id)}>
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
            <div>
              <label className="text-sm font-medium text-foreground">Cliente (opcional)</label>
              <div className="mt-1">
                <CustomerPicker value={customer} onChange={chooseCustomer} />
              </div>
              {!customer && <p className="mt-1 text-xs text-muted-foreground">Sin seleccionar: se vende a "Consumidor final".</p>}
            </div>

            {availableCreditNotes.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground">Aplicar nota crédito</label>
                <Select
                  value={creditNoteId ?? '__none__'}
                  onValueChange={(v) => {
                    if (v === '__none__') {
                      setCreditNoteId(null)
                      setCreditNoteAmount('0.00')
                      return
                    }
                    const note = availableCreditNotes.find((n) => n.id === v)
                    setCreditNoteId(v)
                    setCreditNoteAmount(note ? minMoney(note.balance, total) : '0.00')
                  }}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguna</SelectItem>
                    {availableCreditNotes.map((note) => (
                      <SelectItem key={note.id} value={note.id}>
                        <RecordNumber value={note.number} /> · saldo {formatCOP(note.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasCreditNote && (
                  <div className="mt-2">
                    <label className="text-xs text-muted-foreground">Monto a aplicar</label>
                    <MoneyInput className="mt-1" value={creditNoteAmount} onChange={setCreditNoteAmount} />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">Medio de pago</label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
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

            {/* El medio dice CÓMO se cobró; la cuenta, DÓNDE quedó la plata
                (docs/ARCHITECTURE.md §12). Con Sistecrédito la diferencia es
                el negocio entero: el medio es "Otro" y la cuenta es el
                convenio que todavía te la debe. */}
            <div>
              <label htmlFor="sale-account" className="text-sm font-medium text-foreground">
                ¿A dónde entra?
              </label>
              <AccountPicker id="sale-account" paymentMethod={paymentMethod} value={accountId} onChange={setAccountId} />
            </div>

            <Can permission="sales.apply_discount">
              <div>
                <label className="text-sm font-medium text-foreground">Descuento (opcional)</label>
                <MoneyInput className="mt-1" value={discountAmount} onChange={setDiscountAmount} />
              </div>
            </Can>
            {/* Fuera del <Can>: el backend puede pedir el motivo aunque la
                pantalla no viera rebaja (el precio publicado cambió con el
                carrito armado). Sin el permiso, ese envío termina en un 403
                que ya explica qué falta. */}
            {needsReason && (
              <div>
                <label htmlFor="sale-discount-reason" className="text-sm font-medium text-foreground">
                  Motivo del descuento
                </label>
                <input id="sale-discount-reason" className={inputClass} value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-card shadow-card text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <Money value={subtotal} />
            </div>
            {hasPriceDiscount && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rebajado del precio publicado (ya incluido)</span>
                <Money value={priceDiscount} />
              </div>
            )}
            {hasDiscount && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Descuento</span>
                <Money value={discountAmount} tone="out" />
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
              <span>Total</span>
              <Money value={total} />
            </div>
            {hasCreditNote && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Nota crédito aplicada</span>
                  <Money value={creditNoteAmount} tone="out" />
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
                  <span>A cobrar</span>
                  <Money value={cashAmount} />
                </div>
              </>
            )}
          </div>

          {hasBelowCost && (
            <label className="flex items-start gap-2 rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">
              <input type="checkbox" className="mt-0.5" checked={belowCostConfirmed} onChange={(e) => setBelowCostConfirmed(e.target.checked)} />
              <span>Confirmo que vendo por debajo del costo: la venta pierde plata en esas piezas.</span>
            </label>
          )}

          {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

          <Button type="submit" disabled={createSale.isPending} className="w-full rounded-pill">
            {createSale.isPending ? 'Vendiendo…' : (
              <>
                Vender <Money value={total} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      </form>

      <AppDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="¿Descartar la venta?"
        description="Vas a perder el carrito que ya armaste."
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
