import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PageTabs, PageTabsContent } from '@/components/shared/PageTabs'

/**
 * Rediseño P2-a: el detalle del contrato se parte en Resumen · Abonos ·
 * Análisis · Documentos. La pestaña activa la decide quien llama (en el
 * contrato, el parámetro `seccion` de la URL).
 */
afterEach(cleanup)

const tabs = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'abonos', label: 'Abonos', count: '3' },
  { value: 'analisis', label: 'Análisis' },
] as const

describe('PageTabs', () => {
  it('muestra el contador, marca la activa y solo pinta su contenido', () => {
    render(
      <PageTabs label="Secciones" value="resumen" onValueChange={() => {}} tabs={[...tabs]}>
        <PageTabsContent value="resumen">contenido resumen</PageTabsContent>
        <PageTabsContent value="abonos">contenido abonos</PageTabsContent>
      </PageTabs>,
    )
    expect(screen.getByRole('tablist', { name: 'Secciones' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Abonos 3' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Resumen' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('contenido resumen')).toBeInTheDocument()
    expect(screen.queryByText('contenido abonos')).toBeNull()
  })

  it('al elegir otra pestaña avisa el valor (la URL la guarda quien llama)', () => {
    const onValueChange = vi.fn()
    render(
      <PageTabs label="Secciones" value="resumen" onValueChange={onValueChange} tabs={[...tabs]}>
        <PageTabsContent value="resumen">r</PageTabsContent>
      </PageTabs>,
    )
    // Radix activa la pestaña en mousedown (activación automática).
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Análisis' }), { button: 0 })
    expect(onValueChange).toHaveBeenCalledWith('analisis')
  })
})
