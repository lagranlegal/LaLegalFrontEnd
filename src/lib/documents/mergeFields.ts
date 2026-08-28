import { formatCOP } from '@/lib/money'
import { formatDate, formatDateTime, todayBogota } from '@/lib/dates'
import type { Contract } from '@/features/contracts/api'
import type { Customer } from '@/lib/customers/search'
import type { Me } from '@/lib/auth/me'
import type { SettlementInfo } from '@/features/contracts/settlement'

export type DocumentType = 'contract' | 'settlement'

export interface MergeFieldDef {
  key: string
  label: string
}

/**
 * Catálogo único por tipo de documento — fuente de verdad tanto del
 * dropdown "Insertar campo" en el editor como de qué keys puede resolver
 * `resolveMergeField`. Si un campo no está acá, no se puede insertar Y no
 * se puede resolver: mismo lugar, ninguna manera de que diverjan.
 */
export const MERGE_FIELDS: Record<DocumentType, MergeFieldDef[]> = {
  contract: [
    { key: 'cliente.nombre', label: 'Nombre del cliente' },
    { key: 'cliente.documento', label: 'Documento del cliente' },
    { key: 'cliente.direccion', label: 'Dirección del cliente' },
    { key: 'cliente.telefono', label: 'Teléfono del cliente' },
    { key: 'contrato.numero', label: 'Número de contrato' },
    { key: 'contrato.codigo_anterior', label: 'Código anterior' },
    { key: 'contrato.fecha_inicio', label: 'Fecha de inicio' },
    { key: 'contrato.vencimiento', label: 'Fecha de vencimiento' },
    { key: 'contrato.capital', label: 'Capital prestado' },
    { key: 'contrato.tasa', label: 'Tasa de interés mensual' },
    { key: 'contrato.plazo', label: 'Plazo' },
    { key: 'contrato.ventana_mora', label: 'Ventana de mora' },
    { key: 'contrato.notas', label: 'Notas del contrato' },
    { key: 'empresa.nombre', label: 'Nombre de la empresa' },
    { key: 'empresa.razon_social', label: 'Razón social' },
    { key: 'empresa.nit', label: 'NIT' },
    { key: 'empresa.direccion', label: 'Dirección de la empresa' },
    { key: 'empresa.telefono', label: 'Teléfono de la empresa' },
    { key: 'fecha_hoy', label: 'Fecha de hoy' },
  ],
  settlement: [
    { key: 'cliente.nombre', label: 'Nombre del cliente' },
    { key: 'cliente.documento', label: 'Documento del cliente' },
    { key: 'contrato.numero', label: 'Número de contrato' },
    { key: 'contrato.fecha_inicio', label: 'Fecha de inicio' },
    { key: 'contrato.capital', label: 'Capital prestado' },
    { key: 'empresa.nombre', label: 'Nombre de la empresa' },
    { key: 'empresa.razon_social', label: 'Razón social' },
    { key: 'empresa.nit', label: 'NIT' },
    { key: 'paz_y_salvo.fecha_cancelacion', label: 'Fecha de cancelación' },
    { key: 'paz_y_salvo.numero_recibo', label: 'Número de recibo del abono que saldó' },
    { key: 'fecha_hoy', label: 'Fecha de hoy' },
  ],
}

/**
 * Combinado de los dos catálogos — el chip de un campo en el editor busca
 * acá por `key` sin necesitar saber de qué `document_type` es la plantilla
 * que lo contiene. Las keys compartidas (`cliente.nombre`, etc.) tienen el
 * mismo label en ambos catálogos a propósito.
 */
export const MERGE_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  [...MERGE_FIELDS.contract, ...MERGE_FIELDS.settlement].map((f) => [f.key, f.label]),
)

export type MergeFieldContext = Record<string, string>

/**
 * Nunca devuelve vacío/undefined en silencio: si la key no existe en el
 * contexto (plantilla vieja apuntando a un campo que ya no existe, o un bug
 * de tipeo), se ve el problema en la vista previa/impresión en vez de
 * desaparecer sin explicación.
 */
export function resolveMergeField(key: string, context: MergeFieldContext): string {
  const value = context[key]
  return value !== undefined ? value : `[campo desconocido: ${key}]`
}

function empresaContext(company: Me['company'] | undefined): MergeFieldContext {
  return {
    'empresa.nombre': company?.name ?? '',
    'empresa.razon_social': company?.legal_name ?? company?.name ?? '',
    'empresa.nit': company?.tax_id ?? '',
    'empresa.direccion': company?.address ?? '',
    'empresa.telefono': company?.contact_phone ?? '',
  }
}

/** Contexto de datos reales — usado por `ContractPrintView` al imprimir de verdad. */
export function buildContractContext(
  contract: Contract,
  customer: Customer | undefined,
  company: Me['company'] | undefined,
): MergeFieldContext {
  return {
    'cliente.nombre': customer?.full_name ?? '—',
    'cliente.documento': customer ? `${customer.doc_type.toUpperCase()} ${customer.doc_number}` : '',
    'cliente.direccion': customer?.address ?? '',
    'cliente.telefono': customer?.phone ?? '',
    'contrato.numero': `#${contract.number}`,
    'contrato.codigo_anterior': contract.legacy_code ? `(código anterior ${contract.legacy_code})` : '',
    'contrato.fecha_inicio': formatDate(contract.start_date),
    'contrato.vencimiento': formatDate(contract.due_date),
    'contrato.capital': formatCOP(contract.principal),
    'contrato.tasa': `${contract.interest_rate_pct}%`,
    'contrato.plazo': `${contract.term_months} ${contract.term_months === 1 ? 'mes' : 'meses'}`,
    'contrato.ventana_mora': `${contract.arrears_window_months} ${contract.arrears_window_months === 1 ? 'mes' : 'meses'}`,
    'contrato.notas': contract.notes ?? '',
    ...empresaContext(company),
    fecha_hoy: formatDate(todayBogota()),
  }
}

/** Contexto de EJEMPLO — usado en el editor para previsualizar sin abrir un contrato real. */
export function buildSampleContractContext(company: Me['company'] | undefined): MergeFieldContext {
  return {
    'cliente.nombre': 'Cliente de ejemplo',
    'cliente.documento': 'CC 1234567890',
    'cliente.direccion': 'Calle 10 # 20-30',
    'cliente.telefono': '3001234567',
    'contrato.numero': '#0000',
    'contrato.codigo_anterior': '',
    'contrato.fecha_inicio': formatDate(todayBogota()),
    'contrato.vencimiento': formatDate(todayBogota()),
    'contrato.capital': formatCOP('1000000'),
    'contrato.tasa': '5%',
    'contrato.plazo': '4 meses',
    'contrato.ventana_mora': '4 meses',
    'contrato.notas': '',
    ...empresaContext(company),
    fecha_hoy: formatDate(todayBogota()),
  }
}

export function buildSettlementContext(
  contract: Contract,
  customer: Customer | undefined,
  company: Me['company'] | undefined,
  settlement: SettlementInfo,
): MergeFieldContext {
  return {
    'cliente.nombre': customer?.full_name ?? '—',
    'cliente.documento': customer ? `${customer.doc_type.toUpperCase()} ${customer.doc_number}` : '',
    'contrato.numero': `#${contract.number}`,
    'contrato.fecha_inicio': formatDate(contract.start_date),
    'contrato.capital': formatCOP(contract.principal),
    ...empresaContext(company),
    'paz_y_salvo.fecha_cancelacion': formatDateTime(settlement.settled_at),
    'paz_y_salvo.numero_recibo': `#${settlement.receipt_number}`,
    fecha_hoy: formatDate(todayBogota()),
  }
}

export function buildSampleSettlementContext(company: Me['company'] | undefined): MergeFieldContext {
  return {
    'cliente.nombre': 'Cliente de ejemplo',
    'cliente.documento': 'CC 1234567890',
    'contrato.numero': '#0000',
    'contrato.fecha_inicio': formatDate(todayBogota()),
    'contrato.capital': formatCOP('1000000'),
    ...empresaContext(company),
    // Dato de ejemplo fijo, no la hora real — CLAUDE.md prohíbe `new
    // Date()` suelto; acá además no hace falta que sea "ahora", es solo
    // una vista previa.
    'paz_y_salvo.fecha_cancelacion': formatDateTime(`${todayBogota()}T12:00:00-05:00`),
    'paz_y_salvo.numero_recibo': '#0000',
    fecha_hoy: formatDate(todayBogota()),
  }
}
