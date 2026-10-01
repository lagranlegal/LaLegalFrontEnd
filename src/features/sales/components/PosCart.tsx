import { useState } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Money } from '@/components/shared/Money'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Button } from '@/components/ui/button'
import { compareMoney, multiplyMoney } from '@/lib/money'
import { allowsFractions, unitAbbr } from '@/lib/inventory/units'
import { QuantityInput } from '@/features/sales/components/QuantityInput'
import type { CartLine } from '@/features/sales/cart'

/**
 * El carrito del punto de venta (rediseño P2, maqueta «Punto de venta»):
 * «Carrito · N artículos» con «Vaciar», y por línea nombre, código en mono y
 * detalle, la cantidad, quitar y el monto. Las reglas de precio y costo las
 * decide la página; acá solo se pintan.
 */
export function PosCart({
  cart,
  canDiscount,
  isBelowCost,
  onQuantity,
  onPrice,
  onRemove,
  onClear,
}: {
  cart: CartLine[]
  canDiscount: boolean
  isBelowCost: (line: CartLine) => boolean
  onQuantity: (itemId: string, quantity: number) => void
  onPrice: (itemId: string, unitPrice: string) => void
  onRemove: (itemId: string) => void
  onClear: () => void
}) {
  // Se cuentan líneas, no unidades: sumar 3 + 12,5 g no es un número de artículos.
  const count = cart.length
  return (
    <section aria-labelledby="pos-cart-title" className="flex flex-col gap-1 rounded-card border border-border bg-card p-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pos-cart-title" className="text-md font-semibold text-foreground">
          Carrito{count > 0 && ` · ${count} ${count === 1 ? 'artículo' : 'artículos'}`}
        </h2>
        {count > 0 && (
          <button type="button" className="text-button-sm font-medium text-brand hover:underline" onClick={onClear}>
            Vaciar
          </button>
        )}
      </div>

      {count === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">El carrito está vacío — escanea o busca un artículo arriba.</p>
      ) : (
        <ul className="divide-y divide-border">
          {cart.map((line) => (
            <CartLineRow
              key={line.item.id}
              line={line}
              canDiscount={canDiscount}
              belowCost={isBelowCost(line)}
              onQuantity={(q) => onQuantity(line.item.id, q)}
              onPrice={(p) => onPrice(line.item.id, p)}
              onRemove={() => onRemove(line.item.id)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function CartLineRow({
  line,
  canDiscount,
  belowCost,
  onQuantity,
  onPrice,
  onRemove,
}: {
  line: CartLine
  canDiscount: boolean
  belowCost: boolean
  onQuantity: (quantity: number) => void
  onPrice: (unitPrice: string) => void
  onRemove: () => void
}) {
  const { item, quantity, unitPrice } = line
  const belowPublished = item.sale_price !== null && compareMoney(unitPrice, item.sale_price) < 0
  // El precio se edita plegado, como el descuento (F9-34): la maqueta no lo
  // muestra en la línea. Si ya no es el publicado, queda a la vista.
  const [editingPrice, setEditingPrice] = useState(false)
  const priceChanged = item.sale_price === null || compareMoney(unitPrice, item.sale_price) !== 0
  const showPrice = canDiscount && (editingPrice || priceChanged)
  const stock = Number(item.quantity)
  return (
    // Bajo 560 px el monto va arriba a la derecha y los controles en su propia fila (maqueta).
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 py-3 min-[560px]:grid-cols-[minmax(0,1fr)_auto_auto]">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{item.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {item.code && <span className="font-mono">{item.code}</span>}
          {/* El detalle de la maqueta («3,2 g», «45 cm») es la descripción del artículo: la API no da peso ni medida aparte. */}
          {item.description && <span className="truncate">{item.description}</span>}
          {canDiscount && !showPrice && (
            <button type="button" className="font-medium text-brand hover:underline" onClick={() => setEditingPrice(true)} aria-label={`Cambiar precio de ${item.name}`}>
              Cambiar precio
            </button>
          )}
        </p>
        {/* Cambiar el precio de la línea: solo con permiso de descuentos.
            Bajarlo del publicado ES un descuento (F6-05 del backend): pide
            motivo y queda auditado. */}
        {showPrice && (
          <div className="mt-2 flex items-center gap-2">
            <label htmlFor={`precio-${item.id}`} className="text-xs text-muted-foreground">
              Precio
            </label>
            <MoneyInput id={`precio-${item.id}`} ariaLabel={`Precio de ${item.name}`} className="w-36" value={unitPrice} onChange={onPrice} autoFocus={editingPrice} />
          </div>
        )}
        {belowPublished && <p className="mt-1 text-xs text-warning">Por debajo del precio publicado: cuenta como descuento y necesita motivo.</p>}
        {belowCost && (
          <p className="mt-1 text-xs font-medium text-danger">
            Por debajo del costo (<Money value={item.cost} />): esta pieza se vende con pérdida.
          </p>
        )}
      </div>

      <div className="order-2 col-span-full flex items-center justify-end gap-1.5 min-[560px]:order-1 min-[560px]:col-span-1">
        {/* Contar y PESAR son gestos distintos: +/− para piezas; para gramos o
            metros se escribe la cantidad (sumar de a 1 g sería absurdo). */}
        {allowsFractions(item.unit) ? (
          <div className="flex items-center gap-1">
            <QuantityInput item={item} quantity={quantity} onChange={onQuantity} />
            <span className="text-xs text-muted-foreground">{unitAbbr(item.unit)}</span>
          </div>
        ) : (
          <div className="inline-flex items-center overflow-hidden rounded-input border border-border-strong" role="group" aria-label={`Cantidad de ${item.name}`}>
            <button
              type="button"
              aria-label="Restar"
              className="grid size-10 place-items-center text-foreground hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-transparent"
              disabled={quantity <= 1}
              onClick={() => onQuantity(quantity - 1)}
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-8.5 text-center text-sm font-bold text-foreground tnum">{quantity}</span>
            <button
              type="button"
              aria-label="Sumar"
              className="grid size-10 place-items-center text-foreground hover:bg-muted disabled:text-muted-foreground disabled:hover:bg-transparent"
              disabled={quantity >= stock}
              onClick={() => onQuantity(quantity + 1)}
            >
              <Plus className="size-4" />
            </button>
          </div>
        )}
        <Button type="button" variant="ghost" size="icon" aria-label={`Quitar ${item.name}`} className="text-muted-foreground" onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>

      <Money value={multiplyMoney(unitPrice, quantity)} className="order-1 text-right text-md font-bold whitespace-nowrap text-foreground tnum min-[560px]:order-2" />
    </li>
  )
}
