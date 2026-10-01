import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { usePermission } from '@/lib/permissions/usePermission'
import { isPermissionError } from '@/lib/api/isPermissionError'
import { hasEnoughToSearch, MIN_SEARCH_CHARS } from '@/lib/search'
import { useGlobalContractSearch, useGlobalCustomerSearch, useGlobalItemSearch } from '@/lib/globalSearch'
import { cn } from '@/lib/utils'

/** Espera tras la última tecla antes de consultar (el mismo orden que `SearchInput`). */
export const GLOBAL_SEARCH_DEBOUNCE_MS = 250

/** ¿El foco está escribiendo en algo? Ahí «/» es un carácter, no el atajo. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.matches('input, textarea, select')) return true
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

interface Hit {
  key: string
  primary: ReactNode
  secondary?: ReactNode
  go: () => void
}

interface Group {
  key: 'contracts' | 'customers' | 'items'
  label: string
  hits: Hit[]
  loading: boolean
  failed: boolean
}

/**
 * La búsqueda global de la topbar (rediseño P2-d): «Buscar cliente, contrato
 * o código», con «/» para enfocarla. Resultados agrupados (Contratos, Clientes,
 * Artículos), cada grupo **solo con el permiso de lectura de su módulo**: sin
 * él ni se pide ni se nombra en el texto de ayuda. Sin ninguno, no aparece.
 *
 * Accesible como combobox con listbox (ARIA 1.2): el foco se queda en el
 * campo, las flechas mueven la opción activa (`aria-activedescendant`), Enter
 * la abre y Escape cierra la lista (o la búsqueda a pantalla completa). Bajo
 * 768 px queda la lupa, que abre la búsqueda a pantalla completa.
 */
export function GlobalSearch() {
  const canContracts = usePermission('contracts.view')
  const canCustomers = usePermission('customers.view')
  const canItems = usePermission('inventory.view')
  const navigate = useNavigate()

  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [active, setActive] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()
  const listboxId = `${baseId}-listbox`

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(term.trim()), GLOBAL_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [term])

  // Otro término, otra lista: ninguna opción queda activa.
  const [prevDebounced, setPrevDebounced] = useState(debounced)
  if (debounced !== prevDebounced) {
    setPrevDebounced(debounced)
    setActive(-1)
  }

  // «/» enfoca la búsqueda desde cualquier parte, salvo cuando se está
  // escribiendo (ahí es un carácter). En el celular abre la pantalla completa.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      if (isTypingTarget(e.target)) return
      // Con un diálogo abierto, «/» es de ese diálogo: no se saca el foco de ahí.
      if (e.target instanceof Element && e.target.closest('[role="dialog"], [role="alertdialog"]')) return
      e.preventDefault()
      if (!window.matchMedia('(min-width: 768px)').matches) setFullscreen(true)
      setListOpen(true)
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // La pantalla completa monta el campo visible: el foco va ahí al abrirla.
  useEffect(() => {
    if (fullscreen) inputRef.current?.focus()
  }, [fullscreen])

  const contracts = useGlobalContractSearch(debounced, canContracts)
  const customers = useGlobalCustomerSearch(debounced, canCustomers)
  const items = useGlobalItemSearch(debounced, canItems)

  function close() {
    setTerm('')
    setDebounced('')
    setListOpen(false)
    setFullscreen(false)
    inputRef.current?.blur()
  }

  function go(action: () => void) {
    action()
    close()
  }

  const groups: Group[] = []
  if (canContracts) {
    groups.push({
      key: 'contracts',
      label: 'Contratos',
      loading: contracts.isLoading,
      failed: contracts.isError && !isPermissionError(contracts.error),
      hits: (contracts.data ?? []).map((c) => ({
        key: `contract-${c.id}`,
        primary: (
          <>
            Contrato <RecordNumber value={c.number} />
          </>
        ),
        secondary: `${c.customer_name} · ${c.customer_document}`,
        go: () => void navigate({ to: '/contratos/$contractId', params: { contractId: c.id } }),
      })),
    })
  }
  if (canCustomers) {
    groups.push({
      key: 'customers',
      label: 'Clientes',
      loading: customers.isLoading,
      failed: customers.isError && !isPermissionError(customers.error),
      hits: (customers.data ?? []).map((c) => ({
        key: `customer-${c.id}`,
        primary: c.full_name,
        secondary: <span className="tnum">{`${c.doc_type.toUpperCase()} ${c.doc_number}`}</span>,
        go: () => void navigate({ to: '/clientes/$customerId', params: { customerId: c.id } }),
      })),
    })
  }
  if (canItems) {
    groups.push({
      key: 'items',
      label: 'Artículos',
      loading: items.isLoading,
      failed: items.isError && !isPermissionError(items.error),
      hits: (items.data ?? []).map((item) => ({
        key: `item-${item.id}`,
        primary: item.name,
        secondary: item.code ? <span className="font-mono">{item.code}</span> : 'Sin código',
        // Inventario no tiene página por artículo: se abre la pestaña de
        // artículos ya filtrada por su código (o su nombre, si no tiene).
        go: () => void navigate({ to: '/inventario', search: { tab: 'items', q: item.code ?? item.name } }),
      })),
    })
  }

  // Sin ningún permiso de búsqueda queda el espacio que empuja tema y avatar a la derecha.
  if (groups.length === 0) return <div className="flex-1" />

  const flat = groups.flatMap((g) => g.hits)
  const typing = term.trim() !== debounced
  const searching = typing || groups.some((g) => g.loading)
  const hasTerm = term.trim().length > 0
  const panelOpen = (listOpen || fullscreen) && hasTerm
  const optionId = (index: number) => `${baseId}-option-${index}`
  const activeIndex = active < flat.length ? active : -1

  // Lo que se puede buscar, dicho con las palabras del permiso que hay.
  const nouns = [canCustomers && 'cliente', canContracts && 'contrato', canItems && 'código'].filter(Boolean) as string[]
  const placeholder = `Buscar ${nouns.length > 1 ? `${nouns.slice(0, -1).join(', ')} o ${nouns.at(-1)}` : nouns[0]}`

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setListOpen(true)
      if (flat.length === 0) return
      const next = e.key === 'ArrowDown' ? (activeIndex + 1) % flat.length : activeIndex <= 0 ? flat.length - 1 : activeIndex - 1
      setActive(next)
      document.getElementById(optionId(next))?.scrollIntoView?.({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      // Un buscador no envía nada: Enter abre la opción activa (o la primera).
      e.preventDefault()
      if (typing || flat.length === 0) return
      go(flat[activeIndex >= 0 ? activeIndex : 0]!.go)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (panelOpen && !fullscreen) setListOpen(false)
      else close()
    }
  }

  let offset = 0

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end md:justify-start">
      <div
        role={fullscreen ? 'dialog' : undefined}
        aria-modal={fullscreen ? true : undefined}
        aria-label={fullscreen ? 'Buscar' : undefined}
        className={cn(
          'md:relative md:block md:w-full md:max-w-sm',
          fullscreen ? 'fixed inset-0 z-50 flex flex-col gap-3 bg-card p-3 md:static md:z-auto md:gap-0 md:bg-transparent md:p-0' : 'hidden',
        )}
        onBlur={(e) => {
          if (!fullscreen && !e.currentTarget.contains(e.relatedTarget as Node | null)) setListOpen(false)
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-label="Buscar en toda la app"
              aria-expanded={panelOpen && flat.length > 0}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={panelOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
              aria-keyshortcuts="/"
              autoComplete="off"
              spellCheck={false}
              value={term}
              placeholder={placeholder}
              onChange={(e) => {
                setTerm(e.target.value)
                setListOpen(true)
              }}
              onFocus={() => setListOpen(true)}
              onKeyDown={onKeyDown}
              className="peer min-h-11 w-full rounded-input border border-border-strong bg-background py-2 pr-9 pl-9 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-ring md:min-h-10 md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
            />
            {/* La pista del atajo, solo con el campo vacío y sin foco (como la maqueta). */}
            {!hasTerm && (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-sm border border-border bg-card px-1.5 font-mono text-xs text-muted-foreground peer-focus:hidden md:block"
              >
                /
              </kbd>
            )}
          </div>
          {fullscreen && (
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Cerrar búsqueda" onClick={close}>
              <X className="size-5" />
            </Button>
          )}
        </div>

        {panelOpen && (
          <div
            className={cn(
              'min-h-0 overflow-y-auto text-sm',
              'md:absolute md:top-full md:right-0 md:left-0 md:z-50 md:mt-1.5 md:max-h-96 md:min-w-80 md:rounded-card md:border md:border-border md:bg-popover md:p-1.5 md:shadow-modal',
              fullscreen && 'flex-1',
            )}
          >
            <div id={listboxId} role="listbox" aria-label="Resultados de la búsqueda">
              {groups.map((group) => {
                if (group.hits.length === 0) return null
                const start = offset
                offset += group.hits.length
                const headingId = `${baseId}-${group.key}`
                return (
                  <div key={group.key} role="group" aria-labelledby={headingId} className="py-1">
                    <div id={headingId} role="presentation" className="px-2.5 pt-1.5 pb-1 text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </div>
                    {group.hits.map((hit, i) => {
                      const index = start + i
                      return (
                        <div
                          key={hit.key}
                          id={optionId(index)}
                          role="option"
                          aria-selected={index === activeIndex}
                          // `mousedown` no le quita el foco al campo: la lista sigue abierta hasta el clic.
                          onMouseDown={(e) => e.preventDefault()}
                          onMouseMove={() => index !== activeIndex && setActive(index)}
                          onClick={() => go(hit.go)}
                          className={cn(
                            'flex min-h-11 cursor-pointer flex-col justify-center rounded-input px-2.5 py-1.5',
                            index === activeIndex && 'bg-muted',
                          )}
                        >
                          <span className="truncate font-medium text-foreground">{hit.primary}</span>
                          {hit.secondary && <span className="truncate text-xs text-muted-foreground">{hit.secondary}</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            <div role="status" className="px-2.5 empty:hidden">
              {searching ? (
                <p className="py-2 text-muted-foreground">Buscando…</p>
              ) : flat.length === 0 ? (
                <p className="py-2 text-muted-foreground">
                  Sin resultados para «{term.trim()}».
                  {canCustomers && !hasEnoughToSearch(term) && ` Para buscar clientes, escribe al menos ${MIN_SEARCH_CHARS} letras.`}
                </p>
              ) : null}
              {!searching &&
                groups
                  .filter((g) => g.failed)
                  .map((g) => (
                    <p key={g.key} className="py-2 text-muted-foreground">
                      No se pudo buscar en {g.label}.
                    </p>
                  ))}
            </div>
          </div>
        )}
      </div>

      <Button variant="ghost" size="icon" className={cn('md:hidden', fullscreen && 'hidden')} aria-label="Buscar" onClick={() => setFullscreen(true)}>
        <Search className="size-5" />
      </Button>
    </div>
  )
}
