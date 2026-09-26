import { cn } from '@/lib/utils'
import { CONTAINER, DISPLAY } from '../styles'
import { Eyebrow, Reveal } from './primitives'

export function MigrationSection() {
  return (
    <section aria-labelledby="migracion-title" className="pb-16 sm:pb-24 lg:pb-34">
      <Reveal className={CONTAINER}>
        <div className="grid items-center gap-8 rounded-modal bg-muted p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:p-16">
          <div className="flex flex-col gap-4 sm:gap-4.5">
            <Eyebrow>Empezar sin empezar de cero</Eyebrow>
            <h2 id="migracion-title" className={cn(DISPLAY, 'text-subsection font-bold leading-tight')}>
              Trae tus contratos vivos, con su saldo real.
            </h2>
            <p className="text-base leading-relaxed text-body sm:text-lg">
              Registra los contratos del sistema anterior con el número que ya tenían. No mueve la caja, porque el
              préstamo ya se entregó.
            </p>
          </div>

          {/* Muestra de la pantalla, no un formulario: nada acá es interactivo. */}
          <div aria-hidden="true" className="flex flex-col gap-3.5 rounded-panel bg-card p-5 shadow-card sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold">Registrar contrato existente</span>
              <span className="rounded-pill bg-muted px-2.5 py-1 font-mono text-sm text-body">C-1042</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5 rounded-input border border-border p-3">
                <span className="text-xs text-muted-foreground">Capital pendiente</span>
                <span className="tnum font-semibold">$ 800.000</span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-input border border-border p-3">
                <span className="text-xs text-muted-foreground">Tasa mensual</span>
                <span className="tnum font-semibold">5 %</span>
              </div>
            </div>
            <div className="rounded-pill bg-sidebar py-3.5 text-center text-sm font-semibold text-sidebar-foreground-strong">
              Registrar
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
