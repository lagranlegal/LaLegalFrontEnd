import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Clock, Flag, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Money } from '@/components/shared/Money'
import { Button } from '@/components/ui/button'
import { usePermission } from '@/lib/permissions/usePermission'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { formatDateShort } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ContractAttention } from '@/features/dashboard/api'
import type { ContractsSearch } from '@/app/router'

/**
 * El tono de cada tarjeta cuando HAY algo que hacer. Con 0 todas van en calma
 * (ícono neutro, borde normal): el rojo de un «0 listos para remate» se leía
 * como alarma sin motivo. Clases completas y estáticas (ARQUITECTURA §16).
 */
const TONES = {
  /** El único con borde rojo e ícono relleno: pide actuar hoy. */
  ready: { card: 'border-danger', icon: 'bg-danger-solid text-on-danger-solid' },
  arrears: { card: 'border-border', icon: 'bg-danger-soft text-danger' },
  due: { card: 'border-border', icon: 'bg-info-soft text-info' },
  calm: { card: 'border-border', icon: 'bg-muted text-muted-foreground' },
} as const

function TaskCard({
  count,
  label,
  detail,
  icon: Icon,
  tone,
  estado,
}: {
  count: number
  label: string
  detail: ReactNode
  icon: LucideIcon
  tone: Exclude<keyof typeof TONES, 'calm'>
  /** El filtro con el que abre la lista; sin él, la lista entera. */
  estado?: ContractsSearch['estado']
}) {
  const style = TONES[count > 0 ? tone : 'calm']
  return (
    <Link
      to="/contratos"
      search={estado ? { estado } : {}}
      className={cn(
        'grid min-h-18 grid-cols-[auto_1fr_auto] items-center gap-3 rounded-card border bg-card p-3.5 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        style.card,
      )}
    >
      <span className={cn('grid size-9.5 place-items-center rounded-input', style.icon)}>
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 text-caption leading-snug text-body">
        <span className="block">
          <span className="tnum text-headline leading-none font-bold text-foreground">{count}</span>{' '}
          <b className="font-semibold text-foreground">{label}</b>
        </span>{' '}
        <span className="block">{detail}</span>
      </span>
      <ChevronRight className="size-4.5 text-muted-foreground" aria-hidden />
    </Link>
  )
}

function TodayTasksSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2.5" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-18 animate-pulse rounded-card border border-border bg-card" />
      ))}
    </div>
  )
}

/**
 * «Para hoy» (rediseño P2-c): tres tareas en orden de urgencia, cada una abre
 * la lista de contratos filtrada. «Vencen hoy» abre la lista entera: el
 * listado no tiene un filtro por fecha de cuota.
 */
export function TodayTasks({
  data,
  isPending,
  error,
  onRetry,
}: {
  data: ContractAttention | undefined
  isPending: boolean
  error: unknown
  onRetry: () => void
}) {
  // La pestaña «Listos para remate» del listado exige `contracts.auction`:
  // sin él, esos contratos están en «Prórroga» (su estado real).
  const canAuction = usePermission('contracts.auction')

  if (error) {
    // Un 403 no es una falla (`/me` viejo): la sección no afirma nada.
    if (isPermissionError(error)) return null
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card p-card text-sm text-muted-foreground">
        No se pudo cargar lo que hay para hoy.
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (isPending || !data) return <TodayTasksSkeleton />

  const ready = data.ready_for_auction
  const arrears = data.in_arrears
  const due = data.due_today

  return (
    <section aria-label="Para hoy" className="enter-up grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2.5">
      <TaskCard
        count={ready.count}
        label={ready.count === 1 ? 'listo para remate' : 'listos para remate'}
        detail={
          ready.count === 0 || !ready.earliest_expired_on
            ? 'ninguna prórroga vencida'
            : ready.count === 1
              ? `prórroga vencida el ${formatDateShort(ready.earliest_expired_on)}`
              : `la primera prórroga venció el ${formatDateShort(ready.earliest_expired_on)}`
        }
        icon={Flag}
        tone="ready"
        estado={canAuction ? 'ready_for_auction' : 'in_extension'}
      />
      <TaskCard
        count={arrears.count}
        label="en mora"
        detail={
          arrears.count === 0 ? (
            'ningún contrato atrasado'
          ) : (
            <>
              <Money value={arrears.overdue_interest_total} /> en intereses atrasados
            </>
          )
        }
        icon={TriangleAlert}
        tone="arrears"
        estado="in_arrears"
      />
      <TaskCard
        count={due.count}
        label={due.count === 1 ? 'vence hoy' : 'vencen hoy'}
        detail={
          due.count === 0 ? (
            'nada por cobrar hoy'
          ) : (
            <>
              <Money value={due.amount_total} /> por cobrar
            </>
          )
        }
        icon={Clock}
        tone="due"
      />
    </section>
  )
}
