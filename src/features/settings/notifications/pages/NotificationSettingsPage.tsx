import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, MailX } from 'lucide-react'
import { BackLink } from '@/components/shared/BackLink'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { StatusBadge, statusLabel } from '@/components/shared/StatusBadge'
import { confirm } from '@/components/shared/confirmStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError, userMessage } from '@/lib/api/errors'
import { formatDate, formatDateTime } from '@/lib/dates'
import {
  useNotificationDeliveries,
  useNotificationSettings,
  useUpdateNotificationSettings,
  type DeliveryStatus,
  type NotificationEventSetting,
  type NotificationSettings,
  type NotificationSettingsUpdateIn,
} from '@/features/settings/notifications/api'
import {
  ALERTS_PERMISSION_LABEL,
  AUCTION_READY_CUSTOMER,
  AUCTION_READY_CUSTOMER_WARNING,
  buildParamsPatch,
  draftFromSettings,
  enableConfirmDescription,
  groupEvents,
  validateDraft,
  type ParamsDraft,
  type ParamsErrors,
} from '@/features/settings/notifications/logic'
import { ContractClauseNotice } from '@/features/settings/notifications/components/ContractClauseNotice'

const inputClass =
  'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-card p-card shadow-card">
      <div>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor?: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? userMessage(error) : fallback
}

/**
 * Avisos por correo de la empresa (`GET/PATCH /notifications/settings`,
 * API_GUIDE §13-ter; diseño en NOTIFICACIONES.md).
 *
 * Dos formas de guardar, a propósito:
 *  - **Los interruptores** (el general y el de cada evento) se guardan al
 *    tocarlos. Encender es un acto explícito con consecuencias hacia afuera,
 *    así que se confirma EN EL MOMENTO, diciendo a quién se le va a escribir —
 *    no puede viajar escondido en un "Guardar" junto con un umbral.
 *  - **Los parámetros** (umbrales, límites de la Ley 2300, rezago) van en un
 *    formulario con un botón, y el PATCH lleva solo lo que cambió: el backend
 *    audita cada campo con su antes y después.
 */
export function NotificationSettingsPage() {
  const { data: settings, isPending, isError, refetch } = useNotificationSettings()

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/configuracion" label="Configuración" />
      <PageHeader title="Notificaciones" description="Qué correos manda la empresa, a quién, y cuáles salieron." />

      {isPending && (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-card border border-border bg-border" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-start gap-2 rounded-card border border-border bg-card p-card">
          <p className="text-sm text-danger">No se pudo cargar la configuración de notificaciones.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {settings && (
        <>
          <MasterSwitch settings={settings} />
          <EventsSection settings={settings} />
          {/* `key` = lo guardado: cuando el PATCH vuelve, el formulario se
              remonta con los valores del servidor (mismo patrón que
              TemplateDraftPanel, sin useEffect para "resetear"). */}
          <ParamsForm key={JSON.stringify([settings.thresholds, settings.customer_contact_limits, settings.stale_after_days])} settings={settings} />
          <DeliveriesSection settings={settings} />
        </>
      )}
    </div>
  )
}

function MasterSwitch({ settings }: { settings: NotificationSettings }) {
  const update = useUpdateNotificationSettings()

  async function toggle(next: boolean) {
    if (next) {
      const { confirmed } = await confirm({
        title: 'Encender los avisos por correo',
        description: enableConfirmDescription(settings),
        confirmLabel: 'Encender',
      })
      if (!confirmed) return
    }
    try {
      await update.mutateAsync({ enabled: next })
      toast.success(next ? 'Avisos por correo encendidos.' : 'Avisos por correo apagados: no sale ninguno.')
    } catch (error) {
      toast.error(errorText(error, 'No se pudo guardar. Intenta de nuevo.'))
    }
  }

  return (
    <Section title="Avisos por correo">
      {!settings.provider_configured && (
        // Sin nombrar al proveedor (F21-06): a quien administra una
        // compraventa no le dice nada, y no es algo que pueda arreglar él.
        <div className="flex gap-2 rounded-input bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            El envío de correos todavía no está configurado en la plataforma: aunque enciendas todo, <strong>no sale ningún correo</strong>. Las
            entregas quedan registradas abajo como «{statusLabel('skipped_no_provider')}».
          </p>
        </div>
      )}
      <label className="flex items-start gap-3">
        <Checkbox
          checked={settings.enabled}
          disabled={update.isPending}
          onCheckedChange={(v) => toggle(v === true)}
          aria-label="Enviar avisos por correo"
          className="mt-0.5"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">Enviar avisos por correo</span>
          <span className="block text-xs text-muted-foreground">
            Interruptor general. Apagado, no sale ningún correo aunque los avisos de abajo estén marcados. Nace apagado: encenderlo es una
            decisión, no un valor por defecto.
          </span>
        </span>
      </label>
      <div className="text-sm">
        <p className="font-medium text-foreground">Quién recibe el resumen</p>
        {settings.digest_recipients.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nadie todavía. Lo recibe quien tenga el permiso «Recibir por correo el resumen diario y semanal» (Identidad → Roles).
          </p>
        ) : (
          <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
            {settings.digest_recipients.map((r) => (
              <li key={r.user_id} className="break-all">
                {r.full_name} · {r.email}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  )
}

function EventsSection({ settings }: { settings: NotificationSettings }) {
  const update = useUpdateNotificationSettings()
  const groups = groupEvents(settings.events)

  async function save(event: NotificationEventSetting, value: boolean | null) {
    const turningOn = value === true || (value === null && event.default_enabled)
    if (event.code === AUCTION_READY_CUSTOMER && turningOn && !event.enabled) {
      const { confirmed } = await confirm({
        title: 'Aviso de remate al cliente',
        description: AUCTION_READY_CUSTOMER_WARNING,
        tone: 'danger',
        confirmLabel: 'Entiendo, encenderlo',
      })
      if (!confirmed) return
    }
    const body: NotificationSettingsUpdateIn = { events: { [event.code]: value } }
    try {
      await update.mutateAsync(body)
    } catch (error) {
      toast.error(errorText(error, 'No se pudo guardar el aviso. Intenta de nuevo.'))
    }
  }

  return (
    <Section title="Qué avisos se mandan" description="Cada casilla se guarda al marcarla.">
      {!settings.enabled && (
        // Una vez para toda la sección, no por casilla: repetido en cada
        // evento marcado era ruido y tapaba las notas que sí importan.
        <p className="rounded-input bg-warning-soft px-4 py-2 text-sm text-warning">
          El interruptor general está apagado: los avisos marcados quedan listos, pero no sale ninguno.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground">{group.title}</h3>
          {group.note && <p className="text-xs text-muted-foreground">{group.note}</p>}
          {group.key === 'alert' && <AlertRecipients settings={settings} />}
          {group.key === 'customer' && <ContractClauseNotice />}
          <ul className="flex flex-col divide-y divide-border rounded-input border border-border">
            {group.events.map((event) => (
              <li key={event.code} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
                <label className="flex min-w-0 flex-1 items-start gap-3">
                  <Checkbox
                    checked={event.enabled}
                    disabled={update.isPending}
                    onCheckedChange={(v) => save(event, v === true)}
                    aria-label={event.description}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 text-sm text-foreground">
                    {event.description}
                    {event.code === AUCTION_READY_CUSTOMER && (
                      <span className="block text-xs text-warning">Tiene consecuencias legales: lee el aviso antes de encenderlo.</span>
                    )}
                  </span>
                </label>
                {event.overridden && (
                  <button
                    type="button"
                    className="text-xs text-brand underline-offset-2 hover:underline disabled:opacity-50"
                    disabled={update.isPending}
                    onClick={() => save(event, null)}
                  >
                    Volver al predeterminado ({event.default_enabled ? 'encendido' : 'apagado'})
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Section>
  )
}

/** Quién recibe hoy las alertas (A1–A4), de `alert_recipients` (NOTIFICACIONES §19). */
function AlertRecipients({ settings }: { settings: NotificationSettings }) {
  return (
    <div className="text-sm">
      <p className="font-medium text-foreground">Quién recibe las alertas</p>
      {settings.alert_recipients.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nadie todavía. Las recibe quien tenga el permiso {ALERTS_PERMISSION_LABEL} (Identidad → Roles).
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
          {settings.alert_recipients.map((r) => (
            <li key={r.user_id} className="break-all">
              {r.full_name} · {r.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ParamsForm({ settings }: { settings: NotificationSettings }) {
  const update = useUpdateNotificationSettings()
  const [draft, setDraft] = useState<ParamsDraft>(() => draftFromSettings(settings))
  const [errors, setErrors] = useState<ParamsErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  function set<K extends keyof ParamsDraft>(key: K, value: ParamsDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  const patch = buildParamsPatch(settings, draft)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const found = validateDraft(draft)
    setErrors(found)
    if (Object.keys(found).length > 0 || !patch) return
    try {
      await update.mutateAsync(patch)
      toast.success('Parámetros guardados.')
    } catch (error) {
      setFormError(errorText(error, 'No se pudo guardar. Intenta de nuevo.'))
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Section title="Umbrales del resumen" description="En 0 se marca todo. Lo que quede por debajo igual aparece en el resumen, solo que sin la marca de «sobre el umbral».">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Descuentos desde" htmlFor="discount_amount" hint="Descuentos a partir de este monto.">
            <MoneyInput id="discount_amount" className="mt-1" value={draft.discount_amount} onChange={(v) => set('discount_amount', v)} />
          </Field>
          <Field label="Descuadres de caja desde" htmlFor="cash_difference_amount" hint="Diferencia al cierre, en valor absoluto.">
            <MoneyInput
              id="cash_difference_amount"
              className="mt-1"
              value={draft.cash_difference_amount}
              onChange={(v) => set('cash_difference_amount', v)}
            />
          </Field>
          <Field
            label="Descartar avisos atrasados de más de (días)"
            htmlFor="stale_after_days"
            hint="Si el proceso nocturno estuvo caído, un aviso viejo ya no sirve: se registra como «Llegó tarde» en vez de mandarse."
            error={errors.stale_after_days}
          >
            <input
              id="stale_after_days"
              inputMode="numeric"
              className={inputClass}
              value={draft.stale_after_days}
              onChange={(e) => set('stale_after_days', e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Límites de contacto al cliente (Ley 2300)"
        description="Solo aplican a los avisos al cliente, nunca al resumen de la empresa. Los valores de fábrica son una lectura conservadora de la ley, no un concepto legal."
      >
        <label className="flex items-start gap-3">
          <Checkbox
            checked={draft.limits_enabled}
            onCheckedChange={(v) => set('limits_enabled', v === true)}
            aria-label="Aplicar los límites de contacto"
            className="mt-0.5"
          />
          <span className="text-sm text-foreground">Aplicar los límites de contacto</span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Máximo por semana" htmlFor="max_per_week" error={errors.max_per_week}>
            <input id="max_per_week" inputMode="numeric" className={inputClass} value={draft.max_per_week} onChange={(e) => set('max_per_week', e.target.value)} />
          </Field>
          <Field label="Máximo por día" htmlFor="max_per_day" error={errors.max_per_day}>
            <input id="max_per_day" inputMode="numeric" className={inputClass} value={draft.max_per_day} onChange={(e) => set('max_per_day', e.target.value)} />
          </Field>
          <Field label="Lunes a viernes" error={errors.weekday_end}>
            <div className="flex items-center gap-2">
              <input type="time" aria-label="Lunes a viernes, desde" className={inputClass} value={draft.weekday_start} onChange={(e) => set('weekday_start', e.target.value)} />
              <span className="mt-1 text-sm text-muted-foreground">a</span>
              <input type="time" aria-label="Lunes a viernes, hasta" className={inputClass} value={draft.weekday_end} onChange={(e) => set('weekday_end', e.target.value)} />
            </div>
          </Field>
          <Field label="Sábados" error={errors.saturday_end}>
            <div className="flex items-center gap-2">
              <input type="time" aria-label="Sábados, desde" className={inputClass} value={draft.saturday_start} onChange={(e) => set('saturday_start', e.target.value)} />
              <span className="mt-1 text-sm text-muted-foreground">a</span>
              <input type="time" aria-label="Sábados, hasta" className={inputClass} value={draft.saturday_end} onChange={(e) => set('saturday_end', e.target.value)} />
            </div>
          </Field>
        </div>
        <label className="flex items-start gap-3">
          <Checkbox
            checked={draft.sundays_and_holidays}
            onCheckedChange={(v) => set('sundays_and_holidays', v === true)}
            aria-label="Permitir domingos y festivos"
            className="mt-0.5"
          />
          <span className="text-sm text-foreground">Permitir domingos y festivos</span>
        </label>
      </Section>

      {formError && <div className="rounded-input bg-danger-soft px-4 py-2 text-sm text-danger">{formError}</div>}
      <div className="flex justify-end">
        <Button type="submit" className="rounded-pill" disabled={!patch || update.isPending}>
          Guardar parámetros
        </Button>
      </div>
    </form>
  )
}

const ALL = 'all'

const DELIVERY_STATUS_FILTERS: DeliveryStatus[] = [
  'sent',
  'delivered',
  'pending',
  'failed',
  'dead',
  'bounced',
  'unroutable',
  'suppressed',
  'throttled',
  'skipped_stale',
  'skipped_no_provider',
]

function DeliveriesSection({ settings }: { settings: NotificationSettings }) {
  const [statusFilter, setStatusFilter] = useState<string>(ALL)
  const status = statusFilter === ALL ? undefined : (statusFilter as DeliveryStatus)
  const { data, isPending, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotificationDeliveries({ status })
  const deliveries = data?.pages.flatMap((p) => p.items) ?? []
  const descriptions = new Map(settings.events.map((e) => [e.code, e.description]))

  return (
    <Section
      title="Correos recientes"
      description="Incluye los que no salieron: la mayoría son así por diseño (el cliente no tiene correo, el aviso está apagado), no por una falla."
    >
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los estados</SelectItem>
          {DELIVERY_STATUS_FILTERS.map((s) => (
            <SelectItem key={s} value={s}>
              {statusLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-input bg-border" />
          ))}
        </div>
      )}
      {isError && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-danger">No se pudieron cargar los correos.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {!isPending && !isError && deliveries.length === 0 && (
        <EmptyState
          icon={MailX}
          title={status ? 'Ningún correo en ese estado' : 'Todavía no se ha generado ningún correo'}
          description={status ? undefined : 'Los genera el proceso nocturno, una vez que los avisos estén encendidos.'}
        />
      )}
      {deliveries.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-input border border-border">
          {deliveries.map((d) => (
            <li key={d.id} className="flex flex-col gap-1 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-foreground">{descriptions.get(d.event_type) ?? d.event_type}</span>
                <StatusBadge status={d.status} />
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                <span>Del {formatDate(d.occurred_on)}</span>
                <span className="break-all">{d.to_address ?? 'Sin dirección'}</span>
                <span>{d.sent_at ? `Enviado ${formatDateTime(d.sent_at)}` : `Registrado ${formatDateTime(d.created_at)}`}</span>
                {d.attempts > 1 && <span>{d.attempts} intentos</span>}
              </div>
              {d.last_error && <p className="text-xs text-danger">{d.last_error}</p>}
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          Cargar más
        </Button>
      )}
    </Section>
  )
}
