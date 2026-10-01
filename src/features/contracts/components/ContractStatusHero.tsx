import { Archive, Check, CircleCheck, Flag, Hourglass, Layers, TriangleAlert, type LucideIcon } from 'lucide-react'
import { todayBogota, formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { usePaymentOptions, type Contract } from '@/features/contracts/api'
import { contractStatusHero, type HeroTone, type StatusHero } from '@/features/contracts/contractStatus'
import type { SettlementInfo } from '@/features/contracts/settlement'

/** Los estados que admiten abono: solo ellos piden `payment-options`. */
export const PAYABLE_STATUSES = new Set(['active', 'in_arrears', 'in_extension'])

/**
 * La tarjeta de estado del detalle (F9-16, rediseño P2-a): el estado ES el
 * encabezado. Titular grande, las cifras que el cliente pregunta («¿cuánto
 * para ponerme al día?», «¿cuánto para sacarla?») y la línea de tiempo con el
 * hoy marcado. Va en todos los estados, no solo en los que piden acción: en
 * uno vigente dice hasta cuándo está pagado, que es lo que se consulta.
 */
export function ContractStatusHero({ contract, settlement }: { contract: Contract; settlement?: SettlementInfo | null }) {
  if (PAYABLE_STATUSES.has(contract.status)) return <PayableStatusHero contract={contract} />
  return <StatusHeroView hero={contractStatusHero(contract, { today: todayBogota(), settlement })} />
}

function PayableStatusHero({ contract }: { contract: Contract }) {
  // Misma key que el panel de abono: no es un request más.
  const { data: quote } = usePaymentOptions(contract.id)
  return <StatusHeroView hero={contractStatusHero(contract, { quote, today: todayBogota() })} />
}

// Clases completas y estáticas: Tailwind no ve una clase interpolada.
const TONES: Record<HeroTone, { box: string; icon: string; now: string; late: string }> = {
  danger: { box: 'border-danger/35 bg-danger-soft', icon: 'text-danger', now: 'border-danger bg-danger', late: 'bg-danger' },
  warning: { box: 'border-warning/35 bg-warning-soft', icon: 'text-warning', now: 'border-warning bg-warning', late: 'bg-warning' },
  success: { box: 'border-success/35 bg-success-soft', icon: 'text-success', now: 'border-success bg-success', late: 'bg-success' },
  info: { box: 'border-info/35 bg-info-soft', icon: 'text-info', now: 'border-info bg-info', late: 'bg-info' },
  neutral: { box: 'border-border bg-neutral-soft', icon: 'text-muted-foreground', now: 'border-border-strong bg-border-strong', late: 'bg-border-strong' },
}

/** El mismo ícono que la pastilla del estado (`StatusBadge`). */
const ICONS: Record<string, LucideIcon> = {
  ready_for_auction: Flag,
  in_arrears: TriangleAlert,
  in_extension: Hourglass,
  active: CircleCheck,
  paid: Check,
  auctioned: Archive,
  superseded: Layers,
}

const GRID_COLS: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }

/** La vista, sin datos: lo que arma `contractStatusHero`. */
export function StatusHeroView({ hero }: { hero: StatusHero }) {
  const tone = TONES[hero.tone]
  const Icon = ICONS[hero.status] ?? CircleCheck
  return (
    <section role="status" aria-label="Estado del contrato" data-tone={hero.tone} className={cn('grid gap-4 rounded-card border p-4.5', tone.box)}>
      <div className="flex items-center gap-2.5">
        <Icon className={cn('size-5.5 shrink-0', tone.icon)} aria-hidden />
        <div className="min-w-0">
          <p className="font-display text-headline font-bold tracking-headline text-foreground">{hero.title}</p>
          {hero.detail && <p className="tnum text-sm font-medium text-body">{hero.detail}</p>}
        </div>
      </div>

      {hero.figures.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {hero.figures.map((f) => (
            <div key={f.label} className="grid content-start gap-0.5">
              <dt className="text-xs text-body">{f.label}</dt>
              <dd className={cn('tnum leading-tight font-bold text-foreground', f.big ? 'text-figure-lg' : 'text-headline')}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {hero.timeline && hero.timeline.length > 1 && (
        <div className="relative pt-4.5">
          {/* La barra: un tramo por par de puntos y la cola tras el último. */}
          <div aria-hidden className="absolute top-1.5 right-1.5 left-1.5 flex h-1 overflow-hidden rounded-pill">
            {hero.segments.map((s, i) => (
              <span key={i} className={cn('flex-1', s === 'done' ? 'bg-success' : s === 'late' ? tone.late : 'bg-border-strong')} />
            ))}
            <span className="flex-1 bg-border-strong" />
          </div>
          <ol aria-label="Línea de tiempo del contrato" className={cn('grid gap-0.5 text-2xs sm:gap-1 sm:text-xs', GRID_COLS[hero.timeline.length])}>
          {hero.timeline.map((p) => (
            <li key={p.label} aria-current={p.state === 'now' ? 'date' : undefined} className="relative grid min-w-0 gap-px text-body">
              <span
                aria-hidden
                className={cn(
                  'absolute -top-4.25 left-0 size-3 rounded-full border-3',
                  p.state === 'now' ? tone.now : p.state === 'done' ? 'border-success bg-card' : 'border-border-strong bg-card',
                )}
              />
              <span className="truncate">{p.label}</span>
              <b className="tnum font-semibold whitespace-nowrap text-foreground">{formatDate(p.date)}</b>
            </li>
          ))}
          </ol>
        </div>
      )}
    </section>
  )
}
