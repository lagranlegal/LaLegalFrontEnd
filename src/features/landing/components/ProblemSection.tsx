import { cn } from '@/lib/utils'
import { CONTAINER, DISPLAY, SECTION_Y } from '../styles'
import { Eyebrow, Reveal } from './primitives'

const PROBLEMS = [
  {
    title: 'El interés se calcula a mano',
    body: 'Cada abono es una cuenta en la calculadora, y cada cuenta es una oportunidad de cobrar de más o de menos.',
  },
  {
    title: 'Nadie sabe qué está en mora',
    body: 'Las prendas que ya se pueden rematar se quedan en la bodega porque nadie revisó las fechas.',
  },
  {
    title: 'La caja no cuadra, y no se sabe por qué',
    body: 'Préstamos, ventas, gastos y consignaciones en el mismo cajón. Al final del día, la diferencia no tiene explicación.',
  },
]

export function ProblemSection() {
  return (
    <section id="producto" aria-labelledby="problema-title" className={cn('scroll-mt-16 lg:scroll-mt-22', SECTION_Y)}>
      <Reveal className={cn(CONTAINER, 'flex flex-col gap-6 sm:gap-12 lg:gap-16')}>
        <div className="grid items-end gap-5 lg:grid-cols-2 lg:gap-20">
          <div className="flex flex-col gap-4 sm:gap-5">
            <Eyebrow>El problema</Eyebrow>
            <h2 id="problema-title" className={cn(DISPLAY, 'text-section font-bold leading-tight')}>
              El cuaderno, el Excel y la memoria del dueño.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-body sm:text-lg">
            Una compraventa son dos negocios que se miden distinto —el empeño gana por intereses, la tienda por
            margen— y una sola caja que los une. Cuando todo eso vive en papel, los números mienten sin que nadie se
            entere.
          </p>
        </div>

        <ol className="grid gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-6">
          {PROBLEMS.map((p, i) => (
            <li
              key={p.title}
              className="flex gap-4 rounded-card border border-border bg-card p-5 sm:rounded-panel sm:p-7 lg:flex-col lg:p-8"
            >
              <span aria-hidden="true" className={cn(DISPLAY, 'tnum text-2xl font-bold text-ornament sm:text-4xl lg:text-5xl')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex flex-col gap-1 lg:gap-4">
                <h3 className={cn(DISPLAY, 'text-lg font-semibold sm:text-xl lg:text-2xl')}>{p.title}</h3>
                <p className="text-sm leading-relaxed text-body sm:text-base">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  )
}
