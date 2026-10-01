import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * tailwind-merge no conoce los tamaños de texto propios de `globals.css`
 * (`--text-md`, `--text-button-sm`…): sin decírselo, los toma por un COLOR de
 * texto y, junto a uno real (el del primario, el del texto), borraba uno de
 * los dos. Pasaba en el botón de bloque y en los montos rápidos del POS
 * (rediseño P2, medido en Chrome).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["md", "button-sm", "button-lg", "headline", "hero", "closing", "section", "subsection"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
