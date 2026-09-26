import { cn } from '@/lib/utils'
import { CONTAINER, DISPLAY, SECTION_Y } from '../styles'
import { Eyebrow, Reveal } from './primitives'

type Kind = 'income' | 'capital' | 'measure'

const KIND_CLASS: Record<Kind, string> = {
  income: 'text-success',
  capital: 'text-muted-foreground',
  measure: 'text-foreground',
}

const ENGINES: { name: string; tag: string; rows: { label: string; value: string; kind: Kind }[] }[] = [
  {
    name: 'Empeño',
    tag: 'Gana por intereses',
    rows: [
      { label: 'Intereses cobrados', value: 'Ingreso', kind: 'income' },
      { label: 'Capital devuelto por el cliente', value: 'Movimiento de capital', kind: 'capital' },
      { label: 'Rendimiento sobre la cartera', value: 'Se mide así', kind: 'measure' },
    ],
  },
  {
    name: 'Tienda',
    tag: 'Gana por margen',
    rows: [
      { label: 'Precio de venta − costo del lote', value: 'Utilidad bruta', kind: 'income' },
      { label: 'Costo por pieza, nunca promediado', value: 'Identificación específica', kind: 'capital' },
      { label: 'Utilidad bruta y margen del período', value: 'Se mide así', kind: 'measure' },
    ],
  },
]

const CASHBOX = [
  { label: 'Arqueo', value: 'Billete por billete, esperado vs. contado' },
  { label: 'Descuadre', value: 'No cierra sin justificación' },
  { label: 'Acta', value: 'Desglose por módulo y medio de pago' },
]

export function EnginesSection() {
  return (
    <section aria-labelledby="motores-title" className={SECTION_Y}>
      <Reveal className={cn(CONTAINER, 'flex flex-col gap-6 sm:gap-12 lg:gap-16')}>
        <div className="flex max-w-190 flex-col gap-4 sm:gap-5">
          <Eyebrow>Dos motores, una caja</Eyebrow>
          <h2 id="motores-title" className={cn(DISPLAY, 'text-section font-bold leading-tight')}>
            Cada peso, en el bolsillo que es.
          </h2>
          <p className="text-base leading-relaxed text-body sm:text-lg">
            Prestar no es un gasto. Cobrar el capital no es ganancia. Vender no es utilidad hasta restarle el costo.
            Prendo lleva la contabilidad de cada motor por separado, y los une en una caja diaria que tiene que
            cuadrar.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
          {ENGINES.map((e) => (
            <article
              key={e.name}
              aria-labelledby={`motor-${e.name}`}
              className="flex flex-col gap-5 rounded-panel border border-border bg-card p-6 sm:gap-6 sm:rounded-modal sm:p-10"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 id={`motor-${e.name}`} className={cn(DISPLAY, 'text-2xl font-semibold sm:text-3xl')}>
                  {e.name}
                </h3>
                <span className="rounded-pill bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand">{e.tag}</span>
              </div>
              <dl className="flex flex-col text-sm text-body sm:text-base">
                {e.rows.map((r, i) => (
                  <div
                    key={r.label}
                    className={cn(
                      'flex flex-wrap justify-between gap-x-4 gap-y-1 py-3.5',
                      i === 0 && 'pt-0',
                      i < e.rows.length - 1 ? 'border-b border-muted' : 'pb-0',
                    )}
                  >
                    <dt>{r.label}</dt>
                    <dd className={cn('font-semibold', KIND_CLASS[r.kind])}>{r.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <div className="grid gap-6 rounded-panel bg-sidebar p-6 text-sidebar-foreground-strong sm:rounded-modal sm:p-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr] lg:items-center lg:gap-10 lg:px-12">
          <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-1">
            <h3 className={cn(DISPLAY, 'text-2xl font-semibold sm:text-3xl')}>Una caja diaria</h3>
            <p className="text-sm leading-normal text-sidebar-foreground sm:text-base">
              Abre con lo contado, cierra con lo contado.
            </p>
          </div>
          {CASHBOX.map((c) => (
            <div
              key={c.label}
              className="flex flex-col gap-1.5 border-t border-sidebar-accent pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
            >
              <span className="text-sm text-sidebar-muted-foreground">{c.label}</span>
              <span className="text-base font-medium">{c.value}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
