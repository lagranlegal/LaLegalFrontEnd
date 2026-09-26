import { cn } from '@/lib/utils'
import { CONTAINER, DISPLAY } from '../styles'
import { Eyebrow, Reveal } from './primitives'

const PEOPLE = [
  {
    who: 'El dueño',
    title: 'Sabe cuánto ganó, sin esperar al contador.',
    body: 'Cartera, utilidad y caja desde cualquier lugar. Alertas cuando alguien anula una venta o reabre la caja, si las enciendes.',
  },
  {
    who: 'El asesor del mostrador',
    title: 'Atiende rápido, sin hacer cuentas.',
    body: 'El sistema le da el monto exacto de cada abono y le avisa si falta abrir la caja antes de mover plata.',
  },
  {
    who: 'El contador',
    title: 'Recibe números que ya cuadran.',
    body: 'Exportaciones a Excel, cierres de caja con su acta y un registro de auditoría que nadie puede editar.',
  },
]

export function AudienceSection() {
  return (
    <section
      id="para-quien"
      aria-labelledby="para-quien-title"
      className="scroll-mt-16 bg-sidebar py-16 text-sidebar-foreground-strong sm:py-24 lg:scroll-mt-22 lg:py-30"
    >
      <Reveal className={cn(CONTAINER, 'flex flex-col gap-6 sm:gap-12 lg:gap-16')}>
        <div className="flex max-w-190 flex-col gap-4 sm:gap-5">
          <Eyebrow onDark>Para quién</Eyebrow>
          <h2 id="para-quien-title" className={cn(DISPLAY, 'text-section font-bold leading-tight')}>
            Cada persona del negocio ve lo que necesita.
          </h2>
        </div>
        <ul className="grid gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
          {PEOPLE.map((p) => (
            <li
              key={p.who}
              className="flex flex-col gap-3 rounded-panel border border-sidebar-accent bg-sidebar-hover p-6 sm:gap-4.5 sm:rounded-modal sm:p-9"
            >
              <p className={cn(DISPLAY, 'text-sm font-semibold text-brand-on-dark')}>{p.who}</p>
              <h3 className={cn(DISPLAY, 'text-xl font-semibold leading-snug sm:text-2xl')}>{p.title}</h3>
              <p className="text-sm leading-relaxed text-sidebar-foreground sm:text-base">{p.body}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}
