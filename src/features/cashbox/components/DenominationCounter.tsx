import { useState } from 'react'
import { Money } from '@/components/shared/Money'
import { formatCOP, multiplyMoney, sumMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * Denominaciones del peso colombiano en circulación. El billete de $2.000
 * sigue circulando, y el de $1.000 convive con la moneda del mismo valor —
 * se cuentan juntos porque para el arqueo da lo mismo cuál sea.
 */
const COP_DENOMINATIONS = ['100000.00', '50000.00', '20000.00', '10000.00', '5000.00', '2000.00', '1000.00', '500.00', '200.00', '100.00', '50.00'] as const

const qtyInputClass =
  'w-20 rounded-input border border-border bg-background px-2 py-1 text-right text-sm text-foreground outline-none focus:border-primary'

/**
 * Ayuda para contar el efectivo por denominación en vez de digitar un total
 * de memoria (pedido de Mateo: `counted_cash` era "un número suelto"). NO
 * cambia lo que se manda al backend — sigue siendo un solo `counted_cash`;
 * esto solo evita la suma mental y el error de tipeo.
 *
 * Toda la aritmética pasa por `multiplyMoney`/`sumMoney` (centavos enteros,
 * CLAUDE.md regla 5) — nunca `parseFloat` sobre el dinero.
 */
export function DenominationCounter({ onTotalChange }: { onTotalChange: (total: string) => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const total = sumMoney(...COP_DENOMINATIONS.map((denom) => multiplyMoney(denom, quantities[denom] ?? 0)))

  function handleQuantityChange(denom: string, raw: string) {
    // Solo dígitos: la cantidad de billetes es un entero, y un `-` o un `.`
    // acá solo puede ser un error de tipeo.
    const digits = raw.replace(/\D/g, '')
    const next = { ...quantities, [denom]: digits === '' ? 0 : Number(digits) }
    setQuantities(next)
    onTotalChange(sumMoney(...COP_DENOMINATIONS.map((d) => multiplyMoney(d, next[d] ?? 0))))
  }

  return (
    <div className="flex flex-col gap-2 rounded-input border border-border p-3">
      {/* Dos columnas, no tres: con tres, la etiqueta de una denominación
          quedaba pegada al input de la anterior y el subtotal no alcanzaba a
          entrar. Contar plata se hace mirando, así que el subtotal por línea
          tiene que verse. */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {COP_DENOMINATIONS.map((denom) => {
          const qty = quantities[denom] ?? 0
          return (
            <div key={denom} className="flex items-center gap-2">
              <label htmlFor={`denom-${denom}`} className="tnum w-20 shrink-0 text-sm text-muted-foreground">
                {formatCOP(denom, { maximumFractionDigits: 0 })}
              </label>
              <input
                id={`denom-${denom}`}
                inputMode="numeric"
                className={qtyInputClass}
                value={qty === 0 ? '' : String(qty)}
                placeholder="0"
                onChange={(e) => handleQuantityChange(denom, e.target.value)}
              />
              <Money
                value={multiplyMoney(denom, qty)}
                className={cn('tnum flex-1 text-right text-xs', qty > 0 ? 'text-muted-foreground' : 'text-transparent')}
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
        <span className="font-medium text-foreground">Total contado</span>
        <Money value={total} className="font-semibold" />
      </div>
    </div>
  )
}
