import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Gem } from 'lucide-react'
import { Money } from '@/components/shared/Money'
import { PhotoThumbnail } from '@/components/shared/PhotoThumbnail'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/dates'
import { formatPercent } from '@/lib/percent'
import type { Item } from '@/lib/inventory/items'
import type { Contract } from '@/features/contracts/api'

/** Tarjeta de la columna derecha del Resumen: título 600 · 15 y contenido. */
export function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid min-w-0 gap-3 rounded-card border border-border bg-card p-card">
      <h2 className="text-md font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-px">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tnum text-sm font-semibold text-foreground">{children}</dd>
    </div>
  )
}

/**
 * «Préstamo» (rediseño P2-a): lo pactado y lo que queda, en una grilla de dos.
 * La tasa en es-CO con la unidad dicha («5,00 % mensual», F9-21). Las fechas
 * de un contrato abierto viven en la línea de tiempo de la tarjeta de estado;
 * uno cerrado no la tiene, así que acá van el inicio y el fin.
 */
export function LoanCard({ contract }: { contract: Contract }) {
  const open = contract.status === 'active' || contract.status === 'in_arrears' || contract.status === 'in_extension'
  return (
    <SummaryCard title="Préstamo">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Capital prestado">
          <Money value={contract.principal} />
        </Field>
        <Field label="Saldo de capital">
          <Money value={contract.capital_balance} />
        </Field>
        <Field label="Tasa">{formatPercent(contract.interest_rate_pct)} mensual</Field>
        <Field label="Avalúo">{contract.appraisal_value ? <Money value={contract.appraisal_value} /> : '—'}</Field>
        {!open && (
          <>
            <Field label="Inicio">{formatDate(contract.start_date)}</Field>
            <Field label="Fin del plazo">{formatDate(contract.due_date)}</Field>
          </>
        )}
      </dl>
      {contract.ltv_warning && (
        <p className="rounded-input bg-warning-soft px-3 py-2 text-xs text-foreground">Este contrato supera el LTV máximo permitido para su categoría.</p>
      )}
    </SummaryCard>
  )
}

const WEIGHT = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 3 })

/**
 * Vínculo inverso prenda→artículo (`ContractItemOut.inventory_item_id`).
 * Sin ruta propia de detalle de artículo en el front: el link lleva a
 * `/inventario` y el código mostrado es lo que se busca ahí.
 */
function AuctionedItemLink({ inventoryItem }: { inventoryItem: Item | undefined }) {
  return (
    <Link to="/inventario" className="text-xs text-brand hover:underline">
      Convertido en {inventoryItem?.code ?? inventoryItem?.name ?? 'un artículo de inventario'}
    </Link>
  )
}

/** «Prenda(s)»: foto (o el ícono de la gema), descripción, peso o serial, avalúo y su estado. */
export function ItemsCard({ contract, auctionedItemsById }: { contract: Contract; auctionedItemsById?: Map<string, Item> }) {
  return (
    <SummaryCard title={contract.items.length === 1 ? 'Prenda' : `Prendas (${contract.items.length})`}>
      <ul className="grid gap-3">
        {contract.items.map((item) => (
          <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
            {item.photos.length > 0 ? (
              <PhotoThumbnail path={item.photos[0] as string} className="size-11 shrink-0" />
            ) : (
              <span aria-hidden className="grid size-11 place-items-center rounded-input border border-border bg-brand-50 text-brand">
                <Gem className="size-4.5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.description}</p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="tnum">
                  {[
                    item.weight_grams ? `${WEIGHT.format(Number(item.weight_grams))} g` : null,
                    item.serial_imei,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  {(item.weight_grams || item.serial_imei) && item.item_appraisal && ' · '}
                  {item.item_appraisal && (
                    <>
                      avalúo <Money value={item.item_appraisal} />
                    </>
                  )}
                </span>
                <StatusBadge status={item.status} />
              </p>
              {item.inventory_item_id && <AuctionedItemLink inventoryItem={auctionedItemsById?.get(item.inventory_item_id)} />}
            </div>
          </li>
        ))}
      </ul>
    </SummaryCard>
  )
}

/** Las notas del contrato, si tiene. */
export function NotesCard({ notes }: { notes: string }) {
  return (
    <SummaryCard title="Notas">
      <p className="text-sm whitespace-pre-line text-body">{notes}</p>
    </SummaryCard>
  )
}
