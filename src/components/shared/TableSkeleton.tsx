/**
 * Esqueleto con forma de tabla, para paneles que cargan al desplegarse.
 *
 * Existe porque una barra gris de una línea no se lee como "está cargando"
 * sino como "no hay nada" — reportado probando: al abrir un producto parecía
 * que el panel venía vacío. Un esqueleto que tiene la MISMA forma que lo que
 * va a llegar (encabezado + filas) sí comunica que falta un momento, y evita
 * el salto de layout cuando los datos aterrizan.
 */
export function TableSkeleton({ rows = 3, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2" aria-busy="true" aria-label="Cargando…">
      <div className="flex gap-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 flex-1 animate-pulse rounded bg-border" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-4 flex-1 animate-pulse rounded bg-border"
              // Escalona el arranque: con todas las barras pulsando al mismo
              // tiempo el bloque late como una sola cosa y se lee como un
              // error de render. Desfasadas se leen como actividad.
              style={{ animationDelay: `${(r * columns + c) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
