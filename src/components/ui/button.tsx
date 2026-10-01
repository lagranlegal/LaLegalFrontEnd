import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Rediseño P1 (DESIGN_SYSTEM §3): el botón es un RECTÁNGULO de radio 10
 * (`--radius-input`); la pastilla queda solo para estados y filtros, así un
 * botón no se confunde con un estado. 44 px de alto (objetivo táctil), 600 ·
 * 14, ícono de 18. Variantes de la propuesta:
 *
 * - `default`: el primario en oro, uno solo por pantalla.
 * - `outline` (y su alias `secondary`): superficie con `--border-strong`.
 * - `ghost`: sin fondo; «Cancelar», «Volver».
 * - `destructive`: contorno rojo. Anular, rematar, desactivar en la pantalla.
 * - `danger-solid`: relleno rojo, SOLO dentro de la confirmación de algo
 *   destructivo.
 *
 * Deshabilitado no es «el mismo botón a media opacidad»: va en beige con texto
 * atenuado, y quien lo deshabilita dice por qué al lado.
 */
const DISABLED = "disabled:border-border disabled:bg-muted disabled:text-muted-foreground"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-input border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-colors duration-(--duration-fast) outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        default: `bg-primary text-primary-foreground hover:bg-primary-hover ${DISABLED}`,
        outline: `border-border-strong bg-card text-foreground hover:bg-muted aria-expanded:bg-muted ${DISABLED}`,
        secondary: `border-border-strong bg-card text-foreground hover:bg-muted aria-expanded:bg-muted ${DISABLED}`,
        ghost: "bg-transparent text-foreground hover:bg-muted aria-expanded:bg-muted disabled:text-muted-foreground",
        destructive: `border-danger bg-card text-danger hover:bg-danger-soft ${DISABLED}`,
        "danger-solid": `bg-danger-solid text-on-danger-solid hover:bg-danger-solid/90 ${DISABLED}`,
        link: "text-brand underline-offset-4 hover:underline disabled:opacity-50",
      },
      size: {
        default: "h-11 gap-2 px-4.5 text-sm",
        xs: "h-7 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-3 text-button-sm [&_svg:not([class*='size-'])]:size-4",
        lg: "h-13 w-full gap-2 px-5 text-button-lg",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
