import { cn } from '@/lib/utils'

/**
 * El número de un documento (contrato, venta, recibo, ingreso…) — antes cada
 * feature escribía `` `#${x}` `` como texto plano, sin ningún tratamiento
 * tipográfico (28/08/2026, feedback directo: "se ve muy feo"). El `#` va en
 * `text-muted-foreground` y más chico que el número — es un separador, no
 * el dato — y el número hereda `tnum` (mismo tratamiento que cualquier cifra
 * de la app, CLAUDE.md regla de dinero/tabular numbers).
 */
export function RecordNumber({ value, className }: { value: number | string; className?: string }) {
  return (
    <span className={cn('tnum font-semibold text-foreground', className)}>
      <span className="mr-px font-normal text-muted-foreground">#</span>
      {value}
    </span>
  )
}
