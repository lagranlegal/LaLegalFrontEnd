import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { AppDialog } from '@/components/shared/AppDialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/shared/DatePicker'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { Money } from '@/components/shared/Money'
import { confirm } from '@/components/shared/confirmStore'
import { formatDate, formatDateTime, todayBogota } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/client'
import {
  useActivateCompany,
  useExtendSubscription,
  useSubscriptionEvents,
  useSuspendCompany,
  type Company,
  type SubscriptionEvent,
  type SubscriptionExtendIn,
} from '@/features/platform/api'
import { CompanyStatusBadge } from '@/features/platform/components/CompanyStatusBadge'

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

const EVENT_LABELS: Record<string, string> = {
  created: 'Empresa creada',
  extended: 'Suscripción renovada',
  suspended: 'Acceso suspendido',
  activated: 'Acceso reactivado',
  expired: 'Suscripción vencida',
}

/** Tono por tipo de evento: cortar el acceso y renovar no se leen igual de un vistazo. */
const EVENT_TONES: Record<string, string> = {
  created: 'bg-info-soft text-info',
  extended: 'bg-success-soft text-success',
  suspended: 'bg-danger-soft text-danger',
  activated: 'bg-success-soft text-success',
  expired: 'bg-warning-soft text-warning',
}

function EventRow({ event }: { event: SubscriptionEvent }) {
  return (
    <li className="flex flex-col gap-1 border-b border-border py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn('rounded-pill px-2 py-0.5 text-xs font-medium', EVENT_TONES[event.event_type] ?? 'bg-muted text-muted-foreground')}>
          {EVENT_LABELS[event.event_type] ?? event.event_type}
        </span>
        <span className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
      </div>
      {event.new_expires_at && (
        <p className="text-sm text-foreground">
          {event.previous_expires_at ? `Vencimiento: ${formatDate(event.previous_expires_at)} → ` : 'Vence el '}
          <span className="font-medium">{formatDate(event.new_expires_at)}</span>
        </p>
      )}
      {event.amount && (
        <p className="text-sm text-foreground">
          Pagó <Money value={event.amount} className="font-medium" />
        </p>
      )}
      {event.notes && <p className="text-xs text-muted-foreground">{event.notes}</p>}
    </li>
  )
}

/**
 * Historial comercial de la empresa. Existe porque la fila de `subscription`
 * se sobrescribe en cada renovación (`expires_at` y `notes` se pisan), así que
 * antes no había forma de responder "¿cuántas veces renovó?" ni "¿qué decían
 * las notas de la renovación de marzo?".
 */
function SubscriptionHistory({ companyId }: { companyId: string }) {
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useSubscriptionEvents(companyId)
  const events = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="border-t border-border pt-4">
      <p className="text-sm font-medium text-foreground">Historial de la suscripción</p>
      {isPending && <div className="mt-3 h-20 animate-pulse rounded-input bg-muted/40" />}
      {isError && <p className="mt-2 text-sm text-danger">No se pudo cargar el historial.</p>}
      {!isPending && !isError && events.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Sin movimientos registrados.</p>}
      {events.length > 0 && (
        <>
          <ul className="mt-2">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
          {hasNextPage && (
            <Button variant="ghost" size="sm" className="mt-2 w-full" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
              {isFetchingNextPage ? 'Cargando…' : 'Ver más'}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

/** El caller monta este diálogo con una `key` que cambie en cada apertura (mismo patrón que `SupplierFormDialog`). */
export function CompanyDetailDialog({ open, onOpenChange, company }: { open: boolean; onOpenChange: (open: boolean) => void; company: Company }) {
  const [error, setError] = useState<string | null>(null)
  const suspendCompany = useSuspendCompany()
  const activateCompany = useActivateCompany()
  const extendSubscription = useExtendSubscription()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SubscriptionExtendIn>({ defaultValues: { new_expires_at: '', notes: '' } })

  async function handleToggleStatus() {
    setError(null)
    const isActive = company.status === 'active'
    const result = await confirm({
      title: isActive ? 'Suspender empresa' : 'Reactivar empresa',
      description: isActive
        ? `Nadie en ${company.name} podrá iniciar sesión hasta que se reactive.`
        : `${company.name} vuelve a tener acceso normal.`,
      tone: isActive ? 'danger' : 'default',
      confirmLabel: isActive ? 'Suspender' : 'Reactivar',
    })
    if (!result.confirmed) return
    try {
      if (isActive) {
        await suspendCompany.mutateAsync(company.id)
        toast.success('Empresa suspendida')
      } else {
        await activateCompany.mutateAsync(company.id)
        toast.success('Empresa reactivada')
      }
      // El prop `company` no se actualiza solo (queda cerrado sobre el valor
      // del momento en que se abrió el diálogo) — cerrar acá, igual que
      // `UserDetailDialog` (paso 8), en vez de mostrar un estado/botón
      // viejo hasta que el caller lo reabra.
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.')
    }
  }

  async function onExtend(values: SubscriptionExtendIn) {
    setError(null)
    try {
      await extendSubscription.mutateAsync({
        companyId: company.id,
        body: {
          new_expires_at: values.new_expires_at,
          notes: values.notes || null,
          // `MoneyInput` deja "0.00" cuando el campo queda vacío; mandar 0 como
          // monto pagado sería un dato falso, distinto de "no se registró".
          amount: values.amount && Number(values.amount) > 0 ? values.amount : null,
        },
      })
      toast.success('Suscripción extendida')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ocurrió un error inesperado. Intenta de nuevo.')
    }
  }

  const isPending = suspendCompany.isPending || activateCompany.isPending
  const isSubscriptionExpired = !!company.subscription_expires_at && company.subscription_expires_at < todayBogota()

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title={company.name} size="lg">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Estado</p>
            <CompanyStatusBadge status={company.status} className="mt-1" />
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Creada el</p>
            <p className="text-foreground">{formatDateTime(company.created_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Plan</p>
            <p className="text-foreground">{company.plan_name ?? '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Suscripción vence</p>
            <p className={cn('text-foreground', isSubscriptionExpired && 'font-medium text-danger')}>
              {company.subscription_expires_at ? formatDate(company.subscription_expires_at) : '—'}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          disabled={isPending}
          onClick={handleToggleStatus}
          className={company.status === 'active' ? 'w-full rounded-pill border-danger text-danger hover:bg-danger-soft' : 'w-full rounded-pill'}
        >
          {isPending ? 'Procesando…' : company.status === 'active' ? 'Suspender empresa' : 'Reactivar empresa'}
        </Button>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground">Extender suscripción</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {company.subscription_expires_at
              ? `Vence el ${formatDate(company.subscription_expires_at)} — elige la nueva fecha.`
              : 'Esta empresa no tiene una suscripción activa registrada.'}
          </p>
          <form onSubmit={handleSubmit(onExtend)} className="mt-3 flex flex-col gap-3" noValidate>
            <div>
              <label htmlFor="extend-date" className="text-sm font-medium text-foreground">
                Nueva fecha de expiración
              </label>
              <Controller
                control={control}
                name="new_expires_at"
                rules={{ required: true }}
                render={({ field }) => <DatePicker id="extend-date" value={field.value} onChange={field.onChange} minDate={todayBogota()} />}
              />
              {errors.new_expires_at && <p className="mt-1 text-sm text-danger">Elige una fecha</p>}
            </div>
            <div>
              <label htmlFor="extend-amount" className="text-sm font-medium text-foreground">
                Monto pagado (opcional)
              </label>
              <Controller
                control={control}
                name="amount"
                // `SubscriptionExtendIn.amount` se tipa `number | string | null`
                // (el schema acepta ambos); `MoneyInput` trabaja siempre con el
                // string decimal, que es lo que viaja a la API.
                render={({ field }) => <MoneyInput id="extend-amount" className="mt-1" value={field.value == null ? '' : String(field.value)} onChange={field.onChange} />}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                El cobro se hace por fuera del sistema; registrarlo acá deja el historial de quién pagó cuánto y cuándo.
              </p>
            </div>
            <div>
              <label htmlFor="extend-notes" className="text-sm font-medium text-foreground">
                Notas (opcional)
              </label>
              <textarea id="extend-notes" rows={2} className={inputClass} {...register('notes')} />
            </div>
            <Button type="submit" disabled={extendSubscription.isPending} className="w-full rounded-pill">
              {extendSubscription.isPending ? 'Guardando…' : 'Extender suscripción'}
            </Button>
          </form>
        </div>

        <SubscriptionHistory companyId={company.id} />

        {error && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </AppDialog>
  )
}
