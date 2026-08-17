import { useState } from 'react'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { formatDate, todayBogota } from '@/lib/dates'
import { cn } from '@/lib/utils'

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Construye la fecha en componentes locales (no `new Date(iso)`) — mismo
 * cuidado que `formatDate` para no correr un día por timezone. Exportado
 * para que `DateRangePicker` (mismo calendario, modo rango) no duplique
 * esta conversión — uso interno de UI de calendario, no cruza a la API
 * (eso sigue prohibido fuera de `lib/dates.ts`, que nunca usa `Date`).
 */
export function dateOnlyToLocalDate(dateOnly: string): Date | undefined {
  const match = DATE_ONLY_RE.exec(dateOnly)
  if (!match) return undefined
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function localDateToDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * EL calendario único de la app (docs/DESIGN_SYSTEM.md §3): react-day-picker
 * vía shadcn, locale `es`, semana inicia lunes, formato `dd/MM/yyyy`. El
 * valor controlado es SIEMPRE un string `"yyyy-MM-dd"` (el mismo formato de
 * fecha-sin-hora que usa la API) — nunca un `Date` fuera de este componente,
 * para no reabrir el riesgo de corrimiento de día por timezone que motivó
 * `formatDate` (`lib/dates.ts`).
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecciona una fecha',
  disabled,
  minDate,
  maxDate,
  id,
}: {
  value: string
  onChange: (dateOnly: string) => void
  placeholder?: string
  disabled?: boolean
  /** `yyyy-MM-dd` — días antes de esta fecha quedan deshabilitados en el calendario. */
  minDate?: string
  /** `yyyy-MM-dd` — días después de esta fecha quedan deshabilitados (ej. "no puede ser futura" → `todayBogota()`). */
  maxDate?: string
  id?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? dateOnlyToLocalDate(value) : undefined
  const matchers = [
    minDate ? { before: dateOnlyToLocalDate(minDate)! } : null,
    maxDate ? { after: dateOnlyToLocalDate(maxDate)! } : null,
  ].filter((m): m is { before: Date } | { after: Date } => m !== null)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start gap-2 rounded-input border-border bg-background text-left text-sm font-normal',
            !value && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="size-4" />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={es}
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? dateOnlyToLocalDate(todayBogota())}
          disabled={matchers.length > 0 ? matchers : undefined}
          onSelect={(date) => {
            if (!date) return
            onChange(localDateToDateOnly(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
