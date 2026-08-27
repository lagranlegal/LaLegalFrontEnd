/**
 * Exportar a `.xlsx`, 100% en el navegador — sin endpoint nuevo en el
 * backend. `rows` ya viene con las claves como van a salir de encabezado
 * (en español, tal como se ven en pantalla), así cada pantalla arma su
 * propia forma de fila sin que este helper conozca ningún dominio.
 *
 * `xlsx` (SheetJS) pesa ~330KB gzip — se carga con `import()` dinámico
 * (fuera del bundle principal) para no penalizar a nadie que nunca exporta
 * nada. Mismo criterio que ya está documentado como pendiente para el resto
 * del bundle (`docs/PENDIENTES_FRONTEND.md` #11.5), aplicado acá porque esta
 * dependencia sí era nueva y evitable desde el día uno.
 */
export async function exportRowsToExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const { utils, writeFile } = await import('xlsx')
  const worksheet = utils.json_to_sheet(rows)
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, worksheet, sheetName)
  writeFile(workbook, filename)
}
