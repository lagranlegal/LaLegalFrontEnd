import type { Item } from '@/lib/inventory/items'

export interface CartLine {
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
