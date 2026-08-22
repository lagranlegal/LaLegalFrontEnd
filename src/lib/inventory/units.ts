import type { components } from '@/types/api'

export type ProductUnit = NonNullable<components['schemas']['EntryLineIn']['unit']>

/**
 * En qué se mide un producto (00036). Hasta entonces la cantidad era entera en
 * todo el flujo de mercancía, así que ninguna compraventa podía vender por
 * peso ni por medida — ni oro por gramo ni cable por metro.
 *
 * Las etiquetas y abreviaturas viven acá y no en cada pantalla por la misma
 * razón por la que el backend expone `unit_abbr`: si cada lugar tradujera por
 * su cuenta, "12,5 g" y "12,5 gr" terminarían conviviendo en la misma venta.
 */
export const UNIT_LABELS: Record<string, string> = {
  unit: 'Unidad',
  gram: 'Gramo',
  kilogram: 'Kilogramo',
  meter: 'Metro',
  liter: 'Litro',
}

export const UNIT_ABBR: Record<string, string> = {
  unit: 'u',
  gram: 'g',
  kilogram: 'kg',
  meter: 'm',
  liter: 'L',
}

export const SELECTABLE_UNITS: ProductUnit[] = ['unit', 'gram', 'kilogram', 'meter', 'liter']

export function unitLabel(unit: string): string {
  return UNIT_LABELS[unit] ?? unit
}

export function unitAbbr(unit: string): string {
  return UNIT_ABBR[unit] ?? unit
}

/** Espeja `DISCRETE_UNITS` del backend: media cadena no existe. */
export function allowsFractions(unit: string): boolean {
  return unit !== 'unit'
}

/**
 * Cantidad como la lee una persona: sin ceros de relleno.
 *
 * El backend manda `numeric(14,3)`, o sea "12.500" y "2.000". Mostrar "2,000
 * u" de una cadena es ruido que además se lee como dos mil. Se recortan los
 * decimales que no aportan y se deja el separador local.
 */
export function formatQuantity(quantity: string | number, unit?: string): string {
  const n = Number(quantity)
  if (!Number.isFinite(n)) return String(quantity)
  const texto = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(n)
  return unit ? `${texto} ${unitAbbr(unit)}` : texto
}
