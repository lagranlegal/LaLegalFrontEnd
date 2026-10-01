/**
 * Las cifras de una tarjeta de Reportes: una columna bajo 480 px (dos montos
 * lado a lado no caben a 360, F9-06), dos hasta 1024 y cuatro después. Clase
 * completa y estática: Tailwind no ve una armada por interpolación.
 */
export const KPI_GRID = 'grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-4'

/** Igual, para tarjetas de dos o tres cifras. */
export const KPI_GRID_3 = 'grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3'
