/**
 * Desde cuántos caracteres tiene sentido pedirle resultados al servidor.
 *
 * Espejo de `MIN_SEARCH_CHARS` en `backend-starter/app/common/search.py` — el
 * backend es quien manda; esto solo evita el request que ya sabemos que no
 * va a responder nada útil, y le da a la pantalla algo que decir mientras
 * tanto ("Escribe al menos 3 letras" en vez de "Sin resultados", que se lee
 * como "ese cliente no existe").
 *
 * Por qué tres y no uno: con uno o dos, un picker de 8 filas devuelve las
 * primeras ocho de cientos, ordenadas por un id aleatorio. Eso no es un
 * resultado, es ruido que además se ve como una respuesta.
 *
 * **No aplica a lo que se teclea completo**: un número de contrato o un
 * código de inventario se busca desde la primera tecla. El piso es para
 * nombres y documentos.
 */
export const MIN_SEARCH_CHARS = 3

/** ¿Ya hay suficiente texto para consultar? */
export function hasEnoughToSearch(q: string): boolean {
  return q.trim().length >= MIN_SEARCH_CHARS
}
