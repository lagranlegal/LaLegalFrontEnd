import { cn } from '@/lib/utils'
import { CONTAINER, DISPLAY, SECTION_Y } from '../styles'
import { Eyebrow, Reveal } from './primitives'

const ITEMS = [
  { title: 'Ley 1581', body: 'Habeas Data: fotos privadas y base legal registrada para cada correo.' },
  { title: 'Ley 2300', body: 'Recordatorios de cobro con horario, sin domingos ni festivos, y máximo uno por semana.' },
  { title: 'Auditoría', body: 'Quién hizo qué y cuándo, en un registro inmutable.' },
  { title: 'Aislamiento', body: 'Ninguna empresa puede ver los datos de otra.' },
]

export function TrustSection() {
  return (
    <section id="confianza" aria-labelledby="confianza-title" className={cn('scroll-mt-16 lg:scroll-mt-22', SECTION_Y)}>
      <Reveal className={cn(CONTAINER, 'grid items-center gap-8 lg:grid-cols-2 lg:gap-24')}>
        <div className="flex flex-col gap-4 sm:gap-5">
          <Eyebrow>Confianza</Eyebrow>
          <h2 id="confianza-title" className={cn(DISPLAY, 'text-section font-bold leading-tight')}>
            Los datos de tus clientes, en privado.
          </h2>
          <p className="text-base leading-relaxed text-body sm:text-lg">
            Cédulas, fotos de prendas y contratos firmados viven en almacenamiento privado. Cada empresa está aislada
            de las demás desde la base de datos.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-5">
          {ITEMS.map((i) => (
            <li key={i.title} className="flex flex-col gap-2.5 rounded-panel border border-border bg-card p-6 sm:p-7">
              <h3 className={cn(DISPLAY, 'text-xl font-semibold')}>{i.title}</h3>
              <p className="text-sm leading-normal text-body sm:text-base">{i.body}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  )
}
