import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { DocumentType } from '@/lib/documents/mergeFields'
import type { components } from '@/types/api'

export type DocumentTemplate = components['schemas']['DocumentTemplateOut']
export type DocumentTemplateCreateIn = components['schemas']['DocumentTemplateCreateIn']
export type DocumentTemplateUpdateIn = components['schemas']['DocumentTemplateUpdateIn']

export function useDocumentTemplates(documentType: DocumentType) {
  return useQuery({
    queryKey: ['company', 'document-templates', 'list', documentType] as const,
    queryFn: () => unwrap(api.GET('/api/v1/company/document-templates', { params: { query: { document_type: documentType } } })),
  })
}

/**
 * La plantilla ACTIVA — pedida por `ContractPrintView`/`SettlementPrintView`
 * al imprimir de verdad. Permiso distinto del resto de este archivo
 * (`contracts.view`, no `company.configure` — ver `docs/API_GUIDE.md` §4
 * bis): cualquier asesor que imprime un contrato necesita poder leerla.
 * `ContractDetailPage` llama este mismo hook (mismo `queryKey`, sin request
 * duplicado) solo para leer `isLoading` y deshabilitar "Imprimir" mientras
 * tanto — ver el comentario en ese archivo.
 */
export function useActiveDocumentTemplate(documentType: DocumentType, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['company', 'document-templates', 'active', documentType] as const,
    queryFn: () => unwrap(api.GET('/api/v1/company/document-templates/active', { params: { query: { document_type: documentType } } })),
    enabled: options?.enabled ?? true,
  })
}

function invalidateTemplateQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['company', 'document-templates'] })
}

export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: DocumentTemplateCreateIn) => unwrap(api.POST('/api/v1/company/document-templates', { body })),
    onSuccess: () => invalidateTemplateQueries(queryClient),
  })
}

export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, body }: { templateId: string; body: DocumentTemplateUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/company/document-templates/{template_id}', { params: { path: { template_id: templateId } }, body })),
    onSuccess: () => invalidateTemplateQueries(queryClient),
  })
}

export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) =>
      unwrap(api.DELETE('/api/v1/company/document-templates/{template_id}', { params: { path: { template_id: templateId } } })),
    onSuccess: () => invalidateTemplateQueries(queryClient),
  })
}

export function useActivateDocumentTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) =>
      unwrap(api.POST('/api/v1/company/document-templates/{template_id}/activate', { params: { path: { template_id: templateId } } })),
    onSuccess: () => invalidateTemplateQueries(queryClient),
  })
}
