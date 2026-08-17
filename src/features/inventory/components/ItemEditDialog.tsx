import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ImageOff } from 'lucide-react'
import { AppDialog } from '@/components/shared/AppDialog'
import { MoneyInput } from '@/components/shared/MoneyInput'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { useUpdateItem, usePublishItem } from '@/features/inventory/api'
import type { Item } from '@/lib/inventory/items'

const itemSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  sale_price: z.string().optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

const inputClass = 'mt-1 w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary'

/**
 * Editar borrador + publicar (CLAUDE.md paso 7: "publicar (precio + ≥1
 * foto, muestra el código emitido)"). **"Publicar" queda deshabilitado
 * hasta que exista Storage** (`docs/STORAGE_PENDIENTE.md`) — `photos` de un
 * artículo siempre llega vacío porque no hay forma de subir una todavía; el
 * botón y la regla de negocio (precio + ≥1 foto) SÍ están construidos y
 * listos para funcionar en cuanto `PhotoUploader` reemplace el aviso de
 * abajo, sin tocar el resto de este componente.
 */
export function ItemEditDialog({ open, onOpenChange, item }: { open: boolean; onOpenChange: (open: boolean) => void; item: Item }) {
  const [formError, setFormError] = useState<string | null>(null)
  const updateItem = useUpdateItem()
  const publishItem = usePublishItem()
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: item.name, description: item.description ?? '', sale_price: item.sale_price ?? '0.00' },
  })
  const salePrice = watch('sale_price')

  async function onSubmit(values: ItemFormValues) {
    setFormError(null)
    try {
      await updateItem.mutateAsync({ itemId: item.id, body: { name: values.name, description: values.description || null, sale_price: values.sale_price || null } })
      toast.success('Artículo actualizado')
      onOpenChange(false)
    } catch {
      setFormError('No se pudo actualizar el artículo. Intenta de nuevo.')
    }
  }

  const hasPhotos = item.photos.length > 0
  const hasPrice = !!salePrice && Number(salePrice) > 0
  const canPublish = item.status === 'draft' && hasPhotos && hasPrice

  async function handlePublish() {
    if (!canPublish || !salePrice) return
    try {
      const published = await publishItem.mutateAsync({ itemId: item.id, body: { sale_price: salePrice } })
      toast.success(`Artículo publicado — código ${published.code}`)
      onOpenChange(false)
    } catch {
      toast.error('No se pudo publicar el artículo. Intenta de nuevo.')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item.code ? `Artículo ${item.code}` : 'Editar artículo'}
      size="lg"
      footer={
        <div className="flex w-full flex-col gap-2">
          {item.status === 'draft' && (
            <Button type="button" className="w-full rounded-pill" disabled={!canPublish || publishItem.isPending} onClick={handlePublish}>
              {publishItem.isPending ? 'Publicando…' : 'Publicar'}
            </Button>
          )}
          <Button form="item-edit-form" type="submit" variant="outline" disabled={updateItem.isPending} className="w-full rounded-pill">
            {updateItem.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      }
    >
      <form id="item-edit-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
          {item.code && <span className="font-mono text-xs text-muted-foreground">{item.code}</span>}
        </div>

        <div>
          <label htmlFor="item-name" className="text-sm font-medium text-foreground">
            Nombre
          </label>
          <input id="item-name" className={inputClass} {...register('name')} />
          {errors.name && <p className="mt-1 text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="item-description" className="text-sm font-medium text-foreground">
            Descripción (opcional)
          </label>
          <textarea id="item-description" rows={2} className={inputClass} {...register('description')} />
        </div>

        <div>
          <label htmlFor="item-sale-price" className="text-sm font-medium text-foreground">
            Precio de venta
          </label>
          <Controller control={control} name="sale_price" render={({ field }) => <MoneyInput id="item-sale-price" className="mt-1" value={field.value ?? ''} onChange={field.onChange} />} />
        </div>

        {item.status === 'draft' && (
          <div>
            <p className="text-sm font-medium text-foreground">Fotos</p>
            <div className="mt-1 flex flex-col items-center gap-2 rounded-input border border-dashed border-border bg-background px-3 py-6 text-center">
              <ImageOff className="size-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                La carga de fotos todavía no está disponible — falta configurar Storage (ver <code className="rounded bg-muted px-1">docs/STORAGE_PENDIENTE.md</code>). No se puede
                publicar sin al menos una foto.
              </p>
            </div>
          </div>
        )}

        {formError && <p className="rounded-input bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
      </form>
    </AppDialog>
  )
}
