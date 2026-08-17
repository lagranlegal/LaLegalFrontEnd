import { useState } from 'react'
import { es } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { dateOnlyToLocalDate, localDateToDateOnly } from '@/components/shared/DatePicker'
import { formatDate, todayBogota } from '@/lib/dates'
import { cn } from '@/lib/utils'

export interface DateRangeValue {
  from: string
  to: string
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(date.getDate() + days)
  return result
}

function startOfWeekMonday(date: Date): Date {
  const day = date.getDay()
  return addDays(date, day === 0 ? -6 : 1 - day)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function presets(): { label: string; range: DateRangeValue }[] {
  const today = dateOnlyToLocalDate(todayBogota())!
  const yesterday = addDays(today, -1)
  return [
    { label: 'Hoy', range: { from: localDateToDateOnly(today), to: localDateToDateOnly(today) } },
    { label: 'Ayer', range: { from: localDateToDateOnly(yesterday), to: localDateToDateOnly(yesterday) } },
    { label: 'Esta semana', range: { from: localDateToDateOnly(startOfWeekMonday(today)), to: localDateToDateOnly(today) } },
    { label: 'Este mes', range: { from: localDateToDateOnly(startOfMonth(today)), to: localDateToDateOnly(today) } },
  ]
}

/**
 * Variante de rango de `DatePicker` (docs/DESIGN_SYSTEM.md §3) — mismo
 * calendario único, con presets (Hoy, Ayer, Esta semana, Este mes). Primer
 * consumidor: histórico de cierres de caja (paso 6). Igual que `DatePicker`,
 * el valor controlado es siempre `"yyyy-MM-dd"` (nunca `Date` fuera de acá).
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Selecciona un rango',
}: {
  value: DateRangeValue | null
  onChange: (range: DateRangeValue | null) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? { from: dateOnlyToLocalDate(value.from), to: dateOnlyToLocalDate(value.to) } : undefined

  const label = value ? (value.from === value.to ? formatDate(value.from) : `${formatDate(value.from)} – ${formatDate(value.to)}`) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full justify-start gap-2 rounded-input border-border bg-background text-left text-sm font-normal sm:w-auto', !value && 'text-muted-foreground')}
        >
          <CalendarIcon className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-1 border-b border-border p-2 sm:border-r sm:border-b-0">
            {presets().map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="rounded-input px-3 py-1.5 text-left text-sm text-foreground hover:bg-accent"
                onClick={() => {
                  onChange(preset.range)
                  setOpen(false)
                }}
              >
                {preset.label}
              </button>
            ))}
            {value && (
              <button
                type="button"
                className="rounded-input px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                Limpiar
              </button>
            )}
          </div>
          <Calendar
            mode="range"
            locale={es}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected?.from ?? dateOnlyToLocalDate(todayBogota())}
            disabled={{ after: dateOnlyToLocalDate(todayBogota())! }}
            onSelect={(range) => {
              if (!range?.from || !range?.to) return
              onChange({ from: localDateToDateOnly(range.from), to: localDateToDateOnly(range.to) })
              setOpen(false)
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
