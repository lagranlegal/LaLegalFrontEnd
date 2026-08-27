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
import { MoneyInput } from '@/components/shared/MoneyInput'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { formatCOP, multiplyMoney, subtractMoney, sumMoney } from '@/lib/money'
import { AccountPicker } from '@/components/shared/AccountPicker'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useCreateSale } from '@/features/sales/api'
import { allowsFractions, unitAbbr, unitLabel } from '@/lib/inventory/units'
import { useCustomerCreditNotes } from '@/lib/sales/creditNotes'
import { minMoney } from '@/lib/money'
import type { Item } from '@/lib/inventory/items'
import type { Customer } from '@/lib/customers/search'

interface CartLine {
  item: Item
  quantity: number
}

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

export function SaleFormPage() {
  const navigate = useNavigate()
  const createSale = useCreateSale()

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
          line.item.id === item.id ? { ...line, quantity: Math.min(line.quantity + 1, Number(item.quantity)) } : line,
        )
      }
      return [...prev, { item, quantity: 1 }]
    })
  }

  /**
   * Se acota al stock disponible y a un mínimo positivo. El mínimo NO es 1:
   * desde 00036 un producto medido en gramos puede venderse en 0,5 — poner
   * el piso en 1 impediría vender medio gramo de oro, que es justo el caso
   * que la unidad de medida vino a habilitar.
   */
  function updateQuantity(itemId: string, quantity: number) {
    setCart((prev) =>
      prev.map((line) => {
        if (line.item.id !== itemId) return line
        const disponible = Number(line.item.quantity)
        const minimo = allowsFractions(line.item.unit) ? 0.001 : 1
        if (!Number.isFinite(quantity)) return line
        return { ...line, quantity: Math.max(minimo, Math.min(quantity, disponible)) }
      }),
    )
  }

  function removeLine(itemId: string) {
    setCart((prev) => prev.filter((line) => line.item.id !== itemId))
  }

  const subtotal = sumMoney(...cart.map((line) => multiplyMoney(line.item.sale_price ?? '0.00', line.quantity)))
  const hasDiscount = Number(discountAmount) > 0
  const total = hasDiscount ? subtractMoney(subtotal, discountAmount) : subtotal
  const hasCreditNote = !!creditNoteId && Number(creditNoteAmount) > 0
  const cashAmount = hasCreditNote ? subtractMoney(total, creditNoteAmount) : total

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (cart.length === 0) {
      setFormError('Agrega al menos un artículo al carrito.')
      return
    }
    if (hasDiscount && !discountReason.trim()) {
      setFormError('El descuento necesita un motivo.')
      return
    }
    try {
      const sale = await createSale.mutateAsync({
        customer_id: customer?.id ?? null,
        payment_method: paymentMethod,
        account_id: accountId,
        lines: cart.map((line) => ({ item_id: line.item.id, quantity: String(line.quantity), unit_price: line.item.sale_price ?? '0.00' })),
        discount_amount: hasDiscount ? discountAmount : null,
        discount_reason: hasDiscount ? discountReason : null,
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
      setFormError(error instanceof ApiError ? error.message : 'No se pudo registrar la venta. Intenta de nuevo.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/ventas" label="Ventas" />
      <PageHeader title="Nueva venta" description="Busca el artículo por código o nombre y agrégalo al carrito." />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]" noValidate>
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-border bg-card p-card shadow-card">
            <ItemPicker onSelect={addToCart} placeholder="Buscar artículo por código o nombre… (Enter agrega)" />
          </div>

          <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
            {cart.length === 0 ? (
              <p className="p-card text-center text-sm text-muted-foreground">El carrito está vacío — busca un artículo arriba.</p>
            ) : (
              <div className="divide-y divide-border">
                {cart.map(({ item, quantity }) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.code && <span className="font-mono">{item.code}</span>} · <Money value={item.sale_price ?? '0.00'} />
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Contar y PESAR son gestos distintos. Los botones +/-
                          son correctos para cadenas y anillos; para gramos o
                          metros lo natural es escribir la cantidad, y sumar de
                          a 1 g sería absurdo. Por eso la interacción la decide
                          la unidad del producto. */}
                      {allowsFractions(item.unit) ? (
                        <div className="flex items-center gap-1">
                          <input
                            inputMode="decimal"
                            aria-label={`Cantidad en ${unitLabel(item.unit)}`}
                            className="w-20 rounded-input border border-border bg-background px-2 py-1 text-right text-sm tnum outline-none focus:border-primary"
                            defaultValue={quantity}
                            onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          />
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
                      <Money value={multiplyMoney(item.sale_price ?? '0.00', quantity)} className="w-24 text-right font-medium" />
                      <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar" onClick={() => removeLine(item.id)}>
                        <Trash2 className="size-4 text-danger" />
                      </Button>
                    </div>
                  </div>
                ))}
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
                        #{note.number} · saldo {formatCOP(note.balance)}
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
              {hasDiscount && (
                <div>
                  <label className="text-sm font-medium text-foreground">Motivo del descuento</label>
                  <input className={inputClass} value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
                </div>
              )}
            </Can>
          </div>

          <div className="flex flex-col gap-2 rounded-card border border-border bg-card p-card shadow-card text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <Money value={subtotal} />
            </div>
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
