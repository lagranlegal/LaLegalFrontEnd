import { Suspense, useState } from 'react'
import { toast } from 'sonner'
import { BackLink } from '@/components/shared/BackLink'
import { PageHeader } from '@/components/shared/PageHeader'
import { PrintLayout } from '@/components/shared/PrintLayout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useMe } from '@/lib/auth/me'
import { LazyTemplateEditor, LazyTemplateRenderer } from '@/components/shared/documentTemplate/lazy'
import { buildSampleContractContext, buildSampleSettlementContext, type DocumentType } from '@/lib/documents/mergeFields'
import { LAYOUT_LABELS, LAYOUT_OPTIONS, type DocumentLayout } from '@/lib/documents/layouts'
import { STARTING_TEMPLATES } from '@/lib/documents/startingTemplates'
import type { PrintableContractItem } from '@/lib/documents/nodes/ItemsTableBlockNode'
import {
  useActivateDocumentTemplate,
  useCreateDocumentTemplate,
  useDeleteDocumentTemplate,
  useDocumentTemplates,
  useUpdateDocumentTemplate,
  type DocumentTemplate,
} from '@/features/settings/documentTemplates/api'
import type { JSONContent } from '@tiptap/core'

const DOCUMENT_TYPE_TABS: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Contrato' },
  { value: 'settlement', label: 'Paz y salvo' },
]

const SAMPLE_ITEMS: PrintableContractItem[] = [
  { id: '1', description: 'Cadena de oro 10g', categoryName: 'Oro', weight_grams: '10', serial_imei: null, item_appraisal: '1200000.00' },
  { id: '2', description: 'Anillo de oro', categoryName: 'Oro', weight_grams: '4', serial_imei: null, item_appraisal: '450000.00' },
]

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

function emptyDoc(): JSONContent {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/**
 * Recibe `key={selectedId}` del padre — así React desmonta y vuelve a
 * montar este panel entero cuando cambia la selección, y el estado local
 * (`draftName`/`draftBody`) nace ya inicializado en el valor correcto sin
 * necesitar un `useEffect` para "resetearlo" (antipatrón: dispara un
 * render en cascada — la recomendación de React es esta, dejar que el
 * remount haga el reset).
 */
function TemplateDraftPanel({
  documentType,
  template,
  onSaved,
}: {
  documentType: DocumentType
  template: DocumentTemplate | undefined
  onSaved: (id: string) => void
}) {
  const { data: me } = useMe()
  const [draftName, setDraftName] = useState(template?.name ?? '')
  const [draftBody, setDraftBody] = useState<JSONContent>((template?.body as JSONContent | undefined) ?? emptyDoc())
  const [draftLayout, setDraftLayout] = useState<DocumentLayout>(template?.layout ?? 'classic')

  const createTemplate = useCreateDocumentTemplate()
  const updateTemplate = useUpdateDocumentTemplate()
  const deleteTemplate = useDeleteDocumentTemplate()
  const activateTemplate = useActivateDocumentTemplate()

  async function handleSave() {
    if (!draftName.trim()) {
      toast.error('La plantilla necesita un nombre.')
      return
    }
    try {
      if (!template) {
        const created = await createTemplate.mutateAsync({
          document_type: documentType,
          name: draftName.trim(),
          body: draftBody,
          layout: draftLayout,
        })
        onSaved(created.id)
        toast.success('Plantilla creada.')
      } else {
        await updateTemplate.mutateAsync({
          templateId: template.id,
          body: { name: draftName.trim(), body: draftBody, layout: draftLayout },
        })
        toast.success('Plantilla guardada.')
      }
    } catch {
      toast.error('No se pudo guardar la plantilla. Intenta de nuevo.')
    }
  }

  async function handleActivate() {
    if (!template) return
    try {
      await activateTemplate.mutateAsync(template.id)
      toast.success('Plantilla activada — ya es la que se usa al imprimir.')
    } catch {
      toast.error('No se pudo activar la plantilla.')
    }
  }

  async function handleDelete() {
    if (!template) return
    try {
      await deleteTemplate.mutateAsync(template.id)
      onSaved('')
      toast.success('Plantilla eliminada.')
    } catch {
      toast.error('No se pudo eliminar — si es la activa, activa otra primero.')
    }
  }

  const sampleContext = documentType === 'contract' ? buildSampleContractContext(me?.company) : buildSampleSettlementContext(me?.company)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex-1">
          <label htmlFor="template-name" className="text-sm text-muted-foreground">
            Nombre de la plantilla
          </label>
          <input id="template-name" className={inputClass} value={draftName} onChange={(e) => setDraftName(e.target.value)} />
        </div>
        <div>
          <span className="block text-sm text-muted-foreground">Formato</span>
          <div className="mt-1 flex overflow-hidden rounded-input border border-border">
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDraftLayout(option)}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors',
                  draftLayout === option ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent',
                )}
              >
                {LAYOUT_LABELS[option]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!template && (
            <Button type="button" variant="outline" size="sm" onClick={() => setDraftBody(STARTING_TEMPLATES[documentType])}>
              Empezar desde la plantilla actual
            </Button>
          )}
          {template && !template.is_active && (
            <Button type="button" variant="outline" size="sm" onClick={handleActivate} disabled={activateTemplate.isPending}>
              Activar
            </Button>
          )}
          {template && !template.is_active && (
            <Button type="button" variant="outline" size="sm" onClick={handleDelete} disabled={deleteTemplate.isPending}>
              Eliminar
            </Button>
          )}
          <Button type="button" className="rounded-pill" onClick={handleSave} disabled={createTemplate.isPending || updateTemplate.isPending}>
            Guardar
          </Button>
        </div>
      </div>

      {!template && (
        <div className="rounded-input bg-warning-soft px-4 py-2 text-sm text-warning">
          Al guardar queda como borrador — no se usará al imprimir hasta que le des <strong>Activar</strong>.
        </div>
      )}
      {template && !template.is_active && (
        <div className="rounded-input bg-warning-soft px-4 py-2 text-sm text-warning">
          Esta plantilla no está activa — mientras tanto se sigue imprimiendo con el formato de siempre. Dale <strong>Activar</strong> arriba para que se use.
        </div>
      )}

      <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando editor…</p>}>
        <LazyTemplateEditor documentType={documentType} value={draftBody} onChange={setDraftBody} />
      </Suspense>

      <div>
        <h2 className="mb-2 text-sm font-medium text-foreground">Vista previa (con datos de ejemplo)</h2>
        <div className="overflow-hidden rounded-card border border-border">
          <PrintLayout
            title={documentType === 'contract' ? 'Contrato de empeño' : 'Paz y salvo'}
            layout={draftLayout}
            screenPreview
          >
            <Suspense fallback={<p className="text-sm text-muted-foreground">Cargando vista previa…</p>}>
              <LazyTemplateRenderer
                body={draftBody}
                mergeFieldContext={sampleContext}
                items={documentType === 'contract' ? SAMPLE_ITEMS : undefined}
                companySignatureUrl={me?.company.signature_url ?? null}
                companyLegalName={me?.company.legal_name ?? null}
                layout={draftLayout}
              />
            </Suspense>
          </PrintLayout>
        </div>
      </div>
    </div>
  )
}

export function DocumentTemplatesPage() {
  const [documentType, setDocumentType] = useState<DocumentType>('contract')
  const { data: templates, isPending, isError, refetch } = useDocumentTemplates(documentType)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null)

  const selected: DocumentTemplate | undefined = templates?.find((t) => t.id === selectedId)

  function switchDocumentType(type: DocumentType) {
    setDocumentType(type)
    setSelectedId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/configuracion" label="Configuración" />
      <PageHeader
        title="Documentos"
        description="Edita el texto de cada documento — los campos dinámicos (cliente, contrato, etc.) se rellenan solos al imprimir."
      />

      <div className="flex flex-wrap gap-2">
        {DOCUMENT_TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => switchDocumentType(tab.value)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
              documentType === tab.value ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-accent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedId('new')}>
            + Nueva plantilla
          </Button>
          {isPending && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {isError && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-danger">No se pudieron cargar las plantillas.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          )}
          {templates?.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-input border px-3 py-2 text-left text-sm',
                selectedId === t.id ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-accent',
              )}
            >
              <span className="font-medium text-foreground">{t.name}</span>
              {t.is_active && <span className="text-xs font-medium text-success">Activa</span>}
            </button>
          ))}
          {!isPending && !isError && templates?.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay plantillas — se sigue imprimiendo con el formato de siempre.</p>
          )}
        </div>

        <div>
          {(selectedId === 'new' || selected) && (
            <TemplateDraftPanel
              key={selectedId}
              documentType={documentType}
              template={selected}
              onSaved={(id) => setSelectedId(id || null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
