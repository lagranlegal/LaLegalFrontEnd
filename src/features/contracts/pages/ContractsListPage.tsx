import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { SearchInput } from '@/components/shared/SearchInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LegacyCodeBadge } from '@/components/shared/LegacyCodeBadge'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { Money } from '@/components/shared/Money'
import { PortfolioBalanceCell } from '@/features/contracts/components/PortfolioBalanceCell'
import { Can } from '@/components/shared/Can'
import { usePermission } from '@/lib/permissions/usePermission'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FilterChip } from '@/components/shared/FilterChip'
import { formatDate, todayBogota } from '@/lib/dates'
import { useCustomer } from '@/lib/customers/search'
import {
  fetchAllContracts,
  useContractsList,
  useContractSearch,
  useReadyForAuction,
  type Contract,
  type ContractListItem,
  type ContractSort,
} from '@/features/contracts/api'
import { fetchAllCustomers } from '@/features/customers/api'
import { effectiveContractStatus } from '@/features/contracts/contractStatus'
import { CONTRACT_SORT_OPTIONS, sortFromOrden } from '@/features/contracts/listSort'
import type { ContractsSearch } from '@/app/router'
import { exportRowsToExcel } from '@/lib/export/xlsx'
import { contractsExportRows } from '@/features/contracts/export'

const STATUS_TABS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Vigentes' },
  { value: 'in_arrears', label: 'En mora' },
  { value: 'in_extension', label: 'Prórroga' },
  { value: 'ready_for_auction', label: 'Listos para remate' },
  { value: 'auctioned', label: 'Rematados' },
]

/**
 * Una fila de la tabla: el listado trae el cliente (`ContractListItemOut`,
 * issue #10); «Listos para remate» sale de otro endpoint, que devuelve
 * `ContractOut` sin él.
 */
type ContractRow = Contract & Partial<Pick<ContractListItem, 'customer_name' | 'customer_document'>>

type ContractsListSearch = ContractsSearch

/** Nombre y documento en subleyenda, como «Requieren acción» del Inicio. */
function CustomerLines({ name, document }: { name: string; document?: string }) {
  return (
    <span className="block min-w-0">
      <span className="block font-medium break-words text-foreground">{name}</span>
      {document && <span className="tnum block text-xs text-muted-foreground">{document}</span>}
    </span>
  )
}

/**
 * El cliente de una fila de «Listos para remate», que llega sin él: se pide
 * por id (la lista es corta y cada cliente queda en caché) y solo con
 * `customers.view`; sin el permiso la celda queda en raya, nunca un 403.
 */
function ReadyCustomerCell({ customerId }: { customerId: string }) {
  const canViewCustomers = usePermission('customers.view')
  const { data } = useCustomer(canViewCustomers ? customerId : '')
  if (!data) return <span className="text-muted-foreground">—</span>
  return <CustomerLines name={data.full_name} document={data.doc_number} />
}

const columns: ColumnDef<ContractRow>[] = [
  {
    accessorKey: 'number',
    header: 'Número',
    cell: (info) => (
      <div className="flex flex-wrap items-center justify-end gap-2 md:justify-start">
        <RecordNumber value={info.getValue<number>()} />
        {info.row.original.legacy_code && <LegacyCodeBadge code={info.row.original.legacy_code} />}
      </div>
    ),
  },
  {
    id: 'customer',
    header: 'Cliente',
    cell: (info) => {
      const row = info.row.original
      return row.customer_name !== undefined ? (
        <CustomerLines name={row.customer_name} document={row.customer_document} />
      ) : (
        <ReadyCustomerCell customerId={row.customer_id} />
      )
    },
  },
  {
    accessorKey: 'principal',
    header: 'Capital',
    meta: { align: 'right' },
    cell: (info) => <Money value={info.getValue<string>()} className="whitespace-nowrap" />,
  },
  {
    accessorKey: 'capital_balance',
    header: 'Saldo en cartera',
    meta: { align: 'right' },
    cell: (info) => <PortfolioBalanceCell contract={info.row.original} />,
  },
  {
    accessorKey: 'due_date',
    header: 'Vencimiento',
    cell: (info) => <span className="tnum whitespace-nowrap">{formatDate(info.getValue<string>())}</span>,
  },
  { accessorKey: 'status', header: 'Estado', cell: (info) => <StatusBadge status={effectiveContractStatus(info.row.original)} /> },
]

export function ContractsListPage() {
  // `?estado=` (las tarjetas «Para hoy» del Inicio abren la lista filtrada) y
  // `?orden=` viven en la URL: sobreviven al F5 y el enlace se comparte.
  const search = useSearch({ strict: false }) as ContractsListSearch
  const canAuction = usePermission('contracts.auction')
  const navigate = useNavigate()
  // Sin `contracts.auction` la pestaña de remate no existe: ese `?estado=`
  // cae en «Todos» (no hay un `?status=ready_for_auction` en `GET /contracts`).
  const status = search.estado === 'ready_for_auction' && !canAuction ? '' : (search.estado ?? '')
  const sort = sortFromOrden(search.orden)
  const [q, setQ] = useState('')
  const isSearching = q.trim().length > 0

  // `replace`: cambiar un filtro no es una página nueva en el historial. Lo
  // vacío se borra de la URL (la pantalla limpia es `/contratos` a secas).
  function setSearch(cambios: ContractsListSearch) {
    void navigate({
      to: '/contratos',
      search: (prev: ContractsListSearch) => {
        const next = { ...prev, ...cambios }
        if (!next.estado) delete next.estado
        if (!next.orden) delete next.orden
        return next
      },
      replace: true,
    })
  }
  const setStatus = (value: string) => setSearch({ estado: (value || undefined) as ContractsSearch['estado'] })
  // Cambiar de orden es otra consulta (el `sort` va en la llave de
  // `useContractsList`): arranca en la primera página, como exige el cursor.
  const setSort = (value: ContractSort) => setSearch({ orden: CONTRACT_SORT_OPTIONS.find((o) => o.sort === value)?.value })

  // "Listos para remate" NO es un status real (ver `contractStatus.ts`) — no
  // existe un `?status=ready_for_auction` en `GET /contracts`. Esa pestaña
  // usa el endpoint dedicado `GET /contracts/ready-for-auction` en su lugar;
  // `useContractsList` se sigue llamando con `''` mientras tanto (reusa el
  // cache de "Todos", sin pedir nada nuevo) porque los hooks no pueden
  // llamarse condicionalmente.
  // El endpoint exige `contracts.auction` (el mismo permiso de Rematar): sin
  // él la pestaña no se muestra y la lista no se pide — antes cada Asesor
  // que abría Contratos dejaba un 403 en la consola.
  const statusTabs = canAuction ? STATUS_TABS : STATUS_TABS.filter((tab) => tab.value !== 'ready_for_auction')
  const isReadyTab = canAuction && status === 'ready_for_auction'
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useContractsList(isReadyTab ? '' : status, sort)
  const { data: readyContracts, isPending: readyPending, isError: readyError, refetch: refetchReady } = useReadyForAuction({ enabled: isReadyTab })
  const { data: searchResults, isPending: searchPending, isError: searchError, refetch: refetchSearch } = useContractSearch(q, sort)
  const [isExporting, setIsExporting] = useState(false)

  const contracts: ContractRow[] = isSearching
    ? (searchResults ?? [])
    : isReadyTab
      ? (readyContracts ?? [])
      : (data?.pages.flatMap((page) => page.items) ?? [])

  // Exporta por ESTADO (igual que la pestaña activa), no por el buscador
  // libre de arriba. "Listos para remate" tampoco es un `status` real
  // (`GET /contracts/ready-for-auction` es su propio endpoint, sin cursor) —
  // se exporta la lista completa tal cual la trae ese endpoint, sin pasar por
  // `fetchAllContracts`. Los clientes se siguen bajando aparte: el Excel
  // dice «CC 1032456789» y el listado trae el documento sin su tipo.
  async function handleExport() {
    setIsExporting(true)
    try {
      const allContracts = isReadyTab ? (readyContracts ?? []) : await fetchAllContracts(status, sort)
      const customers = await fetchAllCustomers()
      const customerById = new Map(customers.map((c) => [c.id, c]))
      // F7-10: saldo en 0 fuera de la cartera viva y fila de total, ver `contractsExportRows`.
      const rows = contractsExportRows(allContracts, customerById)
      exportRowsToExcel(`contratos-${todayBogota()}.xlsx`, 'Contratos', rows)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Contratos"
        actions={
          // `flex-wrap`: son dos botones anchos («Registrar contrato existente»
          // y «+ Nuevo contrato») y en 360px no caben en una línea. El
          // `PageHeader` ya envuelve sus hijos, pero este contenedor anidado
          // los mantenía juntos y empujaba 14px fuera del viewport.
          <div className="flex flex-wrap items-center gap-2">
            <Can permission="contracts.import">
              <Button variant="outline" onClick={() => navigate({ to: '/contratos/importar' })}>
                Registrar contrato existente
              </Button>
            </Can>
            <Can permission="contracts.create">
              <Button onClick={() => navigate({ to: '/contratos/nuevo' })}>
                + Nuevo contrato
              </Button>
            </Can>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          ariaLabel="Buscar contratos"
          value={q}
          onChange={setQ}
          placeholder="Buscar por número, código o cliente…"
          className="w-full sm:max-w-sm sm:flex-1"
        />
        {/* «Listos para remate» sale de un endpoint sin orden elegible: ahí el
            selector no aparece en vez de prometer un orden que no aplica. */}
        {(!isReadyTab || isSearching) && (
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
            <label htmlFor="contracts-sort" className="shrink-0 text-sm text-muted-foreground">
              Ordenar por
            </label>
            <Select value={sort} onValueChange={(value) => setSort(value as ContractSort)}>
              <SelectTrigger id="contracts-sort" className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.sort} value={option.sort}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Las pestañas se ocultan al buscar porque el buscador cruza TODOS los
          estados: dejarlas visibles sugeriría que el resultado está acotado a
          la pestaña marcada, y no lo está. El botón de exportar, en cambio, se
          queda en pantalla siempre — desaparecía junto con las pestañas y
          parecía que la función se había ido (F21-16). Mientras se busca va
          deshabilitado y con el motivo al lado: lo que exporta es la pestaña
          de estado completa, y durante la búsqueda no hay pestaña. Exportar el
          resultado del buscador sería otra cosa —un tope de 20 filas, ver
          `useContractSearch`— y entregar un Excel recortado en silencio es
          peor que no entregarlo. */}
      <div className="flex flex-wrap items-center gap-2">
        {!isSearching &&
          statusTabs.map((tab) => (
            <FilterChip key={tab.value} active={status === tab.value} onClick={() => setStatus(tab.value)}>
              {tab.label}
            </FilterChip>
          ))}

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {isSearching && <span className="text-xs text-muted-foreground">Para exportar, limpia la búsqueda y elige un estado.</span>}
          {/* Exporta la pestaña de estado activa completa, no solo la
              página ya cargada — mismo criterio que Inventario. */}
          <Button variant="outline" size="sm" disabled={isExporting || isSearching} onClick={handleExport}>
            <Download className="size-4" />
            {isExporting ? 'Exportando…' : 'Exportar a Excel'}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={contracts}
        getRowId={(row) => row.id}
        isLoading={isSearching ? searchPending : isReadyTab ? readyPending : isPending}
        isError={isSearching ? searchError : isReadyTab ? readyError : isError}
        onRetry={() => (isSearching ? refetchSearch() : isReadyTab ? refetchReady() : refetch())}
        emptyTitle={isSearching ? 'No encontramos contratos con eso' : status ? 'No hay contratos con ese estado' : 'Aún no tienes contratos'}
        emptyDescription={status || isSearching ? undefined : 'Crea el primero para empezar a prestar sobre prendas.'}
        onRowClick={(row) => navigate({ to: '/contratos/$contractId', params: { contractId: row.id } })}
        hasNextPage={isSearching ? false : isReadyTab ? false : hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />
    </div>
  )
}
