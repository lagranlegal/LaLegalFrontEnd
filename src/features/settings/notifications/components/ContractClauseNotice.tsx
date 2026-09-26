import { Link } from '@tanstack/react-router'
import { FileCheck2, FileSignature, FileWarning } from 'lucide-react'
import { Callout, type CalloutTone } from '@/components/shared/Callout'
import { useActiveDocumentTemplate } from '@/features/settings/documentTemplates/api'
import { noticeConsentStatus, type NoticeConsentStatus } from '@/lib/documents/noticeConsentClause'

const DOCUMENTS_PATH = '/configuracion/documentos'

const linkClass = 'text-brand underline-offset-2 hover:underline'

/**
 * Nota junto al grupo «Avisos al cliente»: escribirle al cliente con base
 * legal «contrato» se sostiene en que el contrato firmado incluya la cláusula
 * de autorización de avisos (`lib/documents/noticeConsentClause.ts`).
 *
 * Dice si la plantilla ACTIVA de contrato la tiene, con el mismo query que usa
 * la impresión (`useActiveDocumentTemplate`, sin request extra si ya está en
 * caché). Sin plantilla propia se imprime el formato de siempre, que la trae.
 * Si no se puede saber —cargando, error, o un rol sin `contracts.view`— no
 * afirma nada (DESIGN_SYSTEM §4.8): queda la frase y el enlace.
 */
export function ContractClauseNotice() {
  const { data, isPending, isError } = useActiveDocumentTemplate('contract')
  const status: NoticeConsentStatus | null = isPending || isError || data === undefined ? null : noticeConsentStatus(data)

  const tone: CalloutTone = status === 'missing' ? 'warning' : status ? 'success' : 'info'
  const icon = status === 'missing' ? FileWarning : status ? FileCheck2 : FileSignature

  return (
    <Callout tone={tone} icon={icon}>
      <p>Para escribirle a tus clientes con respaldo, tu contrato debe incluir la cláusula de autorización de avisos.</p>
      {status === 'factory' && (
        <p>
          Hoy imprimes con el formato de fábrica, que ya la trae.{' '}
          <Link to={DOCUMENTS_PATH} className={linkClass}>
            Ver en Documentos
          </Link>
        </p>
      )}
      {status === 'included' && data && (
        <p>
          Tu plantilla activa «{data.name}» ya la incluye.{' '}
          <Link to={DOCUMENTS_PATH} className={linkClass}>
            Ver en Documentos
          </Link>
        </p>
      )}
      {status === 'missing' && data && (
        <p>
          Tu plantilla activa «{data.name}» todavía no la tiene.{' '}
          <Link to={DOCUMENTS_PATH} className={linkClass}>
            Agregarla en Documentos
          </Link>
        </p>
      )}
      {status === null && (
        <p>
          <Link to={DOCUMENTS_PATH} className={linkClass}>
            Revisar en Documentos
          </Link>
        </p>
      )}
    </Callout>
  )
}
