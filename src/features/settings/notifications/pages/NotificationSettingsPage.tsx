import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, MailX } from 'lucide-react'
import { BackLink } from '@/components/shared/BackLink'
import { SummaryCard } from '@/components/shared/SummaryCard'
import { SaveBar, UnsavedChangesGuard } from '@/components/shared/SaveBar'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { StatusBadge, statusLabel } from '@/components/shared/StatusBadge'
import { confirm } from '@/components/shared/confirmStore'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { FieldError, Input, invalidFieldProps } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError, userMessage } from '@/lib/api/errors'
import { formatDate, formatDateTime, formatHourOfDay } from '@/lib/dates'
import {
  useNotificationDeliveries,
  useNotificationSettings,
  useUpdateNotificationSettings,
  type DeliveryStatus,
  type NotificationSettings,
} from '@/features/settings/notifications/api'
import {
  ALERTS_PERMISSION_LABEL,
  AUCTION_READY_CUSTOMER,
  AUCTION_READY_CUSTOMER_WARNING,
  buildSettingsPatch,
  draftFromSettings,
  enableConfirmDescription,
  eventChecked,
  eventLabel,
  groupEvents,
  setEventDraft,
  settingsWithSwitches,
  storedBelowLegalFloor,
  switchesFromSettings,
  turningOn,
  validateDraft,
  type ParamsDraft,
  type ParamsErrors,
  type SwitchesDraft,
} from '@/features/settings/notifications/logic'
import { ContractClauseNotice } from '@/features/settings/notifications/components/ContractClauseNotice'

/**
 * Label arriba, ayuda o error abajo. El error es el `FieldError` de `errorFor`
 * (por defecto, el campo de `htmlFor`): el campo lo enlaza con `invalid` o, en
 * un par de campos que comparten error (las franjas horarias), con
 * `invalidFieldProps(errorFor, …)` en los dos.
 */
function Field({
  label,
  htmlFor,
  errorFor,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  errorFor?: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  const errorFieldId = errorFor ?? htmlFor
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {errorFieldId ? <FieldError fieldId={errorFieldId}>{error}</FieldError> : error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiError ? userMessage(error) : fallback
}

/**
 * Avisos por correo de la empresa (`GET/PATCH /notifications/settings`,
 * API_GUIDE §13-ter; reglas en backend-starter/docs/DOMINIO.md §9).
 *
 * **Un solo modelo de guardado** (issue #6): interruptores, avisos y
 * parámetros se editan en borrador y se guardan juntos con «Guardar cambios»
 * (barra fija abajo mientras haya cambios; salir sin guardar pregunta). Antes
 * las casillas se guardaban al tocarlas y los parámetros con un botón, y era
 * fácil creer que el botón guardaba todo o que las casillas lo necesitaban.
 * Se eligió el botón y no el guardado automático porque aquí una casilla
 * encendida le escribe a clientes reales: un clic de más no puede salir
 * solo. Lo que el guardado automático daba —confirmar al encender, diciendo a
 * quién se le escribe— se conserva: ahora se pregunta al guardar, una
 * confirmación por cada cosa que se enciende. El PATCH lleva solo lo que
 * cambió: el backend audita cada campo con su antes y después.
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
          {/* `key` = lo guardado: cuando el PATCH vuelve, el formulario se
              remonta con los valores del servidor (sin useEffect para
              "resetear"). */}
          <SettingsForm key={JSON.stringify(settings)} settings={settings} />
          <DeliveriesSection settings={settings} />
        </>
      )}
    </div>
  )
}

function SettingsForm({ settings }: { settings: NotificationSettings }) {
  const update = useUpdateNotificationSettings()
  const [switches, setSwitches] = useState<SwitchesDraft>(() => switchesFromSettings(settings))
  const [params, setParams] = useState<ParamsDraft>(() => draftFromSettings(settings))
  const [errors, setErrors] = useState<ParamsErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const patch = buildSettingsPatch(settings, switches, params)
  const dirty = !!patch

  function setParam<K extends keyof ParamsDraft>(key: K, value: ParamsDraft[K]) {
    setParams((d) => ({ ...d, [key]: value }))
  }

  function discard() {
    setSwitches(switchesFromSettings(settings))
    setParams(draftFromSettings(settings))
    setErrors({})
    setFormError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const found = validateDraft(params)
    setErrors(found)
    if (Object.keys(found).length > 0 || !patch) return
    // Encender es un acto con consecuencias hacia afuera: se confirma al
    // guardar, una vez por cada cosa que se enciende, diciendo a quién.
    const on = turningOn(settings, switches)
    if (on.auctionCustomer) {
      const { confirmed } = await confirm({
        title: 'Aviso de remate al cliente',
        description: AUCTION_READY_CUSTOMER_WARNING,
        tone: 'danger',
        confirmLabel: 'Entiendo, encenderlo',
      })
      if (!confirmed) return
    }
    if (on.master) {
      const { confirmed } = await confirm({
        title: 'Encender los avisos por correo',
        description: enableConfirmDescription(settingsWithSwitches(settings, switches)),
        confirmLabel: 'Encender y guardar',
      })
      if (!confirmed) return
    }
    try {
      await update.mutateAsync(patch)
      toast.success(on.master ? 'Cambios guardados. Avisos por correo encendidos.' : 'Cambios guardados.')
    } catch (error) {
      setFormError(errorText(error, 'No se pudo guardar. Intenta de nuevo.'))
      // El backend dice QUÉ campo afloja el piso: se marca junto al campo.
      if (error instanceof ApiError && error.code === 'CONTACT_LIMITS_BELOW_LEGAL_FLOOR' && Array.isArray(error.details?.fields)) {
        setErrors(floorFieldErrors(error.details.fields))
      }
    }
  }

  const belowFloor = storedBelowLegalFloor(settings)
  const groups = groupEvents(settings.events)

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <UnsavedChangesGuard when={dirty} />
      <p className="text-sm text-muted-foreground">
        Nada se guarda hasta que tocas <strong className="font-medium text-foreground">Guardar cambios</strong>, al pie.
      </p>

      <SummaryCard title="Avisos por correo">
        {!settings.provider_configured && (
          // Sin nombrar al proveedor (F21-06): a quien administra una
          // compraventa no le dice nada, y no es algo que pueda arreglar él.
          <div className="flex gap-2 rounded-input bg-warning-soft px-4 py-3 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>
              El envío de correos todavía no está configurado en la plataforma: aunque enciendas todo, <strong>no sale ningún correo</strong>. Las
              entregas quedan registradas abajo como «{statusLabel('skipped_no_provider')}».
            </p>
          </div>
        )}
        <label className="flex items-start gap-3">
          <Checkbox
            checked={switches.enabled}
            disabled={update.isPending}
            onCheckedChange={(v) => setSwitches((d) => ({ ...d, enabled: v === true }))}
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
      </SummaryCard>

      <SummaryCard title="Qué avisos se mandan" description="Marca los que quieres; se guardan con el resto al pie.">
        {!switches.enabled && (
          // Una vez para toda la sección, no por casilla: repetido en cada
          // evento marcado era ruido y tapaba las notas que sí importan.
          <p className="rounded-input bg-warning-soft px-4 py-2 text-sm text-foreground">
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
              {group.events.map((event) => {
                const pendingDefault = switches.events[event.code] === null
                return (
                  <li key={event.code} className="flex flex-wrap items-start justify-between gap-2 px-3 py-2">
                    <label className="flex min-w-0 flex-1 items-start gap-3">
                      <Checkbox
                        checked={eventChecked(event, switches)}
                        disabled={update.isPending}
                        onCheckedChange={(v) => setSwitches((d) => setEventDraft(event, d, v === true))}
                        aria-label={eventLabel(event.description)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 text-sm text-foreground">
                        {eventLabel(event.description)}
                        {event.code === AUCTION_READY_CUSTOMER && (
                          <span className="block text-xs text-warning">Tiene consecuencias legales: lee el aviso antes de encenderlo.</span>
                        )}
                      </span>
                    </label>
                    {event.overridden && !pendingDefault && (
                      <button
                        type="button"
                        className="text-xs text-brand underline-offset-2 hover:underline disabled:opacity-50"
                        disabled={update.isPending}
                        onClick={() => setSwitches((d) => setEventDraft(event, d, null))}
                      >
                        Volver al predeterminado ({event.default_enabled ? 'encendido' : 'apagado'})
                      </button>
                    )}
                    {pendingDefault && <span className="text-xs text-muted-foreground">Vuelve al predeterminado al guardar</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </SummaryCard>

      <SummaryCard
        title="Umbrales del resumen"
        description="En 0 se marca todo. Lo que quede por debajo igual aparece en el resumen, solo que sin la marca de «sobre el umbral»."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Descuentos desde" htmlFor="discount_amount" hint="Descuentos a partir de este monto.">
            <MoneyInput id="discount_amount" className="mt-1" value={params.discount_amount} onChange={(v) => setParam('discount_amount', v)} />
          </Field>
          <Field label="Descuadres de caja desde" htmlFor="cash_difference_amount" hint="Diferencia al cierre, en valor absoluto.">
            <MoneyInput
              id="cash_difference_amount"
              className="mt-1"
              value={params.cash_difference_amount}
              onChange={(v) => setParam('cash_difference_amount', v)}
            />
          </Field>
          <Field
            label="Descartar avisos atrasados de más de (días)"
            htmlFor="stale_after_days"
            hint="Si el proceso nocturno estuvo caído, un aviso viejo ya no sirve: se registra como «Llegó tarde» en vez de mandarse."
            error={errors.stale_after_days}
          >
            <Input
              id="stale_after_days"
              invalid={!!errors.stale_after_days}
              inputMode="numeric"
              value={params.stale_after_days}
              onChange={(e) => setParam('stale_after_days', e.target.value)}
            />
          </Field>
        </div>
      </SummaryCard>

      <SummaryCard
        title="Límites de contacto al cliente (Ley 2300)"
        description="Es un mínimo legal: la empresa lo puede endurecer, pero no relajar. Solo aplica a los avisos al cliente, nunca al resumen de la empresa."
      >
        {belowFloor && (
          <div className="rounded-input bg-warning-soft px-4 py-2 text-sm text-foreground">
            Lo guardado quedaba por debajo del mínimo legal y abajo se ve ajustado. Dale <strong>Guardar cambios</strong> para dejarlo así.
          </div>
        )}
        {/* Siempre encendido (F8-05): apagarlo quitaba la ventana horaria y
            los topes de un golpe. Se deja a la vista, deshabilitado, para
            que se vea que existe y por qué no se toca. */}
        <label className="flex items-start gap-3">
          <Checkbox checked disabled aria-label="Aplicar los límites de contacto" className="mt-0.5" />
          <span className="text-sm text-foreground">
            Aplicar los límites de contacto
            <span className="block text-xs text-muted-foreground">Siempre encendido: la ley aplica a todos los avisos al cliente.</span>
          </span>
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Máximo por semana" htmlFor="max_per_week" hint="0 o 1: la ley permite un contacto de cobranza por semana." error={errors.max_per_week}>
            <Input id="max_per_week" invalid={!!errors.max_per_week} inputMode="numeric" value={params.max_per_week} onChange={(e) => setParam('max_per_week', e.target.value)} />
          </Field>
          <Field label="Máximo por día" htmlFor="max_per_day" error={errors.max_per_day}>
            <Input id="max_per_day" invalid={!!errors.max_per_day} inputMode="numeric" value={params.max_per_day} onChange={(e) => setParam('max_per_day', e.target.value)} />
          </Field>
          <Field label="Lunes a viernes" errorFor="weekday_hours" hint={`Dentro de ${formatHourOfDay('07:00')} a ${formatHourOfDay('19:00')}.`} error={errors.weekday_start ?? errors.weekday_end}>
            <HourRange
              idPrefix="weekday"
              label="Lunes a viernes"
              errorFor="weekday_hours"
              invalid={!!(errors.weekday_start ?? errors.weekday_end)}
              start={params.weekday_start}
              end={params.weekday_end}
              onStart={(v) => setParam('weekday_start', v)}
              onEnd={(v) => setParam('weekday_end', v)}
            />
          </Field>
          <Field label="Sábados" errorFor="saturday_hours" hint={`Dentro de ${formatHourOfDay('08:00')} a ${formatHourOfDay('15:00')}.`} error={errors.saturday_start ?? errors.saturday_end}>
            <HourRange
              idPrefix="saturday"
              label="Sábados"
              errorFor="saturday_hours"
              invalid={!!(errors.saturday_start ?? errors.saturday_end)}
              start={params.saturday_start}
              end={params.saturday_end}
              onStart={(v) => setParam('saturday_start', v)}
              onEnd={(v) => setParam('saturday_end', v)}
            />
          </Field>
        </div>
        <label className="flex items-start gap-3">
          <Checkbox checked={false} disabled aria-label="Permitir domingos y festivos" className="mt-0.5" />
          <span className="text-sm text-foreground">
            Permitir domingos y festivos
            <span className="block text-xs text-muted-foreground">La ley no permite contactar domingos ni festivos.</span>
          </span>
        </label>
      </SummaryCard>

      {formError && <div className="rounded-input bg-danger-soft px-4 py-2 text-sm text-danger">{formError}</div>}
      <SaveBar dirty={dirty} pending={update.isPending} onDiscard={discard} />
    </form>
  )
}

/** Medias horas de 6:00 a. m. a 9:00 p. m.: cubren el piso legal con margen para endurecerlo. */
const HALF_HOURS = Array.from({ length: 31 }, (_, i) => {
  const minutes = 6 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`
})

/**
 * Desde–hasta con la hora en es-CO («7:00 a. m.», F9-55 / issue #16). El campo
 * `time` nativo la mostraba en el formato del sistema («07:00 AM»). Si lo
 * guardado no cae en media hora (lo puso otra versión), se ofrece igual.
 */
function HourRange({
  idPrefix,
  label,
  errorFor,
  invalid,
  start,
  end,
  onStart,
  onEnd,
}: {
  idPrefix: string
  label: string
  errorFor: string
  invalid: boolean
  start: string
  end: string
  onStart: (v: string) => void
  onEnd: (v: string) => void
}) {
  const describedBy = invalidFieldProps(errorFor, invalid)
  const options = (current: string) => (HALF_HOURS.includes(current) ? HALF_HOURS : [...HALF_HOURS, current].sort())
  return (
    <div className="mt-1 flex items-center gap-2">
      <Select value={start} onValueChange={onStart}>
        <SelectTrigger id={`${idPrefix}_start`} aria-label={`${label}, desde`} className="min-w-0 flex-1" {...describedBy}>
          <SelectValue>{formatHourOfDay(start)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options(start).map((h) => (
            <SelectItem key={h} value={h}>
              {formatHourOfDay(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">a</span>
      <Select value={end} onValueChange={onEnd}>
        <SelectTrigger id={`${idPrefix}_end`} aria-label={`${label}, hasta`} className="min-w-0 flex-1" {...describedBy}>
          <SelectValue>{formatHourOfDay(end)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options(end).map((h) => (
            <SelectItem key={h} value={h}>
              {formatHourOfDay(h)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Quién recibe hoy las alertas (A1–A4), de `alert_recipients` (backend-starter/docs/DOMINIO.md §9.1). */
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

const FLOOR_MSG = 'Por debajo del mínimo legal.'

/** `details.fields` de CONTACT_LIMITS_BELOW_LEGAL_FLOOR → errores del formulario. */
function floorFieldErrors(fields: unknown[]): ParamsErrors {
  const errors: ParamsErrors = {}
  for (const f of fields) {
    if (f === 'max_per_week') errors.max_per_week = FLOOR_MSG
    if (f === 'weekday_hours') errors.weekday_end = FLOOR_MSG
    if (f === 'saturday_hours') errors.saturday_end = FLOOR_MSG
  }
  return errors
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
  const descriptions = new Map(settings.events.map((e) => [e.code, eventLabel(e.description)]))

  return (
    <SummaryCard
      title="Correos recientes"
      description="Incluye los que no salieron: la mayoría son así por diseño (el cliente no tiene correo, el aviso está apagado), no por una falla."
    >
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por estado">
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
    </SummaryCard>
  )
}
