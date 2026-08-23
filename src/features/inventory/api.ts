import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { useCursorInfiniteQuery } from '@/lib/api/pagination'
import { useMoneyMutation } from '@/lib/api/useMoneyMutation'
import type { components } from '@/types/api'

export type Entry = components['schemas']['EntryOut']
export type EntryCreateIn = components['schemas']['EntryCreateIn']
export type EntryLineIn = components['schemas']['EntryLineIn']
export type Exit = components['schemas']['ExitOut']
export type ExitCreateIn = components['schemas']['ExitCreateIn']
export type ItemUpdateIn = components['schemas']['ItemUpdateIn']
export type ItemPublishIn = components['schemas']['ItemPublishIn']

// ---- Ingresos ----

export interface EntryFilters {
  supplier_id?: string
  origin_type?: string
  /** `pending` = compras por pagar. Es el filtro que más falta hacía. */
  payment_status?: string
  from_date?: string
  to_date?: string
  /** Número del ingreso o factura del proveedor. */
  q?: string
}

export function useEntriesList(filters: EntryFilters = {}) {
  const query = {
    supplier_id: filters.supplier_id || undefined,
    origin_type: filters.origin_type || undefined,
    payment_status: filters.payment_status || undefined,
    from_date: filters.from_date || undefined,
    to_date: filters.to_date || undefined,
    q: filters.q?.trim() || undefined,
  }
  return useCursorInfiniteQuery(['inventory', 'entries', query] as const, (cursor) =>
    unwrap(api.GET('/api/v1/inventory/entries', { params: { query: { ...query, cursor } } })),
  )
}

export function useEntry(entryId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'entries', entryId] as const,
    queryFn: () => unwrap(api.GET('/api/v1/inventory/entries/{entry_id}', { params: { path: { entry_id: entryId! } } })),
    enabled: !!entryId,
  })
}

/**
 * SÍ mueve dinero (corregido): un ingreso de compra entrega plata al
 * proveedor y desde la migración 00014 del backend genera su movimiento de
 * caja (`concept: 'purchase'`, `direction: 'out'`). Antes se asumía lo
 * contrario — "no mueve dinero: crea artículos en borrador" — y por eso el
 * cierre de caja descuadraba por el monto exacto de la mercancía comprada.
 *
 * Va por `useMoneyMutation` (CLAUDE.md regla 8): un reintento de red reusa la
 * misma key y el backend devuelve el MISMO ingreso en vez de duplicar stock y
 * volver a sacar la plata de la caja.
 */
export function useCreateEntry() {
  return useMoneyMutation<Entry, EntryCreateIn>({
    mutationFn: (body, idempotencyKey) =>
      unwrap(api.POST('/api/v1/inventory/entries', { body, headers: { 'Idempotency-Key': idempotencyKey } })),
    // La caja cambia: el egreso de la compra entra al desglose del cierre.
    invalidateKeys: [['inventory'], ['dashboard'], ['cashbox']],
  })
}

// ---- Egresos ----

export interface ExitFilters {
  exit_type?: string
  from_date?: string
  to_date?: string
}

export function useExitsList(filters: ExitFilters = {}) {
  const query = {
    exit_type: filters.exit_type || undefined,
    from_date: filters.from_date || undefined,
    to_date: filters.to_date || undefined,
  }
  return useCursorInfiniteQuery(['inventory', 'exits', query] as const, (cursor) =>
    unwrap(api.GET('/api/v1/inventory/exits', { params: { query: { ...query, cursor } } })),
  )
}

export function useCreateExit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ExitCreateIn) => unwrap(api.POST('/api/v1/inventory/exits', { body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

// ---- Artículos ----

export interface ItemFilters {
  status?: string
  /** Código (prefijo, sin distinguir mayúsculas) o nombre (full-text español). */
  q?: string
  cat1_id?: string
  cat2_id?: string
  cat3_id?: string
  supplier_id?: string
  origin?: string
}

export function useItemsList(filters: ItemFilters = {}) {
  // Los filtros van en la queryKey: cada combinación es su propia lista
  // paginada en cache, y cambiar un filtro arranca la paginación desde cero
  // en vez de mezclar páginas de dos búsquedas distintas.
  const query = {
    status: filters.status || undefined,
    q: filters.q?.trim() || undefined,
    cat1_id: filters.cat1_id || undefined,
    cat2_id: filters.cat2_id || undefined,
    cat3_id: filters.cat3_id || undefined,
    supplier_id: filters.supplier_id || undefined,
    origin: filters.origin || undefined,
  }
  return useCursorInfiniteQuery(['inventory', 'items', 'list', query] as const, (cursor) =>
    unwrap(api.GET('/api/v1/inventory/items', { params: { query: { ...query, cursor } } })),
  )
}

export function useUpdateItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: ItemUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/inventory/items/{item_id}', { params: { path: { item_id: itemId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

/** Publicar exige precio + ≥1 foto (CLAUDE.md paso 7) — la foto queda bloqueada hasta que exista Storage (docs/STORAGE_PENDIENTE.md); el gate de "¿tiene fotos?" vive en el componente, no acá. */
export function usePublishItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId: string; body: ItemPublishIn }) =>
      unwrap(api.POST('/api/v1/inventory/items/{item_id}/publish', { params: { path: { item_id: itemId } }, body })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export type EntryPayIn = components['schemas']['EntryPayIn']

/**
 * Salda una compra que quedó pendiente de pago.
 *
 * Es mutación de dinero: genera el egreso de caja. El egreso cae en la sesión
 * abierta de HOY, no en la fecha de la compra — una sesión cerrada es
 * inmutable, así que no hay forma (ni debería haberla) de afectar la caja de
 * un día ya cuadrado y firmado.
 */
export function usePayEntry() {
  return useMoneyMutation<Entry, { entryId: string; body: EntryPayIn }>({
    mutationFn: ({ entryId, body }, idempotencyKey) =>
      unwrap(
        api.POST('/api/v1/inventory/entries/{entry_id}/pay', {
          params: { path: { entry_id: entryId } },
          body,
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      ),
    invalidateKeys: [['inventory'], ['dashboard'], ['cashbox']],
  })
}

// ---- Productos (00021) ----

export type Product = components['schemas']['ProductOut']
export type ProductUpdateIn = components['schemas']['ProductUpdateIn']

export interface ProductFilters {
  q?: string
  include_unique?: boolean
  cat1_id?: string
  cat2_id?: string
  cat3_id?: string
  supplier_id?: string
  /** Solo lo que tiene unidades disponibles — "¿qué puedo vender hoy?". */
  in_stock?: boolean
}

/**
 * Inventario agrupado por producto. Cada fila trae el resumen de sus lotes,
 * así que el vendedor ve "cuántas tengo" sin sumar a mano — que es lo que
 * antes obligaba a hacer una lista con una fila por compra.
 */
export function useProductsList(filters: ProductFilters = {}) {
  const query = {
    q: filters.q?.trim() || undefined,
    include_unique: filters.include_unique || undefined,
    cat1_id: filters.cat1_id || undefined,
    cat2_id: filters.cat2_id || undefined,
    cat3_id: filters.cat3_id || undefined,
    supplier_id: filters.supplier_id || undefined,
    in_stock: filters.in_stock || undefined,
  }
  return useCursorInfiniteQuery(['inventory', 'products', query] as const, (cursor) =>
    unwrap(api.GET('/api/v1/inventory/products', { params: { query: { ...query, cursor } } })),
  )
}

/** Lotes de un producto, del más antiguo al más nuevo (orden FIFO). */
export function useProductLots(productId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'products', productId, 'lots'] as const,
    queryFn: () => unwrap(api.GET('/api/v1/inventory/products/{product_id}/lots', { params: { path: { product_id: productId! } } })),
    enabled: !!productId,
  })
}

/**
 * Cambiar el precio acá lo cambia para TODOS los lotes de una vez. Antes
 * había que editar cada lote por separado, con el riesgo de dejar uno barato
 * por olvido. Las ventas ya hechas no se ven afectadas.
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, body }: { productId: string; body: ProductUpdateIn }) =>
      unwrap(api.PATCH('/api/v1/inventory/products/{product_id}', { params: { path: { product_id: productId } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  })
}

export type ProductPurchase = components['schemas']['ProductPurchaseOut']

/**
 * Historial de compras de un producto: cuándo, a quién y a cuánto.
 *
 * Responde "¿cómo se movió el costo?" y "¿a quién conviene comprarle?". La
 * lista de productos ya insinuaba esto mostrando el rango de costos entre
 * lotes (`min_cost`/`max_cost`), pero no dejaba abrirlo: se veía que el costo
 * se movió y no por qué ni con quién.
 */
export function useProductPurchases(productId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'products', productId, 'purchases'] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/inventory/products/{product_id}/purchases', { params: { path: { product_id: productId! } } })),
    enabled: !!productId,
  })
}

export type Kardex = components['schemas']['KardexOut']
export type KardexLine = components['schemas']['KardexLineOut']

/**
 * Kardex: el libro auxiliar de inventario de un producto.
 *
 * Su historia completa en una sola línea de tiempo —cada ingreso, egreso,
 * venta y anulación— con saldo de unidades y de costo corriendo. Los datos
 * viven en tres tablas que solo se consultaban hacia adelante (dado un
 * documento, qué artículos trajo); "¿qué pasó con este producto?" es la
 * dirección contraria y no la respondía nadie.
 *
 * Sin fechas trae la historia entera, que es lo que se quiere por defecto: acá
 * se busca de dónde salió el saldo, no conciliar un mes.
 */
export function useProductKardex(productId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'products', productId, 'kardex'] as const,
    queryFn: () =>
      unwrap(api.GET('/api/v1/inventory/products/{product_id}/kardex', { params: { path: { product_id: productId! } } })),
    enabled: !!productId,
  })
}

export type Transformation = components['schemas']['TransformationOut']
export type TransformationCreateIn = components['schemas']['TransformationCreateIn']
export type TransformationSummary = components['schemas']['TransformationSummaryOut']

/**
 * Historial de transformaciones — de la más reciente a la más vieja.
 *
 * Fundir es la única operación de la app donde desaparece mercancía
 * identificada y aparece otra distinta. Una venta deja comprobante y un remate
 * deja contrato; fundir no dejaba nada consultable, así que "¿de dónde salió
 * este oro?" no tenía respuesta dentro de la aplicación aunque el dato
 * estuviera completo en la base.
 */
export function useTransformationsList(filters: { from_date?: string; to_date?: string } = {}) {
  const query = { from_date: filters.from_date || undefined, to_date: filters.to_date || undefined }
  return useCursorInfiniteQuery(['inventory', 'transformations', query] as const, (cursor) =>
    unwrap(api.GET('/api/v1/inventory/transformations', { params: { query: { ...query, cursor } } })),
  )
}

/** Detalle: qué entró, qué salió y cómo se repartió el costo. */
export function useTransformation(transformationId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'transformations', 'detail', transformationId] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/inventory/transformations/{transformation_id}', {
          params: { path: { transformation_id: transformationId! } },
        }),
      ),
    enabled: !!transformationId,
  })
}

/**
 * Fundir, despiezar o armar: entran N artículos, salen M y el costo viaja.
 *
 * Va por `useMoneyMutation` aunque no siempre mueva plata: mueve INVENTARIO de
 * forma irreversible, que para el negocio es igual de serio. Un reintento de
 * red que duplicara una fundición destruiría el doble de mercancía.
 *
 * Invalida `cashbox` porque el costo del proceso —si lo hubo— sale de la caja.
 */
export function useCreateTransformation() {
  return useMoneyMutation<Transformation, TransformationCreateIn>({
    mutationFn: (body, idempotencyKey) =>
      unwrap(api.POST('/api/v1/inventory/transformations', { body, headers: { 'Idempotency-Key': idempotencyKey } })),
    invalidateKeys: [['inventory'], ['dashboard'], ['cashbox']],
  })
}
