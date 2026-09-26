import { Link } from '@tanstack/react-router'
import { Money } from '@/components/shared/Money'
import { RecordNumber } from '@/components/shared/RecordNumber'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useContractChain, type Contract, type ContractChainLink } from '@/features/contracts/api'
import { chainNeighbors } from '@/features/contracts/chain'

const linkClass = 'font-medium text-brand underline-offset-4 hover:underline'

function ContractLink({ link, label }: { link: ContractChainLink; label?: string }) {
  return (
    <Link to="/contratos/$contractId" params={{ contractId: link.id }} className={linkClass}>
      {label ?? `Ver el contrato #${link.number}`}
    </Link>
  )
}

/**
 * La cadena de ampliaciones, vista desde el contrato que se está mirando
 * (docs/RECARGOS.md §6).
 *
 * **Por qué existe.** Hasta el 25/09/2026 un contrato ampliado decía «fue
 * ampliado… la deuda vive en el contrato que lo sucede» y nada más: ni cuál,
 * ni cuándo, ni por cuánto, ni un enlace. `ContractOut` solo mira hacia atrás
 * (`parent_contract_id`), así que el viejo no sabía quién lo sucedía; ahora lo
 * dice `GET /contracts/{id}/chain`. Sin eso un `superseded` parece un contrato
 * abandonado, que es justo lo que §6 pedía evitar.
 *
 * **Con varias ampliaciones** no basta con nombrar al vecino: desde A, «pasó
 * a B» manda a otro contrato cerrado. Por eso el aviso dice también dónde vive
 * la deuda HOY, y debajo va la historia completa, recorrible.
 */
export function ContractChainPanel({ contract }: { contract: Contract }) {
  const enCadena = contract.status === 'superseded' || !!contract.parent_contract_id
  const { data: chain } = useContractChain(contract.id, enCadena)
  if (!enCadena) return null

  const { parent, successor, current } = chainNeighbors(chain, contract.id)
  const vigenteEsOtro = current && successor && current.id !== successor.id && current.id !== contract.id

  return (
    <div className="flex flex-col gap-3">
      {contract.status === 'superseded' && (
        <div className="rounded-input bg-muted px-4 py-3 text-sm text-muted-foreground">
          <p>
            Este contrato fue <span className="font-medium text-foreground">ampliado</span>
            {successor?.extended_on && <> el {formatDate(successor.extended_on)}</>}
            {successor?.extension_amount && (
              <>
                : se le entregaron <Money value={successor.extension_amount} className="font-medium text-foreground" /> más
              </>
            )}{' '}
            {successor ? (
              <>
                y la deuda pasó al contrato <RecordNumber value={successor.number} />{' '}
                <StatusBadge status={successor.status} />.
              </>
            ) : (
              <>y la deuda pasó al contrato que lo sucede.</>
            )}{' '}
            Dejó de ser la obligación vigente y se conserva con su firma.
          </p>
          {vigenteEsOtro && (
            <p className="mt-1">
              Ese contrato también se amplió: hoy la deuda vive en el <RecordNumber value={current.number} />.
            </p>
          )}
          {successor && (
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <ContractLink link={successor} label={`Ir al contrato #${successor.number}`} />
              {vigenteEsOtro && <ContractLink link={current} label={`Ir al vigente, #${current.number}`} />}
            </p>
          )}
        </div>
      )}

      {/* La cadena hacia atrás, con las DOS fechas. Hasta 00053 esta línea
          decía "ampliado el {start_date}" — correcto entonces, porque el
          sucesor nacía hoy. Ahora `start_date` es la fecha del contrato
          ORIGINAL, así que decirlo así sería mentir con semanas de diferencia.
          `extended_on` es cuándo se entregó la plata de verdad. */}
      {contract.parent_contract_id && (
        <div className="rounded-input bg-muted px-4 py-3 text-sm text-muted-foreground">
          {parent ? (
            <>
              Viene del contrato <RecordNumber value={parent.number} />
            </>
          ) : (
            <>Sucede a un contrato anterior</>
          )}
          {contract.extended_on && (
            <>
              , ampliado el {formatDate(contract.extended_on)} con{' '}
              <Money value={contract.extension_amount ?? '0'} className="font-medium text-foreground" /> más
            </>
          )}
          .{' '}
          {contract.extended_on && contract.extended_on !== contract.start_date && (
            <>
              Conserva la fecha del contrato original ({formatDate(contract.start_date)}), así que el interés se sigue
              cobrando el día de siempre — ahora sobre el capital ampliado.{' '}
            </>
          )}
          <Link to="/contratos/$contractId" params={{ contractId: contract.parent_contract_id }} className={linkClass}>
            {parent ? `Ver el contrato #${parent.number}` : 'Ver el contrato anterior'}
          </Link>
        </div>
      )}

      {chain && chain.length > 1 && (
        <div className="rounded-card border border-border bg-card p-card shadow-card">
          <h2 className="text-sm font-medium text-foreground">Historia de este préstamo</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {chain.map((link, i) => {
              const esEste = link.id === contract.id
              return (
                <li
                  key={link.id}
                  aria-current={esEste ? 'true' : undefined}
                  className={cn(
                    'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-input border px-3 py-2 text-sm',
                    esEste ? 'border-brand bg-muted' : 'border-border',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {esEste ? (
                      <RecordNumber value={link.number} />
                    ) : (
                      <Link to="/contratos/$contractId" params={{ contractId: link.id }} className={linkClass}>
                        <RecordNumber value={link.number} className="text-brand" />
                      </Link>
                    )}
                    <span className="text-muted-foreground">
                      {i === 0 || !link.extended_on ? (
                        <>
                          Original · {formatDate(link.start_date)} · <Money value={link.principal} />
                        </>
                      ) : (
                        <>
                          Ampliado el {formatDate(link.extended_on)} · +<Money value={link.extension_amount ?? '0'} />
                        </>
                      )}
                    </span>
                    {esEste && <span className="text-xs text-muted-foreground">(este)</span>}
                  </div>
                  <StatusBadge status={link.status} />
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}
