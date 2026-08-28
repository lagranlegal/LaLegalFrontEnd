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
  await exportSheetsToExcel(filename, [{ name: sheetName, rows }])
}

/**
 * Igual que `exportRowsToExcel`, pero con varias hojas en un mismo archivo
 * — para reportes agregados (Reportes: Resumen/Desglose/Rankings), donde el
 * dato ya no es "una fila por registro" sino varias tablas distintas
 * armadas en la misma pantalla.
 */
export async function exportSheetsToExcel(filename: string, sheets: { name: string; rows: Record<string, unknown>[] }[]) {
  const { utils, writeFile } = await import('xlsx')
  const workbook = utils.book_new()
  for (const sheet of sheets) {
    // Nombre de hoja de Excel: máximo 31 caracteres, sin : \ / ? * [ ].
    const safeName = sheet.name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31)
    const worksheet = utils.json_to_sheet(sheet.rows)
    utils.book_append_sheet(workbook, worksheet, safeName)
  }
  writeFile(workbook, filename)
}
