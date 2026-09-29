import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { parseMoneyText, MAX_MONEY_DIGITS } from '@/lib/money'
import { MoneyInput } from '@/components/shared/MoneyInput'

/**
 * F9-23 (ALTO, dinero): el campo quitaba todo lo que no era dígito, incluida
 * la coma decimal, así que pegar «$ 1.234.567,00» —como copian una cifra
 * colombiana Excel y la banca en línea— daba 123.456.700 (×100). Y aceptaba
 * 20 dígitos.
 *
 * Reglas (`parseMoneyText`):
 *  - formato colombiano: el punto separa miles y la coma los decimales;
 *  - formato de EE. UU. («$1,234,567.00»): si el último separador va seguido
 *    de 1 o 2 dígitos es el decimal, sea coma o punto;
 *  - un separador seguido de 3 dígitos es de miles;
 *  - los montos son en PESOS: los centavos se redondean al peso más cercano
 *    (,50 sube), de forma explícita y no por accidente;
 *  - tope de 12 dígitos enteros (hasta $ 999.999.999.999): más que eso no
 *    es un monto de esta operación, es un error de pegado, y se rechaza.
 */

describe('parseMoneyText', () => {
  it.each([
    ['$ 1.234.567,00', '1234567.00'],
    ['1.234.567,00', '1234567.00'],
    ['1234567', '1234567.00'],
    ['1.234.567', '1234567.00'],
    ['$1.234.567,89', '1234568.00'],
    ['1.234.567,50', '1234568.00'],
    ['1.234.567,49', '1234567.00'],
    ['2.500.000,5', '2500001.00'],
    ['1234567.5', '1234568.00'],
    // Formato de EE. UU.: la coma separa miles y el punto los decimales.
    ['$1,234,567.00', '1234567.00'],
    ['1,234,567', '1234567.00'],
    [' COP 45.000 ', '45000.00'],
    ['', '0.00'],
  ])('%s → %s', (texto, esperado) => {
    expect(parseMoneyText(texto)).toBe(esperado)
  })

  it(`más de ${MAX_MONEY_DIGITS} dígitos enteros se rechaza (null)`, () => {
    expect(parseMoneyText('12.345.678.901.234.567.890')).toBeNull()
    expect(parseMoneyText('999.999.999.999')).toBe('999999999999.00')
    expect(parseMoneyText('1.000.000.000.000')).toBeNull()
  })
})

afterEach(cleanup)

describe('MoneyInput — pegar', () => {
  it('pegar «$ 1.234.567,00» en el campo vacío da 1.234.567, no 123.456.700', () => {
    const onChange = vi.fn()
    render(<MoneyInput value="" onChange={onChange} optional ariaLabel="Monto" />)
    fireEvent.paste(screen.getByLabelText('Monto'), { clipboardData: { getData: () => '$ 1.234.567,00' } })
    expect(onChange).toHaveBeenLastCalledWith('1234567.00')
  })

  it('pegar sobre una selección reemplaza solo lo seleccionado', () => {
    const onChange = vi.fn()
    render(<MoneyInput value="5000.00" onChange={onChange} ariaLabel="Monto" />)
    const input = screen.getByLabelText('Monto') as HTMLInputElement
    input.setSelectionRange(0, input.value.length)
    fireEvent.paste(input, { clipboardData: { getData: () => '2.500.000,5' } })
    expect(onChange).toHaveBeenLastCalledWith('2500001.00')
  })

  it('un pegado de más de 12 dígitos no cambia el valor', () => {
    const onChange = vi.fn()
    render(<MoneyInput value="1000.00" onChange={onChange} ariaLabel="Monto" />)
    fireEvent.paste(screen.getByLabelText('Monto'), { clipboardData: { getData: () => '12.345.678.901.234.567.890' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('escribiendo, el dígito 13 no entra', () => {
    const onChange = vi.fn()
    render(<MoneyInput value="999999999999.00" onChange={onChange} ariaLabel="Monto" />)
    fireEvent.change(screen.getByLabelText('Monto'), { target: { value: '999.999.999.9991' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})
