import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { ItemPicker } from '@/components/shared/ItemPicker'
import { CustomerPicker } from '@/components/shared/CustomerPicker'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { CashSessionRequiredDialog } from '@/components/shared/CashSessionRequiredDialog'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/client'
import { multiplyMoney, subtractMoney, sumMoney } from '@/lib/money'
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentMethods'
import { useCreateSale } from '@/features/sales/api'
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
  const [cashDialogOpen, setCashDialogOpen] = useState(false)

  function addToCart(item: Item) {
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id)
      if (existing) {
        return prev.map((line) => (line.item.id === item.id ? { ...line, quantity: Math.min(line.quantity + 1, item.quantity) } : line))
      }
      return [...prev, { item, quantity: 1 }]
    })
  }

  function updateQuantity(itemId: string, quantity: number) {
    setCart((prev) => prev.map((line) => (line.item.id === itemId ? { ...line, quantity: Math.max(1, Math.min(quantity, line.item.quantity)) } : line)))
  }

  function removeLine(itemId: string) {
    setCart((prev) => prev.filter((line) => line.item.id !== itemId))
  }

  const subtotal = sumMoney(...cart.map((line) => multiplyMoney(line.item.sale_price ?? '0.00', line.quantity)))
  const hasDiscount = Number(discountAmount) > 0
  const total = hasDiscount ? subtractMoney(subtotal, discountAmount) : subtotal

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
        lines: cart.map((line) => ({ item_id: line.item.id, quantity: line.quantity, unit_price: line.item.sale_price ?? '0.00' })),
        discount_amount: hasDiscount ? discountAmount : null,
        discount_reason: hasDiscount ? discountReason : null,
      })
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
                      <div className="flex items-center gap-1 rounded-input border border-border">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Restar" onClick={() => updateQuantity(item.id, quantity - 1)}>
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm tnum">{quantity}</span>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Sumar" onClick={() => updateQuantity(item.id, quantity + 1)} disabled={quantity >= item.quantity}>
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
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
                <CustomerPicker value={customer} onChange={setCustomer} />
              </div>
              {!customer && <p className="mt-1 text-xs text-muted-foreground">Sin seleccionar: se vende a "Consumidor final".</p>}
            </div>

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

      <CashSessionRequiredDialog open={cashDialogOpen} onOpenChange={setCashDialogOpen} />
    </div>
  )
}
