import { useRef, useState } from 'react'
import { CashClosedNotice } from '@/components/shared/CashClosedNotice'
import { useBlocker } from '@tanstack/react-router'
import { BackLink } from '@/components/shared/BackLink'
import { AppDialog } from '@/components/shared/AppDialog'
import { ItemPicker } from '@/components/shared/ItemPicker'
import { Money } from '@/components/shared/Money'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { belowCostLines, userMessage } from '@/lib/api/errors'
import { compareMoney, formatCOP, multiplyMoney, subtractMoney, sumMoney } from '@/lib/money'
import { usePermission } from '@/lib/permissions/usePermission'
import { belowPriceDiscount } from '@/lib/sales/discount'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { cashChange } from '@/features/sales/cashChange'
import { confirm } from '@/components/shared/confirmStore'
import { useCreateSale, type Sale } from '@/features/sales/api'
import { SaleDoneCard } from '@/features/sales/components/SaleDoneCard'
import { SaleReceiptDialog } from '@/components/shared/SaleReceiptDialog'
import { PosCart } from '@/features/sales/components/PosCart'
import { PaymentMethodSegmented, PosCustomerField, QuickCashButtons, type PaymentMethod } from '@/features/sales/components/PosPay'
import { quickCashAmounts } from '@/features/sales/quickCash'
import type { CartLine } from '@/features/sales/cart'
import { clampQuantity } from '@/lib/inventory/units'
import { useCustomerCreditNotes } from '@/lib/sales/creditNotes'
import { minMoney } from '@/lib/money'
import type { Item } from '@/lib/inventory/items'
import type { Customer } from '@/lib/customers/search'
import { ReceiptEmailNotice } from '@/features/sales/components/ReceiptEmailNotice'
import { preventImplicitSubmit } from '@/lib/forms/preventImplicitSubmit'


export function SaleFormPage() {
  const createSale = useCreateSale()
  const canDiscount = usePermission('sales.apply_discount')

  const [cart, setCart] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [discountAmount, setDiscountAmount] = useState('0.00')
  // Solo para calcular el cambio en pantalla (F9-32): no se envía.
  const [cashReceived, setCashReceived] = useState('')
  const [discountReason, setDiscountReason] = useState('')
  const [discountOpen, setDiscountOpen] = useState(false)
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
  /** La venta recién cobrada: la pantalla cierra con su comprobante en vez de volver a la lista (F9-33). */
  const [doneSale, setDoneSale] = useState<{ sale: Sale; change: string | null; customerName: string } | null>(null)
  const scannerRef = useRef<HTMLInputElement>(null)

  // Perder un carrito armado sin aviso era el hueco más agudo de navegación
  // de todo el front (auditoría de UX del 27/08/2026, punto 10): a diferencia de los
  // formularios de contratos/ingreso, esta pantalla no tenía NINGÚN resguardo.
  const blocker = useBlocker({
    shouldBlockFn: () => cart.length > 0,
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
    // Escanear después de cobrar ya es la venta siguiente.
    setDoneSale(null)
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

  /** Deja la pantalla lista para la venta siguiente (después de cobrar). */
  function resetSale() {
    setCart([])
    chooseCustomer(null)
    setPaymentMethod('cash')
    setAccountId(null)
    setDiscountAmount('0.00')
    setDiscountOpen(false)
    setDiscountReason('')
    setCashReceived('')
    setServerPriceDiscount(null)
    setServerBelowCost(new Set())
    setBelowCostConfirmed(false)
    setFormError(null)
    scannerRef.current?.focus()
  }

  function startNewSale() {
    setDoneSale(null)
    scannerRef.current?.focus()
  }

  async function clearCart() {
    const { confirmed } = await confirm({
      title: '¿Vaciar el carrito?',
      description: 'Se quitan todos los artículos de esta venta.',
      tone: 'danger',
      confirmLabel: 'Vaciar carrito',
      cancelLabel: 'Volver',
    })
    if (!confirmed) return
    setCart([])
    scannerRef.current?.focus()
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
  const change = paymentMethod === 'cash' ? cashChange(cashReceived, cashAmount) : null
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
    // Sin diálogo de confirmación (decisión de Mateo, 01/10): en el mostrador
    // el botón «Cobrar $ X» ya es la confirmación — total, recibido y cambio
    // están a la vista, Enter no cobra y la Idempotency-Key evita el doble
    // cobro. Descuento y venta bajo costo siguen pidiendo su propio paso.
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
      setDoneSale({
        sale,
        change: change?.kind === 'change' ? change.amount : null,
        customerName: customer?.full_name ?? 'Consumidor final',
      })
      resetSale()
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

  const quickAmounts = quickCashAmounts(cashAmount)
  // Tras cobrar, el cierre ocupa la pantalla hasta «Nueva venta» o el siguiente escaneo.
  const showingDone = doneSale !== null && cart.length === 0

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/ventas" label="Ventas" />
      {/* La maqueta no lleva título visible: la pantalla es el mostrador. El nombre queda para el lector de pantalla. */}
      <h1 className="sr-only">Nueva venta</h1>
      <CashClosedNotice paymentMethod={paymentMethod} />

      <form
        onKeyDown={preventImplicitSubmit}
        onSubmit={handleSubmit}
        className="grid grid-cols-1 items-start gap-4 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]"
        noValidate
      >
        <div className="grid min-w-0 content-start gap-3.5">
          {/* El escáner vive DENTRO del <form>: Enter disparaba el submit y
              cobraba el carrito ya armado (QA F6-03, confirmado en vivo).
              Ahora Enter AGREGA el artículo de código exacto (lo que manda
              un lector de código de barras) y el formulario entero ignora el
              envío implícito: la venta se registra solo con el botón. Nace
              con foco y lo recupera tras agregar (F9-27, F9-33). */}
          <ItemPicker ref={scannerRef} variant="scanner" onSelect={addToCart} placeholder="Escanea o escribe código o nombre" />
          {showingDone ? (
            <SaleDoneCard
              sale={doneSale.sale}
              change={doneSale.change}
              customerName={doneSale.customerName}
              onPrint={() => window.print()}
              onNewSale={startNewSale}
            />
          ) : (
            <PosCart
              cart={cart}
              canDiscount={canDiscount}
              isBelowCost={isBelowCost}
              onQuantity={updateQuantity}
              onPrice={updateUnitPrice}
              onRemove={removeLine}
              onClear={clearCart}
            />
          )}
        </div>

        {/* La columna de cobro (F9-32): cliente, medio, totales, recibido,
            cambio y el botón en un solo bloque que cabe entero a 1280×800. */}
        {!showingDone && (
          <section aria-label="Cobro" className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-card">
            <div className="flex flex-col gap-1.5">
              <span id="pos-customer-label" className="text-sm font-medium text-foreground">
                Cliente
              </span>
              <PosCustomerField value={customer} onChange={chooseCustomer} />
              {customer && <ReceiptEmailNotice customer={customer} />}
            </div>

            {availableCreditNotes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sale-credit-note" className="text-sm font-medium text-foreground">
                  Aplicar nota crédito
                </label>
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
                  <SelectTrigger id="sale-credit-note" className="w-full">
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
                {hasCreditNote && <MoneyInput ariaLabel="Monto de la nota crédito a aplicar" value={creditNoteAmount} onChange={setCreditNoteAmount} />}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span id="pos-method-label" className="text-sm font-medium text-foreground">
                Medio de pago
              </span>
              <PaymentMethodSegmented value={paymentMethod} onChange={setPaymentMethod} labelledBy="pos-method-label" />
              {/* El medio dice CÓMO se cobró; la cuenta, DÓNDE quedó la plata
                  (backend-starter/docs/DOMINIO.md §4.1). Con Sistecrédito la
                  diferencia es el negocio entero: el medio es "Otro" y la
                  cuenta es el convenio que todavía te la debe. */}
              <label htmlFor="sale-account" className="sr-only">
                ¿A dónde entra?
              </label>
              <AccountPicker id="sale-account" paymentMethod={paymentMethod} value={accountId} onChange={setAccountId} warnNegativeBalance />
            </div>

            <div className="flex flex-col gap-1.5 text-sm text-body tnum">
              <div className="flex justify-between gap-3">
                <span>Subtotal</span>
                <Money value={subtotal} />
              </div>
              {hasPriceDiscount && (
                <div className="flex justify-between gap-3">
                  <span>Rebajado del precio publicado (ya incluido)</span>
                  <Money value={priceDiscount} />
                </div>
              )}
              {/* Descuento plegado hasta que se pide (F9-34); solo con el permiso. */}
              {canDiscount && !discountOpen && (
                <div className="flex justify-between gap-3">
                  <span>Descuento</span>
                  <button type="button" className="font-medium text-brand hover:underline" onClick={() => setDiscountOpen(true)}>
                    Agregar
                  </button>
                </div>
              )}
              {canDiscount && discountOpen && (
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="sale-discount">Descuento</label>
                  <div className="flex items-center gap-2">
                    <MoneyInput id="sale-discount" className="w-36" value={discountAmount} onChange={setDiscountAmount} autoFocus />
                    <button
                      type="button"
                      className="text-button-sm font-medium text-brand hover:underline"
                      onClick={() => {
                        setDiscountAmount('0.00')
                        setDiscountOpen(false)
                      }}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-0.5 flex justify-between gap-3 border-t border-border pt-2 text-xl font-bold text-foreground">
                <span>Total</span>
                <Money value={total} />
              </div>
              {hasCreditNote && (
                <>
                  <div className="flex justify-between gap-3">
                    <span>Nota crédito aplicada</span>
                    <Money value={creditNoteAmount} tone="out" />
                  </div>
                  <div className="flex justify-between gap-3 text-md font-semibold text-foreground">
                    <span>A cobrar</span>
                    <Money value={cashAmount} />
                  </div>
                </>
              )}
            </div>

            {/* Fuera del permiso: el backend puede pedir el motivo aunque la
                pantalla no viera rebaja (el precio publicado cambió con el
                carrito armado). Sin el permiso, ese envío termina en un 403 que
                ya explica qué falta. */}
            {needsReason && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sale-discount-reason" className="text-sm font-medium text-foreground">
                  Motivo del descuento
                </label>
                <Input id="sale-discount-reason" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
              </div>
            )}

            {/* F9-32: con efectivo, lo recibido y el cambio. Solo en pantalla, no se envía. */}
            {paymentMethod === 'cash' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="sale-cash-received" className="text-sm font-medium text-foreground">
                    Recibido en efectivo
                  </label>
                  <MoneyInput id="sale-cash-received" size="lg" optional value={cashReceived} onChange={setCashReceived} />
                  {compareMoney(cashAmount, '0') > 0 && <QuickCashButtons due={cashAmount} amounts={quickAmounts} received={cashReceived} onPick={setCashReceived} />}
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-input bg-muted p-3.5" aria-live="polite">
                  {change?.kind === 'short' ? (
                    <>
                      <span className="text-sm font-medium text-body">Falta para completar</span>
                      <Money value={change.amount} className="text-3xl leading-none font-bold tracking-tight text-danger tnum" />
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-body">Cambio a devolver</span>
                      <Money value={change?.amount ?? '0'} className="text-3xl leading-none font-bold tracking-tight text-foreground tnum" />
                    </>
                  )}
                </div>
              </>
            )}

            {hasBelowCost && (
              <label className="flex items-start gap-2 rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">
                <input type="checkbox" className="mt-0.5" checked={belowCostConfirmed} onChange={(e) => setBelowCostConfirmed(e.target.checked)} />
                <span>Confirmo que vendo por debajo del costo: la venta pierde plata en esas piezas.</span>
              </label>
            )}

            {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

            <Button type="submit" size="lg" disabled={createSale.isPending}>
              {createSale.isPending ? (
                'Cobrando…'
              ) : (
                <>
                  Cobrar <Money value={cashAmount} className="ml-1 tnum" />
                </>
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Enter no cobra: el cobro se confirma con el botón.</p>
          </section>
        )}
      </form>

      <AppDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="¿Descartar la venta?"
        description="Vas a perder el carrito que ya armaste."
        size="sm"
        footer={
          <div className="flex w-full flex-col gap-2">
            <Button variant="danger-solid" className="w-full" onClick={() => blocker.proceed?.()}>
              Descartar cambios
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => blocker.reset?.()}>
              Seguir editando
            </Button>
          </div>
        }
      />

      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />

      {/* El comprobante de siempre, cerrado: se monta para que «Imprimir comprobante» imprima su PrintLayout. */}
      {doneSale && <SaleReceiptDialog open={false} onOpenChange={() => {}} sale={doneSale.sale} />}
    </div>
  )
}
