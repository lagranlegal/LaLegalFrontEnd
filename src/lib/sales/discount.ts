import { compareMoney, multiplyMoney, subtractMoney, sumMoney } from '@/lib/money'

export interface PricedLine {
  /** `sale_price` del artículo: el precio que la empresa publicó. */
  publishedPrice: string | null
  /** Lo que se le va a cobrar por unidad. */
  unitPrice: string
  quantity: number | string
}

/**
 * Lo que una venta rebaja del precio publicado, en pesos.
 *
 * Desde F6-05 del backend (27/09/2026) vender una línea por DEBAJO del
 * precio publicado es un descuento igual que el `discount_amount`: exige
 * `sales.apply_discount` y motivo. Por encima es libre. Misma cuenta que
 * `sales/service.py::create_sale` —`(publicado − cobrado) × cantidad`,
 * redondeado por línea antes de sumar— para que el aviso de la pantalla
 * coincida con el `price_discount` que auditaría el backend.
 *
 * Es de PRESENTACIÓN: sirve para pedir el motivo antes de enviar. El precio
 * contra el que compara el backend es el vigente al vender, no el que la
 * pantalla cargó (ver el manejo del 400 en `SaleFormPage`).
 */
export function belowPriceDiscount(lines: PricedLine[]): string {
  return sumMoney(
    ...lines.map((line) =>
      line.publishedPrice !== null && compareMoney(line.unitPrice, line.publishedPrice) < 0
        ? multiplyMoney(subtractMoney(line.publishedPrice, line.unitPrice), line.quantity)
        : '0.00',
    ),
  )
}
