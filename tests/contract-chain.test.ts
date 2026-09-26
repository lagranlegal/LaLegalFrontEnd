import { describe, expect, it } from 'vitest'
import { chainNeighbors } from '@/features/contracts/chain'
import type { ContractChainLink } from '@/features/contracts/api'

/**
 * La cadena A → B → C tal como la devuelve `GET /contracts/{id}/chain`
 * (forma real de `ContractChainLinkOut`, de la raíz al último).
 */
const link = (over: Partial<ContractChainLink> & Pick<ContractChainLink, 'id' | 'number'>): ContractChainLink => ({
  status: 'superseded',
  parent_contract_id: null,
  start_date: '2026-08-22',
  extended_on: null,
  extension_amount: null,
  principal: '1000000.00',
  capital_balance: '1000000.00',
  ...over,
})
const A = link({ id: 'a', number: 9 })
const B = link({ id: 'b', number: 10, parent_contract_id: 'a', extended_on: '2026-09-11', extension_amount: '500000.00' })
const C = link({ id: 'c', number: 12, parent_contract_id: 'b', status: 'active', extended_on: '2026-09-15', extension_amount: '100000.00' })

describe('chainNeighbors', () => {
  it('desde la raíz: el sucesor es B, pero la deuda vive hoy en C', () => {
    const n = chainNeighbors([A, B, C], 'a')
    expect(n.successor?.number).toBe(10)
    expect(n.current?.number).toBe(12)
    expect(n.parent).toBeNull()
  })

  it('desde el medio: viene de A y pasó a C', () => {
    const n = chainNeighbors([A, B, C], 'b')
    expect(n.parent?.number).toBe(9)
    expect(n.successor?.number).toBe(12)
    expect(n.root?.number).toBe(9)
  })

  it('el último no tiene sucesor', () => {
    const n = chainNeighbors([A, B, C], 'c')
    expect(n.successor).toBeNull()
    expect(n.parent?.number).toBe(10)
  })

  it('sin cadena cargada, nada', () => {
    expect(chainNeighbors(undefined, 'a')).toEqual({ root: null, parent: null, successor: null, current: null })
  })
})
