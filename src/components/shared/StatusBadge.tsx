import {
  Archive,
  ArrowRight,
  Ban,
  Check,
  CheckCheck,
  Circle,
  CircleCheck,
  CircleMinus,
  CircleX,
  Clock,
  Flag,
  Hourglass,
  Layers,
  Lock,
  LockOpen,
  Mail,
  PencilLine,
  RotateCw,
  Send,
  ShieldAlert,
  Star,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Único lugar donde se traducen estados de la API (docs/DESIGN_SYSTEM.md
 * §3). Ninguna feature escribe su propio mapa estado→texto — si falta un
 * estado, se agrega acá.
 */
export const STATUS_LABELS = {
  active: 'Vigente',
  in_arrears: 'En mora',
  in_extension: 'Prórroga',
  ready_for_auction: 'Listo para remate',
  auctioned: 'Rematado',
  paid: 'Pagado',
  draft: 'Borrador',
  available: 'Disponible',
  sold: 'Vendido',
  written_off: 'Dado de baja',
  invited: 'Invitado',
  open: 'Abierta',
  closed: 'Cerrada',
  // Estado de `ContractItemOut.status` mientras la prenda respalda un
  // contrato vigente — visto en pruebas reales (paso 5, contracts).
  in_custody: 'En custodia',
  // `SaleOut.status`. Faltaban desde siempre: el badge de una venta mostraba
  // el valor del enum en inglés en la pantalla de Ventas, que es de uso diario
  // (hallazgo del 27/08, confirmado por la auditoría de QA en la Fase 8).
  completed: 'Completada',
  voided: 'Anulada',
  // 00051. Un contrato AMPLIADO no es un contrato cerrado ni pagado: el
  // cliente sigue debiendo, solo que en el contrato sucesor. La etiqueta
  // tiene que decir eso o se lee como "terminado".
  superseded: 'Ampliado',
  // `ContractItemOut.status` del contrato ampliado: la prenda NO se
  // devolvió, pasó a respaldar el contrato nuevo.
  transferred: 'Pasó al nuevo contrato',
  // `DeliveryOut.status` (00058, avisos por correo). Los cinco últimos son
  // terminales que NO son un error —la mayoría de las filas son de esos—, así
  // que la etiqueta dice qué pasó y no suena a falla.
  pending: 'En cola',
  sending: 'Enviando',
  sent: 'Enviado',
  delivered: 'Entregado',
  bounced: 'Rebotó',
  failed: 'Falló, se reintenta',
  dead: 'No se pudo enviar',
  unroutable: 'Sin correo',
  suppressed: 'Suprimido',
  throttled: 'Tope de contactos',
  skipped_stale: 'Llegó tarde',
  skipped_no_provider: 'Correo no configurado',
} as const

export type KnownStatus = keyof typeof STATUS_LABELS

/**
 * Estados de CLIENTE (`customer_status`: active, frequent, alert). `active`
 * también es un estado de contrato («Vigente») y un cliente no está vigente:
 * está activo (F9-42). Por eso el cliente pasa `kind="customer"`.
 */
const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  frequent: 'Frecuente',
  alert: 'En alerta',
}

/**
 * Los tonos de la propuesta (rediseño P1, §3 «Estados de contrato»). Ningún
 * estado depende solo del color: cada uno lleva ícono y palabra. Clases
 * completas y estáticas a propósito: Tailwind no ve una clase interpolada.
 */
const TONE_CLASSES = {
  /** «Listo para remate»: el ÚNICO estado relleno, porque pide actuar hoy. */
  'danger-solid': 'bg-danger-solid text-on-danger-solid',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  neutral: 'bg-neutral-soft text-body',
} as const

type Tone = keyof typeof TONE_CLASSES

/**
 * El orden de urgencia de los estados de contrato, de arriba abajo: lo que
 * pide actuar hoy primero. Lo usan las leyendas y los conteos por estado.
 */
export const CONTRACT_STATUS_URGENCY = ['ready_for_auction', 'in_arrears', 'in_extension', 'active', 'paid', 'auctioned'] as const

const STATUS_STYLE: Record<KnownStatus, { tone: Tone; Icon: LucideIcon }> = {
  // Contrato, en el orden de urgencia.
  ready_for_auction: { tone: 'danger-solid', Icon: Flag },
  in_arrears: { tone: 'danger', Icon: TriangleAlert },
  in_extension: { tone: 'warning', Icon: Hourglass },
  active: { tone: 'success', Icon: CircleCheck },
  paid: { tone: 'info', Icon: Check },
  auctioned: { tone: 'neutral', Icon: Archive },
  // Un contrato ampliado no es ni bueno ni malo, es un documento reemplazado;
  // pintarlo como pagado diría que se saldó.
  superseded: { tone: 'neutral', Icon: Layers },
  // Inventario y prendas.
  draft: { tone: 'warning', Icon: PencilLine },
  available: { tone: 'success', Icon: CircleCheck },
  sold: { tone: 'info', Icon: Check },
  written_off: { tone: 'neutral', Icon: CircleMinus },
  in_custody: { tone: 'success', Icon: Lock },
  transferred: { tone: 'neutral', Icon: ArrowRight },
  // Usuarios y caja.
  invited: { tone: 'neutral', Icon: Mail },
  open: { tone: 'success', Icon: LockOpen },
  closed: { tone: 'neutral', Icon: Lock },
  // Ventas: una completada se lee como «vendido»; la anulada, en rojo.
  completed: { tone: 'info', Icon: Check },
  voided: { tone: 'danger', Icon: Ban },
  // Entregas: info para lo que salió, ámbar lo que está en vuelo o se va a
  // reintentar, rojo solo lo que se perdió. Lo que no salió POR DISEÑO (sin
  // correo, suprimido, tope, tarde, sin proveedor) va neutro: pintarlo de rojo
  // mandaría a buscar un problema que no existe.
  pending: { tone: 'warning', Icon: Clock },
  sending: { tone: 'warning', Icon: Send },
  sent: { tone: 'info', Icon: Check },
  delivered: { tone: 'info', Icon: CheckCheck },
  bounced: { tone: 'danger', Icon: CircleX },
  failed: { tone: 'warning', Icon: RotateCw },
  dead: { tone: 'danger', Icon: CircleX },
  unroutable: { tone: 'neutral', Icon: CircleMinus },
  suppressed: { tone: 'neutral', Icon: CircleMinus },
  throttled: { tone: 'neutral', Icon: CircleMinus },
  skipped_stale: { tone: 'neutral', Icon: CircleMinus },
  skipped_no_provider: { tone: 'neutral', Icon: CircleMinus },
}

const CUSTOMER_STYLE: Record<string, { tone: Tone; Icon: LucideIcon }> = {
  active: { tone: 'success', Icon: CircleCheck },
  frequent: { tone: 'info', Icon: Star },
  alert: { tone: 'warning', Icon: ShieldAlert },
}

const FALLBACK_STYLE = { tone: 'neutral' as Tone, Icon: Circle }

type StatusKind = 'customer'

function isKnownStatus(status: string): status is KnownStatus {
  return status in STATUS_LABELS
}

export function statusLabel(status: string, kind?: StatusKind): string {
  const customer = kind === 'customer' ? CUSTOMER_STATUS_LABELS[status] : undefined
  if (customer) return customer
  return isKnownStatus(status) ? STATUS_LABELS[status] : status
}

function statusStyle(status: string, kind?: StatusKind) {
  if (kind === 'customer') return CUSTOMER_STYLE[status] ?? FALLBACK_STYLE
  return isKnownStatus(status) ? STATUS_STYLE[status] : FALLBACK_STYLE
}

/**
 * Pastilla de estado: ícono Lucide + palabra + tono. 24 px de alto, 600 · 12,
 * ícono de 13. Es (con los filtros) lo único que lleva forma de pastilla en la
 * app: un botón es un rectángulo.
 */
export function StatusBadge({ status, kind, className }: { status: string; kind?: StatusKind; className?: string }) {
  const { tone, Icon } = statusStyle(status, kind)
  return (
    <span
      data-tone={tone}
      className={cn(
        'inline-flex h-6 items-center gap-1.25 rounded-pill pr-2.25 pl-1.75 text-xs font-semibold whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="size-3.25 shrink-0" aria-hidden />
      {statusLabel(status, kind)}
    </span>
  )
}
