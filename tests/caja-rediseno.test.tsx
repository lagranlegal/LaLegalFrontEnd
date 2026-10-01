import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import fixtures from './fixtures/backend-f1.json'
import type { components } from '@/types/api'
import { describeCashDifference } from '@/lib/cashbox/difference'

/**
 * Rediseño P3 — Caja. La diferencia de un arqueo con palabra («Faltante $
 * 7.000», F9-43), los montos del histórico a la derecha, y el vacío de un
 * rango sin cierres que no esconde lo que entró por banco (issue #12).
 *
 * El cierre es el real de `backend-f1.json` (`acta_con_anulacion.closing`,
 * cuadrado); el faltante y el sobrante son ese mismo cierre con otra
 * `difference` (contado − esperado, con signo, como la guarda el backend).
 * El extracto del banco no tiene fixture real: se tipa contra el
 * `AccountStatementOut` generado para que el compilador defienda su forma.
 */
type Closing = components['schemas']['ClosingHistoryOut']
type Statement = components['schemas']['AccountStatementOut']
type Account = components['schemas']['AccountOut']

const cierreReal = fixtures.acta_con_anulacion.body.closing as Closing
const conFaltante: Closing = { ...cierreReal, session_id: 'faltante', session_date: '2026-09-27', counted_cash: '943000.00', difference: '-7000.00' }
const conSobrante: Closing = { ...cierreReal, session_id: 'sobrante', session_date: '2026-09-26', counted_cash: '953000.00', difference: '3000.00' }

const state = vi.hoisted(() => ({
  closings: [] as unknown[],
  permissions: new Set<string>(['cashbox.view_history', 'accounts.view']),
  statements: {} as Record<string, unknown>,
  accounts: [] as unknown[],
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))
vi.mock('@/lib/permissions/usePermission', () => ({ usePermission: (p: string) => state.permissions.has(p) }))
vi.mock('@/components/shared/Can', () => ({ Can: () => null }))
vi.mock('@/lib/accounts/list', () => ({ useAccounts: () => ({ data: state.accounts, isPending: false }) }))
vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return {
    ...actual,
    api: {
      GET: vi.fn(async (_path: string, opts: { params: { path: { account_id: string } } }) => ({
        data: state.statements[opts.params.path.account_id],
        response: new Response(null, { status: 200 }),
      })),
    },
  }
})
vi.mock('@/lib/cashbox/closings', () => ({
  useClosingsHistory: () => ({
    data: { pages: [{ items: state.closings, next_cursor: null }] },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }),
}))
vi.mock('@/features/cashbox/api', () => ({
  useCashboxCurrent: () => ({ data: null, isPending: false }),
  useTodaySession: () => ({ data: null }),
  useExpenseCategories: () => ({ data: [] }),
  useReopenSession: () => ({ isPending: false, mutateAsync: vi.fn() }),
  reopenSessionErrorMessage: () => '',
  useExpensesList: () => ({ data: undefined, isPending: false, isError: false }),
}))
vi.mock('@/features/cashbox/components/OpenSessionDialog', () => ({ OpenSessionDialog: () => null }))
vi.mock('@/features/cashbox/components/ExpenseFormDialog', () => ({ ExpenseFormDialog: () => null }))
vi.mock('@/features/cashbox/components/CloseSessionDialog', () => ({ CloseSessionDialog: () => null }))
vi.mock('@/features/cashbox/components/ClosingActDialog', () => ({ ClosingActDialog: () => null }))
vi.mock('@/features/accounts/components/TransferDialog', () => ({ TransferDialog: () => null }))
// El selector de rango se reemplaza por uno que ya trae un rango elegido.
vi.mock('@/components/shared/DateRangePicker', async () => {
  const { useEffect } = await import('react')
  return {
    DateRangePicker: ({ onChange }: { onChange: (r: { from: string; to: string }) => void }) => {
      useEffect(() => onChange({ from: '2026-09-01', to: '2026-09-30' }), [onChange])
      return null
    },
  }
})

const { CashboxPage } = await import('@/features/cashbox/pages/CashboxPage')

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <CashboxPage />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  state.closings = []
  state.accounts = []
  state.statements = {}
  state.permissions = new Set(['cashbox.view_history', 'accounts.view'])
})

describe('describeCashDifference', () => {
  it('negativa es faltante, positiva sobrante; el monto va sin signo', () => {
    expect(describeCashDifference('-7000.00')).toEqual({ kind: 'shortage', label: 'Faltante', amount: '7000.00' })
    expect(describeCashDifference('3000.00')).toEqual({ kind: 'surplus', label: 'Sobrante', amount: '3000.00' })
    expect(describeCashDifference(cierreReal.difference)).toMatchObject({ kind: 'even', label: 'Sin diferencia' })
  })
})

describe('histórico de cierres', () => {
  it('la diferencia dice «Faltante» o «Sobrante» con el monto, y los montos van a la derecha', () => {
    state.closings = [cierreReal, conFaltante, conSobrante]
    renderPage()
    const table = screen.getByRole('table')
    for (const name of ['Esperado', 'Contado', 'Diferencia']) {
      expect(within(table).getByRole('columnheader', { name })).toHaveClass('text-right')
    }
    const faltante = within(table).getByText('Faltante')
    expect(faltante).toHaveClass('text-danger')
    expect(faltante.textContent).toMatch(/Faltante \$\s?7\.000/)
    expect(within(table).getByText('Sobrante').textContent).toMatch(/Sobrante \$\s?3\.000/)
    expect(within(table).getByText('Sin diferencia')).toBeInTheDocument()
    expect(table.textContent).not.toMatch(/-\$|−\$/)
  })

  it('un rango sin cierres pero con banco dice que sí hubo movimientos (issue #12)', async () => {
    const banco: Account = { id: 'banco-1', name: 'Bancolombia', type: 'bank' } as Account
    const caja: Account = { id: 'caja-1', name: 'Caja principal', type: 'cash' } as Account
    state.accounts = [caja, banco]
    const extracto: Statement = {
      account_id: banco.id,
      name: banco.name,
      type: 'bank',
      from_date: '2026-09-01',
      to_date: '2026-09-30',
      opening_balance: '0.00',
      total_in: '450000.00',
      total_out: '0.00',
      closing_balance: '450000.00',
      has_running_balance: true,
      lines: [],
    }
    state.statements = { [banco.id]: extracto }
    renderPage()
    expect(await screen.findByText('No hay cierres de caja en este rango')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Pero sí hubo movimientos en otras cuentas:')).toBeInTheDocument())
    const item = screen.getByText('Bancolombia').closest('li')!
    expect(item.textContent).toMatch(/entró \$\s?450\.000/)
    expect(screen.queryByText('Caja principal')).toBeNull()
    expect(screen.getByRole('link', { name: 'Ver el extracto en Cuentas' })).toHaveAttribute('href', '/cuentas')
  })

  it('sin `accounts.view` aclara qué cuentan los cierres y no afirma nada de las cuentas', async () => {
    state.permissions = new Set(['cashbox.view_history'])
    renderPage()
    expect(await screen.findByText('No hay cierres de caja en este rango')).toBeInTheDocument()
    expect(screen.getByText(/Los cierres cuentan solo el efectivo/)).toBeInTheDocument()
    expect(screen.queryByText(/otras cuentas/)).toBeNull()
  })
})
