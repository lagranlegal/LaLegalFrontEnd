import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/backend-g2.json'
import { formatDateTime, formatTime, setActiveTimezone, BOGOTA_TZ } from '@/lib/dates'
import { formatPercent } from '@/lib/percent'
import { buildContractContext } from '@/lib/documents/mergeFields'

/**
 * Issue #16: horas en es-CO («1:31 p. m.», no «1:31 PM») y porcentajes con
 * coma decimal y espacio («5,00 %», no «5.00%»). Las funciones, y un barrido
 * del código para que nadie vuelva a formatear a mano.
 */
describe('formatos es-CO', () => {
  it('la hora dice a. m. / p. m., en la zona de la empresa', () => {
    setActiveTimezone(BOGOTA_TZ)
    expect(formatDateTime('2026-09-30T18:31:00Z')).toBe('30/09/2026 1:31 p. m.')
    expect(formatTime('2026-09-30T05:24:00Z')).toBe('12:24 a. m.')
    expect(formatTime('2026-09-30T17:24:00Z')).toBe('12:24 p. m.')
  })

  it('el porcentaje lleva coma decimal y espacio; `auto` quita los ceros de relleno', () => {
    expect(formatPercent('5.00')).toBe('5,00 %')
    expect(formatPercent(2.68)).toBe('2,68 %')
    expect(formatPercent(12, 0)).toBe('12 %')
    expect(formatPercent('70.00', 'auto')).toBe('70 %')
    expect(formatPercent('70.5', 'auto')).toBe('70,5 %')
  })

  it('la tasa del contrato impreso con plantilla sale «5,00 %» (contrato real de backend-g2)', () => {
    const contrato = fixtures.contrato_nuevo.body as Parameters<typeof buildContractContext>[0]
    expect(buildContractContext(contrato, undefined, undefined)['contrato.tasa']).toBe(formatPercent(contrato.interest_rate_pct))
    expect(buildContractContext(contrato, undefined, undefined)['contrato.tasa']).toMatch(/^\d+,\d{2} %$/)
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && path !== join('src', 'types', 'api.ts') ? [path] : []
  })
}

/**
 * Pendientes conocidos, con su motivo: Reportes lo trabaja otro frente en
 * paralelo (rediseño P3-a) y el formulario de nuevo contrato también. Al
 * tocarlos, se quitan de aquí.
 */
const PENDIENTES = new Set([
  'src/features/reports/components/PerformanceCards.tsx',
  'src/features/reports/components/ModuleSplitBar.tsx',
  'src/features/reports/pages/ReportesPage.tsx',
  // Ya sale «5,5 % mensual» (reemplaza el punto a mano); falta pasarlo por formatPercent.
  'src/features/contracts/pages/ContractFormPage.tsx',
])

describe('barrido: nadie formatea horas ni porcentajes a mano', () => {
  const files = sourceFiles('src').filter((f) => f !== join('src', 'lib', 'dates.ts') && f !== join('src', 'lib', 'percent.ts'))

  it('ninguna hora con el patrón en inglés de date-fns ni toLocaleTimeString', () => {
    const offenders = files.filter((f) => /['"`][^'"`]*\bh:mm a\b|toLocaleTimeString|hour12/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('ningún porcentaje pegado a mano («{x}%», «x.toFixed(1)%»): va por formatPercent', () => {
    const offenders = files
      .filter((f) => !PENDIENTES.has(f))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => ({ line, at: `${f}:${i + 1}` }))
          // Un ancho o alto en % (estilos, barras) no es un texto.
          .filter(({ line }) => !/width|height|style=|translate|\/\/|^\s*\*/.test(line))
          .filter(({ line }) => /\}%|\$\{[^}]+\}\s?%|toFixed\(\d\)\}?\s?%/.test(line))
          .map(({ at }) => at),
      )
    expect(offenders).toEqual([])
  })
})
