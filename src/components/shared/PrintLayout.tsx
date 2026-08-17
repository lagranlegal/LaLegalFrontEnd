import type { ReactNode } from 'react'
import { useMe } from '@/lib/auth/me'
import { formatDate, todayBogota } from '@/lib/dates'

/**
 * Layout imprimible mientras el backend no genera PDFs (docs/DESIGN_SYSTEM.md
 * §3, §1): hoja carta, encabezado con el nombre de la empresa, tipografía
 * serif legible. Oculto en pantalla (`hidden print:block`) — vive siempre en
 * el DOM junto al contenido normal de la página, y aparece SOLO cuando el
 * usuario imprime (`window.print()` desde un botón `print:hidden`). El shell
 * de la app (sidebar/topbar/`CashSessionBanner`) se oculta con la misma
 * convención `print:hidden` directamente en `AppShell`.
 */
export function PrintLayout({ title, children }: { title: string; children: ReactNode }) {
  const { data: me } = useMe()

  return (
    <div className="hidden print:mx-auto print:block print:w-204 print:bg-white print:p-8 print:font-serif print:text-black">
      <header className="mb-6 flex items-center justify-between border-b border-black/20 pb-4">
        <div>
          <p className="text-lg font-semibold">{me?.company.name}</p>
          <p className="text-sm text-black/60">{title}</p>
        </div>
        <p className="text-sm text-black/60">{formatDate(todayBogota())}</p>
      </header>
      {children}
    </div>
  )
}
