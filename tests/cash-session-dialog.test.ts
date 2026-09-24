import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * QA F21-07: **todas** las operaciones de dinero avisan igual que la caja está
 * cerrada.
 *
 * `docs/ARCHITECTURE.md` §6 lo dice para `CASH_SESSION_NOT_OPEN`: "Modal
 * central 'Abrir caja' con CTA directo a abrir sesión… **nunca un toast
 * seco**". Once pantallas lo cumplían y el traslado entre cuentas no: pintaba
 * un texto rojo al pie de su propio diálogo, sin botón. Quien ya conocía el
 * recuadro de "Caja cerrada" lo buscaba y no aparecía — y, peor, el aviso no
 * ofrecía ninguna salida.
 *
 * Este test lee el código de verdad (no una lista escrita a mano): cualquier
 * pantalla que decida algo por ese código de error tiene que usar el modal
 * compartido. La duodécima operación que se escriba entra sola.
 */

const SRC = resolve(__dirname, '../src')
const CODIGO = 'CASH_SESSION_NOT_OPEN'
// Se busca el USO en JSX, no el nombre a secas: un comentario que lo
// mencione no es un botón en pantalla.
const MODAL = '<CashSessionRequiredDialog'

/**
 * Archivos que mencionan el código SIN ser una pantalla que reacciona a él:
 * el propio modal, el catálogo central de errores y los hooks/documentación
 * que solo lo nombran. La pantalla que los usa es la que tiene que abrir el
 * modal, y esas sí se verifican.
 */
const NO_SON_PANTALLA = new Set([
  'components/shared/CashSessionRequiredDialog.tsx', // es el modal
  'lib/api/errors.ts', // catálogo central de códigos
  'lib/sales/void.ts', // hook de mutación; lo nombra en su docstring
  'features/cashbox/api.ts', // hooks de caja
])

function archivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
  )
}

describe('el aviso de caja cerrada es uno solo', () => {
  it('toda pantalla que maneja CASH_SESSION_NOT_OPEN abre CashSessionRequiredDialog', () => {
    const sinModal = archivos(SRC)
      .filter((archivo) => readFileSync(archivo, 'utf8').includes(CODIGO))
      .map((archivo) => relative(SRC, archivo).split('\\').join('/'))
      .filter((ruta) => !NO_SON_PANTALLA.has(ruta))
      .filter((ruta) => !readFileSync(join(SRC, ruta), 'utf8').includes(MODAL))
      .sort()

    expect(
      sinModal,
      'estas pantallas deciden por CASH_SESSION_NOT_OPEN sin abrir el modal compartido: ' +
        'el usuario se queda sin el botón "Abrir caja"',
    ).toEqual([])
  })

  it('son las doce operaciones de dinero, y ninguna se quedó sin aviso', () => {
    // Fijado por número para que quitar el manejo de una pantalla (no solo
    // manejarlo mal) también cante.
    const pantallas = archivos(SRC)
      .map((archivo) => ({ ruta: relative(SRC, archivo).split('\\').join('/'), texto: readFileSync(archivo, 'utf8') }))
      .filter(({ ruta, texto }) => texto.includes(CODIGO) && !NO_SON_PANTALLA.has(ruta))

    expect(pantallas.length).toBeGreaterThanOrEqual(12)
  })
})
