import { describe, expect, it } from 'vitest'
import { accountTypeLabel, cashOnHand, defaultAccountTypeFor } from '@/lib/accounts/types'
import { paymentMethodLabel } from '@/lib/paymentMethods'
import { aggregateFinancialSummary, type ClosingsBreakdownLine } from '@/features/reports/aggregate'

function line(overrides: Partial<ClosingsBreakdownLine> & Pick<ClosingsBreakdownLine, 'module' | 'direction' | 'concept' | 'total' | 'session_date'>): ClosingsBreakdownLine {
  return {
    payment_method: 'cash',
    account_id: 'acc-1',
    account_name: 'Caja',
    account_type: 'cash',
    ...overrides,
  }
}

describe('defaultAccountTypeFor', () => {
  it('efectivo va al cajón; todo lo demás a una cuenta bancaria', () => {
    expect(defaultAccountTypeFor('cash')).toBe('cash')
    expect(defaultAccountTypeFor('transfer')).toBe('bank')
    expect(defaultAccountTypeFor('other')).toBe('bank')
  })

  it('replica lo que hace el backend cuando el front no manda account_id', () => {
    // Si esta correspondencia se desincroniza de
    // `resolve_account_for_movement`, la UI preseleccionaría una cuenta y el
    // backend usaría otra — el usuario vería un destino y la plata caería en
    // otro. Ver docs/ARCHITECTURE.md §12.
    expect(defaultAccountTypeFor('cualquier_cosa')).toBe('bank')
  })
})

describe('accountTypeLabel', () => {
  it('traduce los tres tipos', () => {
    expect(accountTypeLabel('cash')).toBe('Efectivo')
    expect(accountTypeLabel('bank')).toBe('Banco')
    expect(accountTypeLabel('settlement')).toBe('Por cobrar')
  })

  it('un tipo desconocido se muestra tal cual en vez de romper', () => {
    expect(accountTypeLabel('crypto')).toBe('crypto')
  })
})

describe('paymentMethodLabel', () => {
  it('un movimiento sin medio de pago es plata que cambió de cuenta, no "Otro"', () => {
    // `payment_method` pasó a ser opcional en la migración 00027: liquidar un
    // convenio mueve plata entre cuentas sin cobrarse por ningún medio.
    // Mostrarlo como "Otro" lo confundiría con un cobro por Nequi o similar.
    expect(paymentMethodLabel(null)).toBe('Entre cuentas')
    expect(paymentMethodLabel('other')).toBe('Otro')
  })
})

describe('aggregateFinancialSummary con movimientos sin medio de pago', () => {
  it('no descarta ni rompe con payment_method nulo', () => {
    const summary = aggregateFinancialSummary(
      [
        line({ module: 'store', direction: 'in', concept: 'sale', payment_method: null, total: '80000.00', session_date: '2026-08-01' }),
        line({ module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', total: '20000.00', session_date: '2026-08-01' }),
      ],
      ['2026-08-01'],
    )

    // La plata entró: cuenta como ingreso igual que cualquier otra venta.
    expect(summary.ingresosOperativos).toBe('100000.00')

    // Pero se agrupa aparte, no dentro de un medio de pago que no existió.
    const byMethod = Object.fromEntries(
      summary.ingresosOperativosByPaymentMethod.map((row) => [row.paymentMethod, row.total]),
    )
    expect(byMethod['inter_account']).toBe('80000.00')
    expect(byMethod['cash']).toBe('20000.00')
  })
})

describe('traslados entre cuentas en el resumen financiero', () => {
  it('consignar el efectivo no inventa ingresos, gastos ni flujo', () => {
    // El caso real: se vendieron 100.000 en efectivo y al final del día se
    // consignaron 80.000 en el banco. Lo que el negocio ganó sigue siendo
    // 100.000 — la consignación no es un gasto ni mueve plata hacia afuera.
    //
    // Registrar el traslado como gasto (que era la única salida antes de
    // 00032) habría reportado 80.000 de gasto que nunca existieron, y sumarlo
    // al flujo habría inflado entradas y salidas por el mismo monto.
    const summary = aggregateFinancialSummary(
      [
        line({ module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', total: '100000.00', session_date: '2026-08-21' }),
        line({ module: 'general', direction: 'out', concept: 'transfer_out', payment_method: 'cash', total: '80000.00', session_date: '2026-08-21' }),
        line({ module: 'general', direction: 'in', concept: 'transfer_in', payment_method: 'transfer', total: '80000.00', session_date: '2026-08-21' }),
      ],
      ['2026-08-21'],
    )

    expect(summary.ingresosOperativos).toBe('100000.00')
    expect(summary.gastosOperativos).toBe('0.00')
    // El flujo cuenta la venta y nada más: el traslado no entró ni salió del
    // negocio, cambió de bolsillo.
    expect(summary.flujoEntradas).toBe('100000.00')
    expect(summary.flujoSalidas).toBe('0.00')
  })

  it('el traslado sigue visible en el desglose por concepto', () => {
    // Excluirlo de los totales no es esconderlo: el acta del cierre tiene que
    // mostrar que esa plata salió del cajón, o el arqueo no se explica.
    const summary = aggregateFinancialSummary(
      [line({ module: 'general', direction: 'out', concept: 'transfer_out', payment_method: 'cash', total: '80000.00', session_date: '2026-08-21' })],
      ['2026-08-21'],
    )

    expect(summary.totalsByConcept.some((row) => row.concept === 'transfer_out' && row.total === '80000.00')).toBe(true)
  })
})

describe('cuentas por cobrar en el flujo de caja', () => {
  it('una venta con Sistecrédito NO es flujo: esa plata no ha llegado', () => {
    // Encontrado auditando la matriz completa de conceptos contra cómo los
    // trata cada reporte — algo que ningún test miraba, porque cada test cubre
    // un camino solo. Con datos reales del dev: 1.000.000 en ventas contra una
    // cuenta `settlement` se estaba contando como plata que se movió.
    //
    // La migración 00024 lo dice literal: "settlement — el dinero NO está:
    // alguien te lo debe".
    const summary = aggregateFinancialSummary(
      [
        line({ module: 'store', direction: 'in', concept: 'sale', payment_method: 'cash', account_type: 'cash', total: '450000.00', session_date: '2026-08-22' }),
        line({ module: 'store', direction: 'in', concept: 'sale', payment_method: 'other', account_type: 'settlement', total: '1000000.00', session_date: '2026-08-22' }),
      ],
      ['2026-08-22'],
    )

    // Las DOS son ingreso operativo: la venta ocurrió y el ingreso se reconoce
    // al vender, no al cobrar.
    expect(summary.ingresosOperativos).toBe('1450000.00')
    // Pero solo entró plata por una.
    expect(summary.flujoEntradas).toBe('450000.00')
  })

  it('liquidar cuenta el ingreso al banco, no la salida de la cuenta por cobrar', () => {
    // Al liquidar, la plata llega DE VERDAD al banco: eso sí es flujo. Lo que
    // sale de la cuenta por cobrar no es una salida — es la deuda que se
    // extingue, y contarla inflaba `flujoSalidas` sin que saliera un peso.
    const summary = aggregateFinancialSummary(
      [
        line({ module: 'store', direction: 'out', concept: 'settlement_out', payment_method: 'other', account_type: 'settlement', total: '1000000.00', session_date: '2026-08-22' }),
        line({ module: 'store', direction: 'in', concept: 'settlement_in', payment_method: 'transfer', account_type: 'bank', total: '940000.00', session_date: '2026-08-22' }),
      ],
      ['2026-08-22'],
    )

    expect(summary.flujoEntradas).toBe('940000.00')
    expect(summary.flujoSalidas).toBe('0.00')
    // La comisión de 60.000 no aparece como gasto: no es plata que salió, es
    // plata que nunca llegó — ya está implícita en que entró menos.
    expect(summary.gastosOperativos).toBe('0.00')
  })

  it('funciona igual con los movimientos históricos, que quedaron como `adjustment`', () => {
    // `cash_movement` es inmutable a propósito, así que las liquidaciones
    // anteriores a 00038 conservan `concept='adjustment'`. Por eso la
    // exclusión se hace por TIPO DE CUENTA y no por concepto: si dependiera
    // del concepto, el arreglo solo valdría para lo nuevo.
    const summary = aggregateFinancialSummary(
      [line({ module: 'store', direction: 'out', concept: 'adjustment', payment_method: 'other', account_type: 'settlement', total: '500000.00', session_date: '2026-08-01' })],
      ['2026-08-01'],
    )

    expect(summary.flujoSalidas).toBe('0.00')
  })
})

describe('cashOnHand — el efectivo del cajón que se arquea al abrir', () => {
  const cuenta = (type: string, balance: string) => ({ type, balance })

  it('suma solo las cuentas de efectivo', () => {
    // El banco y las cuentas por cobrar NO están en el cajón: contarlas haría
    // que el diálogo de apertura pidiera contar plata que nadie puede tocar.
    expect(
      cashOnHand([
        cuenta('cash', '292000.00'),
        cuenta('bank', '2431000.00'),
        cuenta('settlement', '150000.00'),
      ]),
    ).toBe('292000.00')
  })

  it('suma varios cajones, que desde el backend 00048 tienen saldos propios', () => {
    // Antes las cuentas `cash` derivaban su saldo de la única sesión abierta,
    // así que TODAS reportaban el mismo número y sumarlas habría multiplicado
    // el efectivo. Ahora cada cajón tiene el suyo y la suma es la correcta.
    expect(cashOnHand([cuenta('cash', '292000.00'), cuenta('cash', '50000.00')])).toBe('342000.00')
  })

  it('sin cuentas de efectivo da cero, no NaN', () => {
    expect(cashOnHand([cuenta('bank', '2431000.00')])).toBe('0.00')
    expect(cashOnHand([])).toBe('0.00')
  })

  it('no pasa por parseFloat: suma sobre centavos enteros', () => {
    // Tres saldos que en punto flotante darían 0.30000000000000004.
    expect(cashOnHand([cuenta('cash', '0.10'), cuenta('cash', '0.10'), cuenta('cash', '0.10')])).toBe('0.30')
  })
})
