import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import fixtures from './fixtures/backend-f1.json'
import type { Contract } from '@/features/contracts/api'
import { PortfolioBalanceCell } from '@/features/contracts/components/PortfolioBalanceCell'
import { contractsExportRows } from '@/features/contracts/export'

/**
 * Verificación F/G: la lista de contratos mostraba en «Saldo» el
 * `capital_balance` de un rematado o de un ampliado (que conservan la foto
 * de cuando dejaron de estar vivos), mientras el Excel ya los ponía en 0
 * como «Saldo en cartera» (F7-10). La pantalla y el Excel dicen ahora lo
 * mismo. Contratos: respuestas reales del backend local.
 */
const c = fixtures.contratos_por_estado.body as unknown as Record<string, Contract>

afterEach(cleanup)

describe('lista de contratos — Saldo en cartera', () => {
  it.each(['active', 'in_extension'])('%s: muestra su saldo', (estado) => {
    const { container } = render(<PortfolioBalanceCell contract={c[estado]!} />)
    expect(container.textContent).toMatch(/800\.000|1\.000\.000/)
    expect(container.textContent).not.toMatch(/fuera de cartera/)
  })

  it.each(['auctioned', 'superseded'])('%s: $ 0 y dice que ya no está en cartera, como el Excel', (estado) => {
    const contrato = c[estado]!
    expect(Number(contrato.capital_balance)).toBeGreaterThan(0)
    const { container } = render(<PortfolioBalanceCell contract={contrato} />)
    expect(container.textContent).toMatch(/\$\s0/)
    expect(container.textContent).toMatch(/fuera de cartera/)
    const [fila] = contractsExportRows([contrato], new Map())
    expect(fila!['Saldo en cartera']).toBe(0)
  })
})
