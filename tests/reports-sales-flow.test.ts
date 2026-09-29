import { describe, expect, it } from 'vitest'
import fixtures from './fixtures/backend-f1.json'
import { salesCashFlow, type ClosingsBreakdownLine, type SalesCashFlow } from '@/features/reports/aggregate'

// Respuesta real del backend local: una venta de 1.000.000, otra de 200.000
// anulada y una devolución pagada de 300.000 (F7-05).
const breakdown = fixtures.closings_breakdown_anulada.body as { lines: ClosingsBreakdownLine[]; sales_flow: SalesCashFlow }

describe('KPI de ventas como flujo de caja (F7-05)', () => {
  it('usa sales_flow del backend: cobrado menos anulaciones y devoluciones pagadas', () => {
    const kpi = salesCashFlow(breakdown.lines, breakdown.sales_flow)
    expect(kpi.neto).toBe('500000.00')
    expect(kpi.anulaciones).toBe('200000.00')
    expect(kpi.devolucionesPagadas).toBe('300000.00')
  })

  it('sin sales_flow (backend anterior) arma la misma cifra con las líneas', () => {
    expect(salesCashFlow(breakdown.lines, null).neto).toBe(breakdown.sales_flow.net_sales_flow)
  })

  it('con el filtro de Empeño no hay ventas', () => {
    expect(salesCashFlow(breakdown.lines, breakdown.sales_flow, 'pawn').neto).toBe('0.00')
  })
})
