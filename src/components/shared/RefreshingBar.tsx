import { cn } from '@/lib/utils'

/**
 * Barra delgada e indeterminada para cuando una lista YA tiene datos pero está
 * pidiendo otros: buscar, cambiar un filtro, o refrescar después de guardar.
 *
 * Existe porque `isPending` de React Query solo es `true` en la PRIMERA carga.
 * En los refetch posteriores hay datos viejos en pantalla y `isPending` es
 * `false`, así que sin esto la interfaz se queda idéntica mientras la request
 * viaja — y con el backend arrancando en frío (la máquina de Fly duerme) eso
 * son segundos en los que parece que el filtro no hizo nada.
 *
 * No reemplaza al esqueleto: el esqueleto es para cuando no hay NADA que
 * mostrar. Este es para cuando lo que se ve está a punto de cambiar.
 */
export function RefreshingBar({ active, className }: { active: boolean; className?: string }) {
  return (
    <div
      className={cn('h-0.5 w-full overflow-hidden rounded-pill', active ? 'bg-border' : 'bg-transparent', className)}
      role="status"
      aria-live="polite"
      aria-label={active ? 'Actualizando resultados' : ''}
    >
      {active && (
        <div className="h-full w-1/3 animate-[refreshing_1.1s_ease-in-out_infinite] rounded-pill bg-primary motion-reduce:w-full motion-reduce:animate-pulse" />
      )}
    </div>
  )
}
