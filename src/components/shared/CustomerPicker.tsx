import { useState } from 'react'
import { SearchInput } from '@/components/shared/SearchInput'
import { useCustomerSearch, type Customer } from '@/lib/customers/search'

/**
 * Buscar-y-elegir cliente — contratos (obligatorio) y ventas (opcional,
 * "Consumidor final" si `value` queda en `null`) lo comparten (CLAUDE.md
 * regla 3). Sin componente `Combobox` genérico todavía (no lo pidió ninguna
 * otra pantalla) — dropdown simple sobre `SearchInput` + `useCustomerSearch`
 * (8 resultados, no es un listado paginado).
 */
export function CustomerPicker({ value, onChange, placeholder = 'Buscar cliente por nombre o documento…' }: { value: Customer | null; onChange: (customer: Customer | null) => void; placeholder?: string }) {
  const [q, setQ] = useState('')
  const { data, isFetching } = useCustomerSearch(q)

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-input border border-border bg-background px-3 py-2 text-sm">
        <div>
          <p className="font-medium text-foreground">{value.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {value.doc_type.toUpperCase()} {value.doc_number}
          </p>
        </div>
        <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => onChange(null)}>
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <SearchInput value={q} onChange={setQ} placeholder={placeholder} />
      {q.trim() && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-input border border-border bg-card shadow-card">
          {isFetching && <p className="px-3 py-2 text-sm text-muted-foreground">Buscando…</p>}
          {!isFetching && data?.items.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</p>}
          {!isFetching &&
            data?.items.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onChange(customer)
                  setQ('')
                }}
              >
                <span className="font-medium text-foreground">{customer.full_name}</span>
                <span className="text-xs text-muted-foreground">
                  {customer.doc_type.toUpperCase()} {customer.doc_number}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
