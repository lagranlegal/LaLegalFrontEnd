import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/shared/DataTable'
import { Can } from '@/components/shared/Can'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCategories, useSuppliersList, type Supplier } from '@/features/catalogs/api'
import { buildCategoryTree, type CategoryTreeNode, type Category } from '@/features/catalogs/tree'
import { CategoryTreeView } from '@/features/catalogs/components/CategoryTreeView'
import { CategoryFormDialog } from '@/features/catalogs/components/CategoryFormDialog'
import { SupplierFormDialog } from '@/features/catalogs/components/SupplierFormDialog'

const supplierColumns: ColumnDef<Supplier>[] = [
  { accessorKey: 'code_letter', header: 'Letra' },
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'phone', header: 'Teléfono' },
  { accessorKey: 'active', header: 'Activo', cell: (info) => (info.getValue<boolean>() ? 'Sí' : 'No') },
]

function CategoriesTab() {
  const { data: categories, isPending, isError, refetch } = useCategories()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined)
  const [newParentId, setNewParentId] = useState<string | undefined>(undefined)
  // Fuerza remount del form en CADA apertura — si no, un "+ Subcategoría"
  // después de otro hereda el draft anterior.
  const [dialogNonce, setDialogNonce] = useState(0)

  function openCreate(parentId?: string) {
    setEditingCategory(undefined)
    setNewParentId(parentId)
    setDialogNonce((n) => n + 1)
    setDialogOpen(true)
  }

  function openEdit(node: CategoryTreeNode) {
    setEditingCategory(node)
    setDialogNonce((n) => n + 1)
    setDialogOpen(true)
  }

  const tree = categories ? buildCategoryTree(categories) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Can permission="catalogs.manage">
          <Button className="rounded-pill" onClick={() => openCreate(undefined)}>
            + Categoría
          </Button>
        </Can>
      </div>

      <div className="rounded-card border border-border bg-card p-card shadow-card">
        {isPending && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-border" />
            ))}
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar el árbol de categorías.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        {!isPending && !isError && <CategoryTreeView tree={tree} onEdit={openEdit} onAddChild={openCreate} />}
      </div>

      <CategoryFormDialog key={dialogNonce} open={dialogOpen} onOpenChange={setDialogOpen} category={editingCategory} parentId={newParentId} />
    </div>
  )
}

function SuppliersTab() {
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } = useSuppliersList()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined)
  const [dialogNonce, setDialogNonce] = useState(0)

  const suppliers = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Can permission="catalogs.manage">
          <Button
            className="rounded-pill"
            onClick={() => {
              setEditingSupplier(undefined)
              setDialogNonce((n) => n + 1)
              setDialogOpen(true)
            }}
          >
            + Proveedor
          </Button>
        </Can>
      </div>

      <DataTable
        columns={supplierColumns}
        data={suppliers}
        getRowId={(row) => row.id}
        isLoading={isPending}
        isError={isError}
        onRetry={() => refetch()}
        emptyTitle="Aún no tienes proveedores"
        emptyDescription="Crea el primero para registrar ingresos de mercancía comprada."
        onRowClick={(row) => {
          setEditingSupplier(row)
          setDialogNonce((n) => n + 1)
          setDialogOpen(true)
        }}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      <SupplierFormDialog key={dialogNonce} open={dialogOpen} onOpenChange={setDialogOpen} supplier={editingSupplier} />
    </div>
  )
}

export function CatalogsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Catálogos" description="Árbol de categorías y proveedores." />

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
        </TabsList>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
