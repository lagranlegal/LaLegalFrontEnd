import { describe, expect, it } from 'vitest'
import {
  entryOriginLabel,
  exitTypeLabel,
  entryOriginTouchesCash,
  ENTRY_ORIGIN_HINTS,
  SELECTABLE_ENTRY_ORIGINS,
  SELECTABLE_EXIT_TYPES,
} from '@/lib/inventory/entryTypes'

describe('etiquetas de tipos de ingreso y egreso', () => {
  it('traduce los orígenes, incluido el remate que no se puede elegir a mano', () => {
    expect(entryOriginLabel('purchase')).toBe('Compra a proveedor')
    expect(entryOriginLabel('initial_stock')).toBe('Inventario inicial')
    expect(entryOriginLabel('adjustment_in')).toBe('Sobrante de conteo')
    // Lo emite el remate de un contrato, no un formulario — pero hay que
    // saber nombrarlo al listar los ingresos.
    expect(entryOriginLabel('auction')).toBe('Remate de contrato')
  })

  it('un valor desconocido se muestra tal cual en vez de quedar vacío', () => {
    // Fallback seguro, mismo criterio que `conceptLabel`: si el backend agrega
    // un enum antes que el front, se ve feo pero legible — nunca `undefined`.
    expect(entryOriginLabel('production')).toBe('production')
    expect(exitTypeLabel('donation')).toBe('donation')
  })

  it('pérdida y daño son tipos distintos', () => {
    // Contablemente no son lo mismo: un daño es mercancía que existe y ya no
    // sirve; una pérdida es mercancía que no está.
    expect(exitTypeLabel('damage')).toBe('Daño')
    expect(exitTypeLabel('loss')).toBe('Pérdida o hurto')
    expect(SELECTABLE_EXIT_TYPES).toContain('loss')
  })

  it('solo la compra mueve plata', () => {
    // El resto registra mercancía que ya está: si alguno tocara caja, le
    // sacaría a la empresa una plata que nunca salió.
    expect(entryOriginTouchesCash('purchase')).toBe(true)
    for (const origen of SELECTABLE_ENTRY_ORIGINS.filter((o) => o !== 'purchase')) {
      expect(entryOriginTouchesCash(origen)).toBe(false)
    }
    expect(entryOriginTouchesCash('auction')).toBe(false)
  })

  it('todo origen elegible tiene etiqueta y explicación', () => {
    // Un tipo sin explicación deja al usuario adivinando cuál elegir, que es
    // exactamente el problema que tenía "Otro".
    for (const origen of SELECTABLE_ENTRY_ORIGINS) {
      expect(entryOriginLabel(origen)).not.toBe(origen)
      expect(ENTRY_ORIGIN_HINTS[origen].length).toBeGreaterThan(20)
    }
  })
})
