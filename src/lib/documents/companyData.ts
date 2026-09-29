/** Los datos de la empresa que el encabezado y el pie de todo documento impreso muestran. */
export interface PrintableCompany {
  tax_id?: string | null
  address?: string | null
  contact_phone?: string | null
}

const FIELD_LABELS: [keyof PrintableCompany, string][] = [
  ['tax_id', 'el NIT'],
  ['address', 'la dirección'],
  ['contact_phone', 'el teléfono'],
]

/**
 * Qué falta de la empresa para imprimir un documento completo (F8-10). El
 * `PrintLayout` omite en silencio lo que no está —correcto para no pintar
 * «NIT null»—, pero así un comprobante o un contrato salía sin NIT ni
 * dirección y nadie se enteraba hasta tenerlo impreso en la mano.
 */
export function missingCompanyFields(company: PrintableCompany | null | undefined): string[] {
  if (!company) return []
  return FIELD_LABELS.filter(([key]) => !company[key]?.trim()).map(([, label]) => label)
}

/** «el NIT, la dirección y el teléfono». */
export function joinSpanish(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}`
}
